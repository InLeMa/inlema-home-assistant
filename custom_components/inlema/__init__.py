"""InLeMa integration."""

from __future__ import annotations
from pathlib import Path

from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import (
    HomeAssistant,
    ServiceCall,
    SupportsResponse,
)
from homeassistant.helpers import config_entry_oauth2_flow
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from .api import InLeMaApi
from .coordinator import InLeMaDataCoordinator

FRONTEND_URL = "/inlema/inlema-card.js"
FRONTEND_PATH = (
    Path(__file__).parent
    / "frontend"
    / "inlema-card.js"
)
LOGO_URL = "/inlema/logo.png"
LOGO_PATH = (
    Path(__file__).parent
    / "brand"
    / "logo.png"
)

PLATFORMS: list[Platform] = [
    Platform.SENSOR,
    Platform.CALENDAR,
    Platform.TODO,
]


async def async_setup(
    hass: HomeAssistant,
    config: dict,
) -> bool:
    """Set up InLeMa frontend resources."""

    await hass.http.async_register_static_paths(
        [
            StaticPathConfig(
                FRONTEND_URL,
                str(FRONTEND_PATH),
                False,
            ),
            StaticPathConfig(
                LOGO_URL,
                str(LOGO_PATH),
                False,
            ),
        ]
    )

    return True



async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
) -> bool:
    """Set up InLeMa."""

    implementation = (
        await config_entry_oauth2_flow
        .async_get_config_entry_implementation(
            hass,
            entry,
        )
    )

    oauth_session = config_entry_oauth2_flow.OAuth2Session(
        hass,
        entry,
        implementation,
    )

    session = async_get_clientsession(hass)

    api = InLeMaApi(
        session=session,
        oauth_session=oauth_session,
    )

    coordinator = InLeMaDataCoordinator(
        hass=hass,
        api=api,
    )

    await coordinator.async_config_entry_first_refresh()

    entry.runtime_data = coordinator

    entry.async_on_unload(
        entry.add_update_listener(
            async_reload_entry
        )
    )

    await hass.config_entries.async_forward_entry_setups(
        entry,
        PLATFORMS,
    )

    async def async_search_recipe(
        call: ServiceCall,
    ) -> dict:
        """Search InLeMa recipes."""

        query = call.data["query"]

        results = await coordinator.search_recipes(
            query
        )

        return {
            "query": query,
            "count": len(results),
            "recipes": [
                {
                    "id": recipe.get("id"),
                    "name": (
                        recipe.get("display_name")
                        or recipe.get("name")
                    ),
                    "servings": recipe.get("servings"),
                    "category": recipe.get("kategorie"),
                    "cuisine": recipe.get("cuisine"),
                    "is_seed": recipe.get("is_seed"),
                }
                for recipe in results
            ],
        }

    async def async_plan_meal(
        call: ServiceCall,
    ) -> dict:
        """Plan an InLeMa meal."""

        recipe_id = call.data["recipe_id"]
        meal_date = call.data["date"]
        servings = int(call.data["servings"])

        # Verify that the recipe is visible to this user.
        recipes = await coordinator.api.get(
            "recipes",
            {
                "select": "id,name",
                "id": f"eq.{recipe_id}",
                "deleted_at": "is.null",
                "limit": "1",
            },
        )

        if not recipes:
            return {
                "success": False,
                "error": "recipe_not_found",
            }

        recipe = recipes[0]

        recipe_name = await coordinator._resolve_recipe_name(
            recipe.get("name")
            or "Unbekanntes Rezept"
        )

        user = await coordinator.api.get_user()

        user_id = user.get("id")

        if not user_id:
            return {
                "success": False,
                "error": "user_id_not_found",
            }

        created = await coordinator.api.post(
            "meal_plans",
            {
                "user_id": user_id,
                "created_by_user_id": user_id,
                "recipe_id": recipe_id,
                "date": str(meal_date),
                "servings": servings,
                "meal_scope": "personal",
                "household_id": None,
                "approval_status": "approved",
            },
        )

        await coordinator.async_request_refresh()

        meal_plan_id = None

        if created:
            meal_plan_id = created[0].get("id")

        return {
            "success": True,
            "meal_plan_id": meal_plan_id,
            "recipe_id": recipe_id,
            "recipe_name": recipe_name,
            "date": str(meal_date),
            "servings": servings,
        }

    async def async_add_recipe_to_shopping_list(
        call: ServiceCall,
    ) -> dict:
        """Add recipe ingredients to an InLeMa shopping list."""

        recipe_id = call.data["recipe_id"]
        shopping_list_id = call.data["shopping_list_id"]
        requested_servings = int(call.data["servings"])

        recipes = await coordinator.api.get(
            "recipes",
            {
                "select": "id,name,servings,sections",
                "id": f"eq.{recipe_id}",
                "deleted_at": "is.null",
                "limit": "1",
            },
        )

        if not recipes:
            return {
                "success": False,
                "error": "recipe_not_found",
            }

        shopping_lists = await coordinator.api.get(
            "shopping_lists",
            {
                "select": "id,name",
                "id": f"eq.{shopping_list_id}",
                "limit": "1",
            },
        )

        if not shopping_lists:
            return {
                "success": False,
                "error": "shopping_list_not_found",
            }

        recipe = recipes[0]

        original_servings = recipe.get("servings") or 1

        factor = (
            requested_servings
            / original_servings
        )

        added_items: list[dict] = []

        for section in recipe.get("sections") or []:
            for ingredient in (
                section.get("ingredients") or []
            ):
                food_key = ingredient.get("name")
                quantity = ingredient.get("menge")
                unit = ingredient.get("unit")

                if not food_key:
                    continue

                scaled_quantity = quantity

                if quantity is not None:
                    scaled_quantity = quantity * factor

                    if float(scaled_quantity).is_integer():
                        scaled_quantity = int(
                            scaled_quantity
                        )

                created = await coordinator.api.post(
                    "shopping_items",
                    {
                        "shopping_list_id": shopping_list_id,
                        "name": food_key,
                        "food_key": food_key,
                        "quantity": scaled_quantity,
                        "unit": unit,
                        "done": False,
                    },
                )

                if created:
                    added_items.append(
                        {
                            "id": created[0].get("id"),
                            "food_key": food_key,
                            "quantity": scaled_quantity,
                            "unit": unit,
                        }
                    )

        await coordinator.async_request_refresh()

        recipe_name = await coordinator._resolve_recipe_name(
            recipe.get("name")
            or "Unbekanntes Rezept"
        )

        return {
            "success": True,
            "recipe_id": recipe_id,
            "recipe_name": recipe_name,
            "shopping_list_id": shopping_list_id,
            "shopping_list_name": (
                shopping_lists[0].get("name")
            ),
            "servings": requested_servings,
            "added_count": len(added_items),
            "items": added_items,
        }

    async def async_get_recipe(
        call: ServiceCall,
    ) -> dict:
        """Return a complete translated InLeMa recipe."""

        recipe_id = call.data["recipe_id"]

        recipes = await coordinator.api.get(
            "recipes",
            {
                "select": (
                    "id,name,beschreibung,zubereitung,"
                    "servings,sections,fotos,kategorie,"
                    "cuisine,difficulty,season,occasion,"
                    "diet_category,allergens"
                ),
                "id": f"eq.{recipe_id}",
                "deleted_at": "is.null",
                "limit": "1",
            },
        )

        if not recipes:
            return {
                "success": False,
                "error": "recipe_not_found",
            }

        recipe = recipes[0]
        sections = recipe.get("sections") or []

        # Collect recipe translation keys.
        recipe_keys: set[str] = set()

        for value in (
            recipe.get("name"),
            recipe.get("beschreibung"),
            recipe.get("zubereitung"),
        ):
            if (
                isinstance(value, str)
                and value.startswith("recipe_")
            ):
                recipe_keys.add(value)

        for section in sections:
            for value in (
                section.get("title"),
                section.get("preparation"),
            ):
                if (
                    isinstance(value, str)
                    and value.startswith("recipe_")
                ):
                    recipe_keys.add(value)

        # Load recipe translations.
        recipe_translations: dict[str, str] = {}

        if recipe_keys:
            translation_rows = await coordinator.api.get(
                "recipe_translations",
                {
                    "select": "translation_key,name",
                    "locale": "eq.de",
                    "translation_key": (
                        "in.("
                        + ",".join(recipe_keys)
                        + ")"
                    ),
                },
            )

            recipe_translations = {
                row["translation_key"]: row["name"]
                for row in translation_rows
                if row.get("translation_key")
                and row.get("name")
            }

        def resolve_recipe_text(
            value: object,
        ) -> object:
            """Resolve a recipe translation key."""

            if not isinstance(value, str):
                return value

            if not value.startswith("recipe_"):
                return value

            return recipe_translations.get(
                value,
                value,
            )

        # Collect food keys.
        food_keys: set[str] = set()

        for section in sections:
            for ingredient in (
                section.get("ingredients") or []
            ):
                food_key = ingredient.get("name")

                if (
                    isinstance(food_key, str)
                    and food_key
                ):
                    food_keys.add(food_key)

        # Load food translations.
        food_translations: dict[str, str] = {}

        if food_keys:
            food_rows = await coordinator.api.get(
                "food_translations",
                {
                    "select": "translation_key,name",
                    "locale": "eq.de",
                    "translation_key": (
                        "in.("
                        + ",".join(food_keys)
                        + ")"
                    ),
                },
            )

            food_translations = {
                row["translation_key"]: row["name"]
                for row in food_rows
                if row.get("translation_key")
                and row.get("name")
            }

        # Build translated cooking steps.
        translated_steps: list[dict] = []

        for section in sections:
            translated_ingredients: list[dict] = []

            for ingredient in (
                section.get("ingredients") or []
            ):
                food_key = ingredient.get("name")

                if not food_key:
                    continue

                translated_ingredients.append(
                    {
                        "food_key": food_key,
                        "name": food_translations.get(
                            food_key,
                            food_key,
                        ),
                        "quantity": ingredient.get("menge"),
                        "unit": ingredient.get("unit"),
                    }
                )

            translated_steps.append(
                {
                    "title": resolve_recipe_text(
                        section.get("title")
                    ),
                    "preparation": resolve_recipe_text(
                        section.get("preparation")
                    ),
                    "ingredients": translated_ingredients,
                }
            )

        # Recipe image.
        image_url = None
        fotos = recipe.get("fotos") or []

        if fotos:
            first_image = fotos[0]

            if (
                isinstance(first_image, str)
                and (
                    first_image.startswith("https://")
                    or first_image.startswith("http://")
                )
            ):
                image_url = first_image

        return {
            "success": True,
            "recipe": {
                "id": recipe.get("id"),
                "name": resolve_recipe_text(
                    recipe.get("name")
                ),
                "description": resolve_recipe_text(
                    recipe.get("beschreibung")
                ),
                "preparation_summary": resolve_recipe_text(
                    recipe.get("zubereitung")
                ),
                "servings": recipe.get("servings"),
                "image_url": image_url,
                "category": recipe.get("kategorie"),
                "cuisine": recipe.get("cuisine"),
                "difficulty": recipe.get("difficulty"),
                "season": recipe.get("season"),
                "occasion": recipe.get("occasion"),
                "diet_category": recipe.get("diet_category"),
                "allergens": recipe.get("allergens") or [],
                "step_count": len(translated_steps),
                "steps": translated_steps,
            },
        }

    
    hass.services.async_register(
        "inlema",
        "get_recipe",
        async_get_recipe,
        supports_response=SupportsResponse.ONLY,
    )
        
    hass.services.async_register(
        "inlema",
        "search_recipe",
        async_search_recipe,
        supports_response=SupportsResponse.ONLY,
    )

    hass.services.async_register(
        "inlema",
        "plan_meal",
        async_plan_meal,
        supports_response=SupportsResponse.ONLY,
    )

    hass.services.async_register(
        "inlema",
        "add_recipe_to_shopping_list",
        async_add_recipe_to_shopping_list,
        supports_response=SupportsResponse.ONLY,
    )

    return True

async def async_unload_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
) -> bool:
    """Unload InLeMa."""

    return await hass.config_entries.async_unload_platforms(
        entry,
        PLATFORMS,
    )


async def async_reload_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
) -> None:
    """Reload InLeMa after options change."""

    await hass.config_entries.async_reload(
        entry.entry_id
    )