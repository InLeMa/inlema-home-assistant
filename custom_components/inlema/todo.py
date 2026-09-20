"""To-do platform for InLeMa shopping lists."""

from __future__ import annotations

from typing import Any

from homeassistant.components.todo import (
    TodoItem,
    TodoItemStatus,
    TodoListEntity,
    TodoListEntityFeature,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .api import InLeMaApiError
from .coordinator import InLeMaDataCoordinator
from .entity import InLeMaEntity


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up InLeMa shopping lists."""

    coordinator: InLeMaDataCoordinator = entry.runtime_data

    shopping_lists = coordinator.data.get(
        "shopping_lists",
        [],
    )

    entities = [
        InLeMaShoppingList(
            coordinator=coordinator,
            entry=entry,
            shopping_list=shopping_list,
        )
        for shopping_list in shopping_lists
        if shopping_list.get("id")
    ]

    async_add_entities(entities)


class InLeMaShoppingList(
    InLeMaEntity,
    TodoListEntity,
):
    """An InLeMa shopping list."""

    _attr_icon = "mdi:cart"
    _attr_supported_features = (
        TodoListEntityFeature.CREATE_TODO_ITEM
        | TodoListEntityFeature.UPDATE_TODO_ITEM
        | TodoListEntityFeature.DELETE_TODO_ITEM
    )

    def __init__(
        self,
        coordinator: InLeMaDataCoordinator,
        entry: ConfigEntry,
        shopping_list: dict[str, Any],
    ) -> None:
        """Initialize an InLeMa shopping list."""

        super().__init__(coordinator)

        self._list_id = shopping_list["id"]

        self._attr_unique_id = (
            f"{entry.entry_id}_shopping_list_{self._list_id}"
        )

        self._attr_name = (
            shopping_list.get("name")
            or "Einkaufsliste"
        )

    def _get_list(
        self,
    ) -> dict[str, Any] | None:
        """Return current shopping list data."""

        for shopping_list in self.coordinator.data.get(
            "shopping_lists",
            [],
        ):
            if shopping_list.get("id") == self._list_id:
                return shopping_list

        return None

    @property
    def todo_items(
        self,
    ) -> list[TodoItem]:
        """Return shopping items."""

        shopping_list = self._get_list()

        if not shopping_list:
            return []

        result: list[TodoItem] = []

        for item in shopping_list.get("items", []):
            item_id = item.get("id")
            name = (
            item.get("display_name")
            or item.get("name")
        )

            if not item_id or not name:
                continue

            quantity = item.get("quantity")
            unit = item.get("unit")
            notes = item.get("notes")

            description_parts: list[str] = []

            if quantity is not None:
                if unit:
                    description_parts.append(
                        f"Menge: {quantity} {unit}"
                    )
                else:
                    description_parts.append(
                        f"Menge: {quantity}"
                    )

            if notes:
                description_parts.append(
                    str(notes)
                )

            result.append(
                TodoItem(
                    uid=str(item_id),
                    summary=str(name),
                    status=(
                        TodoItemStatus.COMPLETED
                        if item.get("done")
                        else TodoItemStatus.NEEDS_ACTION
                    ),
                    description=(
                        "\n".join(description_parts)
                        or None
                    ),
                )
            )

        return result

    async def async_create_todo_item(
        self,
        item: TodoItem,
    ) -> None:
        """Create an InLeMa shopping item."""

        if not item.summary:
            return

        entered_name = item.summary.strip()

        if not entered_name:
            return

        food_key = await self.coordinator.resolve_food_key(
            entered_name
        )

        data: dict[str, Any] = {
            "shopping_list_id": self._list_id,
            "name": food_key or entered_name,
            "quantity": 1,
            "unit": "Stück",
            "done": False,
        }

        if food_key:
            data["food_key"] = food_key

        await self.coordinator.api.post(
            "shopping_items",
            data,
        )

        await self.coordinator.async_request_refresh()

    async def async_update_todo_item(
        self,
        item: TodoItem,
    ) -> None:
        """Update an InLeMa shopping item."""

        if not item.uid:
            return

        data: dict[str, Any] = {}

        if item.summary is not None:
            data["name"] = item.summary

        if item.status is not None:
            data["done"] = (
                item.status == TodoItemStatus.COMPLETED
            )

        if not data:
            return

        try:
            await self.coordinator.api.patch(
                "shopping_items",
                {
                    "id": f"eq.{item.uid}",
                    "shopping_list_id": f"eq.{self._list_id}",
                },
                data,
            )

            await self.coordinator.async_request_refresh()

        except InLeMaApiError:
            raise

    async def async_delete_todo_items(
        self,
        uids: list[str],
    ) -> None:
        """Delete InLeMa shopping items."""

        for uid in uids:
            try:
                await self.coordinator.api.patch(
                    "shopping_items",
                    {
                        "id": f"eq.{uid}",
                        "shopping_list_id": f"eq.{self._list_id}",
                    },
                    {
                        "deleted_at": "now()",
                    },
                )

            except InLeMaApiError:
                raise

        await self.coordinator.async_request_refresh()