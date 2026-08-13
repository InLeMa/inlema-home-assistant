"""Application credentials for InLeMa."""

from homeassistant.components.application_credentials import ClientCredential
from homeassistant.core import HomeAssistant
from homeassistant.helpers.config_entry_oauth2_flow import (
    AbstractOAuth2Implementation,
    LocalOAuth2ImplementationWithPkce,
)

AUTHORIZE_URL = (
    "https://ccpkaydyhygetzjigsdr.supabase.co/"
    "auth/v1/oauth/authorize"
)

TOKEN_URL = (
    "https://ccpkaydyhygetzjigsdr.supabase.co/"
    "auth/v1/oauth/token"
)


async def async_get_auth_implementation(
    hass: HomeAssistant,
    auth_domain: str,
    credential: ClientCredential,
) -> AbstractOAuth2Implementation:
    """Return the InLeMa OAuth2 implementation."""

    return LocalOAuth2ImplementationWithPkce(
        hass,
        auth_domain,
        credential.client_id,
        authorize_url=AUTHORIZE_URL,
        token_url=TOKEN_URL,
        client_secret="",
        code_verifier_length=128,
    )