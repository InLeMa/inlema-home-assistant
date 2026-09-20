"""Sensors for InLeMa."""

from __future__ import annotations

from typing import Any

from homeassistant.components.sensor import SensorEntity
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
    """Set up InLeMa sensors."""

    coordinator: InLeMaDataCoordinator = entry.runtime_data

    entities: list[SensorEntity] = [
        InLeMaNextMealSensor(
            coordinator=coordinator,
            entry=entry,
        ),
        InLeMaStockSensor(
            coordinator=coordinator,
            entry=entry,
        ),
    ]

    selected_stock_ids = entry.options.get(
        "stock_entities",
        [],
    )

    stock_items = coordinator.data.get(
        "stock_items",
        [],
    )

    for item in stock_items:
        item_id = item.get("id")

        if (
            item_id
            and str(item_id) in selected_stock_ids
        ):
            entities.append(
                InLeMaStockItemSensor(
                    coordinator=coordinator,
                    entry=entry,
                    stock_item_id=str(item_id),
                )
            )

    async_add_entities(entities)


class InLeMaNextMealSensor(
    InLeMaEntity,
    SensorEntity,
):
    """Show the next planned InLeMa meal."""

    _attr_name = "Nächste Mahlzeit"
    _attr_icon = "mdi:food"

    def __init__(
        self,
        coordinator: InLeMaDataCoordinator,
        entry: ConfigEntry,
    ) -> None:
        """Initialize the sensor."""

        super().__init__(coordinator)

        self._entry = entry

        self._attr_unique_id = (
            f"{entry.entry_id}_next_meal"
        )

    @property
    def native_value(self) -> str | None:
        """Return the recipe name."""

        meal = self.coordinator.data.get("next_meal")

        if not meal:
            return None

        recipe = meal.get("recipes")

        if not isinstance(recipe, dict):
            return "Unbekanntes Rezept"

        return recipe.get("name") or "Unbekanntes Rezept"

    @property
    def extra_state_attributes(
        self,
    ) -> dict[str, Any]:
        """Return meal attributes."""

        meal = self.coordinator.data.get("next_meal")

        if not meal:
            return {}
        recipe = meal.get("recipes")

        image_url = None

        if isinstance(recipe, dict):
            image_url = recipe.get("image_url")
        return {
            "date": meal.get("date"),
            "servings": meal.get("servings"),
            "recipe_id": meal.get("recipe_id"),
            "image_url": image_url,
            "notes": meal.get("notes"),
            "occasion": meal.get("occasion"),
            "external_guests":
                meal.get("external_guest_count"),
            "meal_scope": meal.get("meal_scope"),
            "approval_status":
                meal.get("approval_status"),
            "household_id":
                meal.get("household_id"),
        }
class InLeMaStockSensor(
    InLeMaEntity,
    SensorEntity,
):
    """Show the number of InLeMa stock items."""

    _attr_name = "Vorrat"
    _attr_icon = "mdi:fridge-outline"
    _attr_native_unit_of_measurement = "Positionen"

    def __init__(
        self,
        coordinator: InLeMaDataCoordinator,
        entry: ConfigEntry,
    ) -> None:
        """Initialize stock sensor."""

        super().__init__(coordinator)

        self._attr_unique_id = (
            f"{entry.entry_id}_stock"
        )

    @property
    def native_value(self) -> int:
        """Return number of stock positions."""

        items = self.coordinator.data.get(
            "stock_items",
            [],
        )

        return len(items)

    @property
    def extra_state_attributes(
        self,
    ) -> dict[str, Any]:
        """Return stock summary."""

        items = self.coordinator.data.get(
            "stock_items",
            [],
        )

        return {
            "items": [
                {
                    "name": (
                        item.get("display_name")
                        or item.get("name")
                    ),
                    "quantity": item.get("quantity"),
                    "unit": item.get("unit"),
                    "household_id": item.get(
                        "household_id"
                    ),
                }
                for item in items
            ]
        }
class InLeMaStockItemSensor(
    InLeMaEntity,
    SensorEntity,
):
    """Represent one selected InLeMa stock item."""

    _attr_icon = "mdi:package-variant"

    def __init__(
        self,
        coordinator: InLeMaDataCoordinator,
        entry: ConfigEntry,
        stock_item_id: str,
    ) -> None:
        """Initialize stock item sensor."""

        super().__init__(coordinator)

        self._stock_item_id = stock_item_id

        self._attr_unique_id = (
            f"{entry.entry_id}_stock_{stock_item_id}"
        )

    def _get_item(
        self,
    ) -> dict[str, Any] | None:
        """Return current stock item."""

        for item in self.coordinator.data.get(
            "stock_items",
            [],
        ):
            if str(item.get("id")) == self._stock_item_id:
                return item

        return None

    @property
    def name(self) -> str:
        """Return sensor name."""

        item = self._get_item()

        if not item:
            return "Vorrat"

        name = (
            item.get("display_name")
            or item.get("name")
            or "Vorrat"
        )

        return f"Vorrat {name}"

    @property
    def native_value(self) -> int | float | None:
        """Return current stock quantity."""

        item = self._get_item()

        if not item:
            return None

        return item.get("quantity")

    @property
    def native_unit_of_measurement(
        self,
    ) -> str | None:
        """Return stock unit."""

        item = self._get_item()

        if not item:
            return None

        return item.get("unit")

    @property
    def extra_state_attributes(
        self,
    ) -> dict[str, Any]:
        """Return additional stock information."""

        item = self._get_item()

        if not item:
            return {}

        return {
            "stock_item_id": self._stock_item_id,
            "food_key": item.get("name"),
            "household_id": item.get(
                "household_id"
            ),
        }