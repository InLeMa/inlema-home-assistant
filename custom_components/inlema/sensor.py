"""Sensors for InLeMa."""

from __future__ import annotations

from datetime import timedelta

from homeassistant.components.sensor import SensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers import config_entry_oauth2_flow
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.util import dt as dt_util

from .const import SUPABASE_ANON_KEY, SUPABASE_URL


SCAN_INTERVAL = timedelta(minutes=5)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up InLeMa sensors."""

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

    async_add_entities(
        [
            InLeMaNextMealSensor(
                oauth_session=oauth_session,
                entry=entry,
            ),
        ],
        update_before_add=True,
    )


class InLeMaNextMealSensor(SensorEntity):
    """Sensor showing the next planned InLeMa meal."""

    _attr_has_entity_name = True
    _attr_name = "Nächste Mahlzeit"
    _attr_icon = "mdi:food"

    def __init__(
        self,
        oauth_session: config_entry_oauth2_flow.OAuth2Session,
        entry: ConfigEntry,
    ) -> None:
        """Initialize the sensor."""

        self._oauth_session = oauth_session
        self._entry = entry

        self._attr_unique_id = (
            f"{entry.entry_id}_next_meal"
        )

        self._meal_date: str | None = None
        self._servings: int | None = None
        self._recipe_id: str | None = None
        self._notes: str | None = None
        self._translation_key: str | None = None

    @property
    def extra_state_attributes(self) -> dict:
        """Return additional sensor attributes."""

        return {
            "date": self._meal_date,
            "servings": self._servings,
            "recipe_id": self._recipe_id,
            "notes": self._notes,
        }

    async def async_update(self) -> None:
        """Fetch the next meal from Supabase."""

        # ---------------------------------------------------------
        # 1. OAuth Token prüfen / gegebenenfalls aktualisieren
        # ---------------------------------------------------------

        await self._oauth_session.async_ensure_token_valid()

        token = self._oauth_session.token["access_token"]

        session = async_get_clientsession(self.hass)

        headers = {
            "Authorization": f"Bearer {token}",
            "apikey": SUPABASE_ANON_KEY,
        }

        # ---------------------------------------------------------
        # 2. Aktuelles Datum in Home-Assistant-Zeitzone
        # ---------------------------------------------------------

        today = dt_util.now().date().isoformat()

        # ---------------------------------------------------------
        # 3. Nächste Mahlzeit inkl. Rezept laden
        # ---------------------------------------------------------

        meal_params = {
            "select": (
                "id,"
                "date,"
                "recipe_id,"
                "servings,"
                "notes,"
                "recipes(name)"
            ),
            "date": f"gte.{today}",
            "deleted_at": "is.null",
            "order": "date.asc",
            "limit": "1",
        }

        meal_url = (
            f"{SUPABASE_URL}/rest/v1/meal_plans"
        )

        async with session.get(
            meal_url,
            headers=headers,
            params=meal_params,
        ) as response:
            response.raise_for_status()
            rows = await response.json()

        # ---------------------------------------------------------
        # 4. Kein zukünftiger Mahlzeitenplan vorhanden
        # ---------------------------------------------------------

        if not rows:
            self._attr_native_value = None
            self._meal_date = None
            self._servings = None
            self._recipe_id = None
            self._notes = None
            self._translation_key = None
            return

        meal = rows[0]

        self._meal_date = meal.get("date")
        self._servings = meal.get("servings")
        self._recipe_id = meal.get("recipe_id")
        self._notes = meal.get("notes")

        # ---------------------------------------------------------
        # 5. Rezeptdaten auslesen
        # ---------------------------------------------------------

        recipe = meal.get("recipes")

        if not isinstance(recipe, dict):
            self._attr_native_value = (
                "Unbekanntes Rezept"
            )
            return

        recipe_name = recipe.get("name")

        if not recipe_name:
            self._attr_native_value = (
                "Unbekanntes Rezept"
            )
            return

        # ---------------------------------------------------------
        # 6. Prüfen:
        # Ist der Name ein InLeMa-Übersetzungsschlüssel?
        #
        # Beispiele:
        # recipe_507_name
        # recipe_1301_name
        # ---------------------------------------------------------

        if (
            recipe_name.startswith("recipe_")
            and recipe_name.endswith("_name")
        ):
            self._translation_key = recipe_name

            translated_name = await self._get_translation(
                session=session,
                headers=headers,
                translation_key=recipe_name,
            )

            if translated_name:
                self._attr_native_value = translated_name
                return

        # ---------------------------------------------------------
        # 7. Eigenes Rezept oder keine Übersetzung vorhanden
        # ---------------------------------------------------------

        self._attr_native_value = recipe_name

    async def _get_translation(
        self,
        session,
        headers: dict,
        translation_key: str,
    ) -> str | None:
        """Get localized recipe name."""

        # Home Assistant liefert z. B.
        # de
        # en
        # ru
        # de-DE
        # en-US

        language = (
            self.hass.config.language
            or "de"
        ).lower()

        locale = (
            language
            .replace("_", "-")
            .split("-")[0]
        )

        # Momentan besitzt InLeMa diese drei
        # Rezeptübersetzungen.
        if locale not in {
            "de",
            "en",
            "ru",
        }:
            locale = "en"

        translation_url = (
            f"{SUPABASE_URL}/rest/v1/"
            "recipe_translations"
        )

        translation_params = {
            "select": "name",
            "translation_key":
                f"eq.{translation_key}",
            "locale": f"eq.{locale}",
            "limit": "1",
        }

        async with session.get(
            translation_url,
            headers=headers,
            params=translation_params,
        ) as response:
            response.raise_for_status()

            translations = await response.json()

        if translations:
            translated_name = (
                translations[0].get("name")
            )

            if translated_name:
                return translated_name

        # ---------------------------------------------------------
        # Falls z. B. eine Übersetzung fehlt:
        # Deutsch als Fallback versuchen.
        # ---------------------------------------------------------

        if locale != "de":
            fallback_params = {
                "select": "name",
                "translation_key":
                    f"eq.{translation_key}",
                "locale": "eq.de",
                "limit": "1",
            }

            async with session.get(
                translation_url,
                headers=headers,
                params=fallback_params,
            ) as response:
                response.raise_for_status()

                fallback_rows = (
                    await response.json()
                )

            if fallback_rows:
                return fallback_rows[0].get(
                    "name"
                )

        return None