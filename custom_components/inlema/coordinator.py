"""Data coordinator for InLeMa."""

from __future__ import annotations

from datetime import timedelta
import logging
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers.update_coordinator import (
    DataUpdateCoordinator,
    UpdateFailed,
)
from homeassistant.util import dt as dt_util

from .api import InLeMaApi, InLeMaApiError

_LOGGER = logging.getLogger(__name__)

UPDATE_INTERVAL = timedelta(minutes=1)


class InLeMaDataCoordinator(
    DataUpdateCoordinator[dict[str, Any]]
):
    """Coordinate InLeMa data updates."""

    def __init__(
        self,
        hass: HomeAssistant,
        api: InLeMaApi,
    ) -> None:
        """Initialize coordinator."""

        super().__init__(
            hass,
            _LOGGER,
            name="InLeMa",
            update_interval=UPDATE_INTERVAL,
        )

        self.api = api

    async def _async_update_data(
        self,
    ) -> dict[str, Any]:
        """Fetch data from InLeMa."""

        try:
            next_meal = await self._get_next_meal()
            meals = await self._get_meals()
            shopping_lists = await self._get_shopping_lists()
            stock_items = await self._get_stock_items()

            return {
                "next_meal": next_meal,
                "meals": meals,
                "shopping_lists": shopping_lists,
                "stock_items": stock_items,
            }

        except InLeMaApiError as err:
            raise UpdateFailed(
                f"Error communicating with InLeMa: {err}"
            ) from err

    async def _get_stock_items(
        self,
    ) -> list[dict[str, Any]]:
        """Return stock items visible to the user."""

        items = await self.api.get(
            "stock_items",
            {
                "select": (
                    "id,"
                    "user_id,"
                    "name,"
                    "quantity,"
                    "unit,"
                    "household_id,"
                    "updated_at"
                ),
                "deleted_at": "is.null",
                "order": "name.asc",
            },
        )

        for item in items:
            item_name = item.get("name")

            if item_name:
                item["display_name"] = (
                    await self._resolve_food_name(
                        item_name
                    )
                )

        return items

    
    async def _get_next_meal(
        self,
    ) -> dict[str, Any] | None:
        """Return the next planned meal."""

        today = dt_util.now().date().isoformat()

        rows = await self.api.get(
            "meal_plans",
            {
                "select": (
                    "id,"
                    "date,"
                    "recipe_id,"
                    "servings,"
                    "notes,"
                    "occasion,"
                    "external_guest_count,"
                    "meal_scope,"
                    "approval_status,"
                    "household_id"
                ),
                "date": f"gte.{today}",
                "deleted_at": "is.null",
                "order": "date.asc",
                "limit": "1",
            },
        )

        if not rows:
            return None

        meal = rows[0]
        recipe_id = meal.get("recipe_id")

        if recipe_id:
            recipes = await self.api.get(
                "recipes",
                {
                    "select": "id,name,fotos",
                    "id": f"eq.{recipe_id}",
                    "deleted_at": "is.null",
                    "limit": "1",
                },
            )

            if recipes:
                recipe_name = recipes[0].get("name")

                if recipe_name:
                    recipe_name = await self._resolve_recipe_name(
                        recipe_name
                    )

                fotos = recipes[0].get("fotos") or []

                image_url = None

                if fotos:
                    first_photo = fotos[0]

                    if (
                        isinstance(first_photo, str)
                        and first_photo.startswith(
                            ("http://", "https://")
                        )
                    ):
                        image_url = first_photo

                meal["recipes"] = {
                    "name": recipe_name,
                    "image_url": image_url,
                }

        return meal

    async def _get_meals(
        self,
    ) -> list[dict[str, Any]]:
        """Return visible planned meals."""

        today = dt_util.now().date().isoformat()

        meals = await self.api.get(
            "meal_plans",
            {
                "select": (
                    "id,"
                    "date,"
                    "recipe_id,"
                    "servings,"
                    "notes,"
                    "occasion,"
                    "external_guest_count,"
                    "meal_scope,"
                    "approval_status,"
                    "household_id"
                ),
                "date": f"gte.{today}",
                "deleted_at": "is.null",
                "order": "date.asc",
            },
        )

        for meal in meals:
            recipe_id = meal.get("recipe_id")

            if not recipe_id:
                continue

            recipes = await self.api.get(
                "recipes",
                {
                    "select": "id,name",
                    "id": f"eq.{recipe_id}",
                    "deleted_at": "is.null",
                    "limit": "1",
                },
            )

            if not recipes:
                continue

            recipe_name = recipes[0].get("name")

            if recipe_name:
                recipe_name = await self._resolve_recipe_name(
                    recipe_name
                )

            meal["recipe_name"] = recipe_name

        return meals

    async def _resolve_recipe_name(
        self,
        recipe_name: str,
    ) -> str:
        """Resolve an InLeMa recipe translation key."""

        if not recipe_name.startswith("recipe_"):
            return recipe_name

        locale = self.hass.config.language or "de"

        rows = await self.api.get(
            "recipe_translations",
            {
                "select": "name",
                "translation_key": f"eq.{recipe_name}",
                "locale": f"eq.{locale}",
                "limit": "1",
            },
        )

        if rows:
            translated_name = rows[0].get("name")

            if translated_name:
                return translated_name

        # Use German as fallback if the selected HA language
        # has no translation.
        if locale != "de":
            rows = await self.api.get(
                "recipe_translations",
                {
                    "select": "name",
                    "translation_key": f"eq.{recipe_name}",
                    "locale": "eq.de",
                    "limit": "1",
                },
            )

            if rows:
                translated_name = rows[0].get("name")

                if translated_name:
                    return translated_name

        return recipe_name

    async def _resolve_food_name(
        self,
        food_name: str,
    ) -> str:
        """Resolve an InLeMa food translation key."""

        if not food_name.startswith("food"):
            return food_name

        locale = self.hass.config.language or "de"

        rows = await self.api.get(
            "food_translations",
            {
                "select": "name",
                "translation_key": f"eq.{food_name}",
                "locale": f"eq.{locale}",
                "limit": "1",
            },
        )

        if rows:
            translated_name = rows[0].get("name")

            if translated_name:
                return translated_name

        # Use German as fallback if the selected HA language
        # has no translation.
        if locale != "de":
            rows = await self.api.get(
                "food_translations",
                {
                    "select": "name",
                    "translation_key": f"eq.{food_name}",
                    "locale": "eq.de",
                    "limit": "1",
                },
            )

            if rows:
                translated_name = rows[0].get("name")

                if translated_name:
                    return translated_name

        return food_name

    async def _get_shopping_lists(
        self,
    ) -> list[dict[str, Any]]:
        """Return all shopping lists visible to the user."""

        shopping_lists = await self.api.get(
            "shopping_lists",
            {
                "select": (
                    "id,"
                    "owner_user_id,"
                    "name,"
                    "list_type,"
                    "household_id,"
                    "updated_at"
                ),
                "order": "name.asc",
            },
        )

        for shopping_list in shopping_lists:
            list_id = shopping_list.get("id")

            if not list_id:
                shopping_list["items"] = []
                continue

            items = await self.api.get(
                "shopping_items",
                {
                    "select": (
                        "id,"
                        "name,"
                        "quantity,"
                        "unit,"
                        "done,"
                        "notes,"
                        "food_key,"
                        "updated_at"
                    ),
                    "shopping_list_id": f"eq.{list_id}",
                    "deleted_at": "is.null",
                    "order": "created_at.asc",
                },
            )

            for item in items:
                item_name = item.get("name")

                if item_name:
                    item["display_name"] = (
                        await self._resolve_food_name(
                            item_name
                        )
                    )

            shopping_list["items"] = items

        return shopping_lists

    async def resolve_food_key(
        self,
        food_name: str,
    ) -> str | None:
        """Resolve a display name to an InLeMa food key."""

        search_name = food_name.strip()

        if not search_name:
            return None

        locale = self.hass.config.language or "de"

        rows = await self.api.get(
            "food_translations",
            {
                "select": "translation_key,name",
                "locale": f"eq.{locale}",
                "name": f"ilike.{search_name}",
                "limit": "1",
            },
        )

        if rows:
            return rows[0].get("translation_key")

        # German fallback.
        if locale != "de":
            rows = await self.api.get(
                "food_translations",
                {
                    "select": "translation_key,name",
                    "locale": "eq.de",
                    "name": f"ilike.{search_name}",
                    "limit": "1",
                },
            )

            if rows:
                return rows[0].get("translation_key")

        return None
    async def search_recipes(
        self,
        query: str,
        limit: int = 10,
    ) -> list[dict[str, Any]]:
        """Search visible InLeMa recipes."""

        search_query = query.strip()

        if not search_query:
            return []

        locale = self.hass.config.language or "de"

        results: list[dict[str, Any]] = []
        seen_ids: set[str] = set()

        # Search normal recipe names.
        rows = await self.api.get(
            "recipes",
            {
                "select": (
                    "id,"
                    "name,"
                    "beschreibung,"
                    "kategorie,"
                    "cuisine,"
                    "servings,"
                    "tags,"
                    "custom_tags,"
                    "is_seed,"
                    "household_id"
                ),
                "name": f"ilike.*{search_query}*",
                "deleted_at": "is.null",
                "limit": str(limit),
            },
        )

        for recipe in rows:
            recipe_id = str(recipe.get("id"))

            if recipe_id in seen_ids:
                continue

            recipe_name = recipe.get("name")

            if recipe_name:
                recipe["display_name"] = (
                    await self._resolve_recipe_name(
                        recipe_name
                    )
                )

            seen_ids.add(recipe_id)
            results.append(recipe)

        # Search translated seed recipe names.
        translations = await self.api.get(
            "recipe_translations",
            {
                "select": "translation_key,name",
                "locale": f"eq.{locale}",
                "name": f"ilike.*{search_query}*",
                "limit": str(limit),
            },
        )

        for translation in translations:
            translation_key = translation.get(
                "translation_key"
            )

            if not translation_key:
                continue

            recipes = await self.api.get(
                "recipes",
                {
                    "select": (
                        "id,"
                        "name,"
                        "beschreibung,"
                        "kategorie,"
                        "cuisine,"
                        "servings,"
                        "tags,"
                        "custom_tags,"
                        "is_seed,"
                        "household_id"
                    ),
                    "name": f"eq.{translation_key}",
                    "deleted_at": "is.null",
                    "limit": str(limit),
                },
            )

            for recipe in recipes:
                recipe_id = str(recipe.get("id"))

                if recipe_id in seen_ids:
                    continue

                recipe["display_name"] = (
                    translation.get("name")
                    or recipe.get("name")
                )

                seen_ids.add(recipe_id)
                results.append(recipe)

                if len(results) >= limit:
                    return results

        return results[:limit]