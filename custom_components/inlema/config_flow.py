"""Config flow for InLeMa."""

from homeassistant.helpers import config_entry_oauth2_flow

from .const import DOMAIN


class OAuth2FlowHandler(
    config_entry_oauth2_flow.AbstractOAuth2FlowHandler,
    domain=DOMAIN,
):
    """Handle an InLeMa OAuth2 config flow."""

    DOMAIN = DOMAIN

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