"""Calendar platform for InLeMa."""

from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any

from homeassistant.components.calendar import (
    CalendarEntity,
    CalendarEvent,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .coordinator import InLeMaDataCoordinator
from .entity import InLeMaEntity


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up the InLeMa calendar."""

    coordinator: InLeMaDataCoordinator = entry.runtime_data

    async_add_entities(
        [
            InLeMaMealCalendar(
                coordinator=coordinator,
                entry=entry,
            )
        ]
    )


class InLeMaMealCalendar(
    InLeMaEntity,
    CalendarEntity,
):
    """InLeMa meal plan calendar."""

    _attr_name = "Mahlzeitenplan"
    _attr_icon = "mdi:food-calendar"

    def __init__(
        self,
        coordinator: InLeMaDataCoordinator,
        entry: ConfigEntry,
    ) -> None:
        """Initialize the calendar."""

        super().__init__(coordinator)

        self._attr_unique_id = (
            f"{entry.entry_id}_meal_calendar"
        )

    @property
    def event(self) -> CalendarEvent | None:
        """Return the next meal."""

        meal = self.coordinator.data.get("next_meal")

        if not meal:
            return None

        return self._meal_to_event(meal)

    async def async_get_events(
        self,
        hass: HomeAssistant,
        start_date: datetime,
        end_date: datetime,
    ) -> list[CalendarEvent]:
        """Return meals in the requested date range."""

        start = start_date.date()
        end = end_date.date()

        rows = await self.coordinator.api.get(
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
                "date": (
                    f"gte.{start.isoformat()}"
                ),
                "deleted_at": "is.null",
                "order": "date.asc",
            },
        )

        events: list[CalendarEvent] = []

        for meal in rows:
            meal_date = self._parse_date(
                meal.get("date")
            )

            if meal_date is None:
                continue

            # PostgREST receives only one filter for "date"
            # above, so enforce the upper boundary here.
            if meal_date >= end:
                continue

            recipe_name = await self._get_recipe_name(
                meal.get("recipe_id")
            )

            meal["recipe_name"] = recipe_name

            events.append(
                self._meal_to_event(meal)
            )

        return events

    async def _get_recipe_name(
        self,
        recipe_id: str | None,
    ) -> str:
        """Get translated recipe name."""

        if not recipe_id:
            return "Geplante Mahlzeit"

        rows = await self.coordinator.api.get(
            "recipes",
            {
                "select": "id,name",
                "id": f"eq.{recipe_id}",
                "deleted_at": "is.null",
                "limit": "1",
            },
        )

        if not rows:
            return "Geplante Mahlzeit"

        recipe_name = rows[0].get("name")

        if not recipe_name:
            return "Geplante Mahlzeit"

        return await self.coordinator._resolve_recipe_name(
            recipe_name
        )

    def _meal_to_event(
        self,
        meal: dict[str, Any],
    ) -> CalendarEvent:
        """Convert an InLeMa meal to a calendar event."""

        meal_date = self._parse_date(
            meal.get("date")
        )

        if meal_date is None:
            raise ValueError(
                "Meal has no valid date"
            )

        recipe_name = (
            meal.get("recipe_name")
            or self._recipe_name_from_next_meal(meal)
            or "Geplante Mahlzeit"
        )

        description_parts: list[str] = []

        servings = meal.get("servings")
        if servings is not None:
            description_parts.append(
                f"Portionen: {servings}"
            )

        occasion = meal.get("occasion")
        if occasion:
            description_parts.append(
                f"Anlass: {occasion}"
            )

        guests = meal.get("external_guest_count")
        if guests:
            description_parts.append(
                f"Gäste: {guests}"
            )

        meal_scope = meal.get("meal_scope")
        if meal_scope:
            description_parts.append(
                "Bereich: "
                + {
                    "personal": "Persönlich",
                    "household": "Haushalt",
                }.get(
                    meal_scope,
                    meal_scope,
                )
            )

        approval_status = meal.get(
            "approval_status"
        )
        if approval_status:
            description_parts.append(
                "Status: "
                + {
                    "approved": "Freigegeben",
                    "pending": "Ausstehend",
                    "rejected": "Abgelehnt",
                }.get(
                    approval_status,
                    approval_status,
                )
            )

        notes = meal.get("notes")
        if notes:
            description_parts.append(
                f"Notiz: {notes}"
            )

        return CalendarEvent(
            start=meal_date,
            end=meal_date + timedelta(days=1),
            summary=recipe_name,
            description="\n".join(
                description_parts
            ),
            uid=str(meal.get("id")),
        )

    @staticmethod
    def _recipe_name_from_next_meal(
        meal: dict[str, Any],
    ) -> str | None:
        """Extract recipe name from next-meal data."""

        recipe = meal.get("recipes")

        if isinstance(recipe, dict):
            return recipe.get("name")

        return None

    @staticmethod
    def _parse_date(
        value: Any,
    ) -> date | None:
        """Parse an InLeMa date."""

        if isinstance(value, datetime):
            return value.date()

        if isinstance(value, date):
            return value

        if isinstance(value, str):
            try:
                return date.fromisoformat(value)
            except ValueError:
                return None

        return None