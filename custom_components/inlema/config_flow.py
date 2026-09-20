"""Config flow for InLeMa."""

from homeassistant.helpers import config_entry_oauth2_flow

from .const import DOMAIN
import voluptuous as vol

from homeassistant import config_entries
from homeassistant.core import callback
from homeassistant.helpers import config_entry_oauth2_flow
from homeassistant.helpers.selector import (
    SelectSelector,
    SelectSelectorConfig,
    SelectSelectorMode,
)

class OAuth2FlowHandler(
    config_entry_oauth2_flow.AbstractOAuth2FlowHandler,
    domain=DOMAIN,
):
    """Handle an InLeMa OAuth2 config flow."""

    DOMAIN = DOMAIN
    @staticmethod
    @callback
    def async_get_options_flow(
        config_entry,
    ):
        """Return the options flow."""
        return InLeMaOptionsFlow(config_entry)
    @property
    def logger(self):
        """Return logger."""
        import logging

        return logging.getLogger(__name__)

    async def async_oauth_create_entry(self, data: dict):
        """Create config entry after successful OAuth authentication."""

        return self.async_create_entry(
            title="InLeMa",
            data=data,
        )
class InLeMaOptionsFlow(
    config_entries.OptionsFlow
):
    """Handle InLeMa options."""

    def __init__(
        self,
        config_entry,
    ) -> None:
        """Initialize options flow."""
        self._config_entry = config_entry

    async def async_step_init(
        self,
        user_input=None,
    ):
        """Manage InLeMa options."""

        coordinator = self._config_entry.runtime_data

        stock_items = coordinator.data.get(
            "stock_items",
            [],
        )

        options = []

        for item in stock_items:
            item_id = item.get("id")

            if not item_id:
                continue

            name = (
                item.get("display_name")
                or item.get("name")
                or "Unbekannt"
            )

            quantity = item.get("quantity")
            unit = item.get("unit")

            label = name

            if quantity is not None:
                label += f" ({quantity}"

                if unit:
                    label += f" {unit}"

                label += ")"

            options.append(
                {
                    "value": str(item_id),
                    "label": label,
                }
            )

        if user_input is not None:
            return self.async_create_entry(
                title="",
                data=user_input,
            )

        selected = self._config_entry.options.get(
            "stock_entities",
            [],
        )

        schema = vol.Schema(
            {
                vol.Optional(
                    "stock_entities",
                    default=selected,
                ): SelectSelector(
                    SelectSelectorConfig(
                        options=options,
                        multiple=True,
                        mode=SelectSelectorMode.DROPDOWN,
                    )
                )
            }
        )

        return self.async_show_form(
            step_id="init",
            data_schema=schema,
        )