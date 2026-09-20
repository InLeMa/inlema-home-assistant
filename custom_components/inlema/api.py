"""API client for InLeMa."""

from __future__ import annotations

from typing import Any

from aiohttp import ClientSession
from homeassistant.helpers import config_entry_oauth2_flow

from .const import SUPABASE_ANON_KEY, SUPABASE_URL


class InLeMaApiError(Exception):
    """Base exception for InLeMa API errors."""


class InLeMaApi:
    """Client for the InLeMa Supabase API."""

    def __init__(
        self,
        session: ClientSession,
        oauth_session: config_entry_oauth2_flow.OAuth2Session,
    ) -> None:
        self._session = session
        self._oauth_session = oauth_session

    async def _headers(self) -> dict[str, str]:
        """Return authenticated request headers."""

        await self._oauth_session.async_ensure_token_valid()

        token = self._oauth_session.token["access_token"]

        return {
            "Authorization": f"Bearer {token}",
            "apikey": SUPABASE_ANON_KEY,
            "Content-Type": "application/json",
        }

    async def get(
        self,
        table: str,
        params: dict[str, str] | None = None,
    ) -> list[dict[str, Any]]:
        """Read data from a table."""

        headers = await self._headers()
        url = f"{SUPABASE_URL}/rest/v1/{table}"

        try:
            async with self._session.get(
                url,
                headers=headers,
                params=params,
            ) as response:
                response.raise_for_status()
                data = await response.json()

        except Exception as err:
            raise InLeMaApiError(
                f"Error reading {table}"
            ) from err

        if not isinstance(data, list):
            raise InLeMaApiError(
                f"Unexpected response from {table}"
            )

        return data
    async def get_user(
        self,
    ) -> dict[str, Any]:
        """Return the authenticated Supabase user."""

        headers = await self._headers()

        url = f"{SUPABASE_URL}/auth/v1/user"

        try:
            async with self._session.get(
                url,
                headers=headers,
            ) as response:
                response.raise_for_status()
                data = await response.json()

        except Exception as err:
            raise InLeMaApiError(
                "Error reading authenticated user"
            ) from err

        if not isinstance(data, dict):
            raise InLeMaApiError(
                "Unexpected authenticated user response"
            )

        return data
    async def post(
        self,
        table: str,
        data: dict[str, Any],
    ) -> list[dict[str, Any]]:
        """Insert data into a table."""

        headers = await self._headers()
        headers["Prefer"] = "return=representation"

        url = f"{SUPABASE_URL}/rest/v1/{table}"

        try:
            async with self._session.post(
                url,
                headers=headers,
                json=data,
            ) as response:
                response.raise_for_status()
                result = await response.json()

        except Exception as err:
            raise InLeMaApiError(
                f"Error writing {table}"
            ) from err

        if not isinstance(result, list):
            raise InLeMaApiError(
                f"Unexpected response from {table}"
            )

        return result

    async def patch(
        self,
        table: str,
        params: dict[str, str],
        data: dict[str, Any],
    ) -> None:
        """Update data in a table."""

        headers = await self._headers()
        url = f"{SUPABASE_URL}/rest/v1/{table}"

        try:
            async with self._session.patch(
                url,
                headers=headers,
                params=params,
                json=data,
            ) as response:
                response.raise_for_status()

        except Exception as err:
            raise InLeMaApiError(
                f"Error updating {table}"
            ) from err

    async def delete(
        self,
        table: str,
        params: dict[str, str],
    ) -> None:
        """Delete data from a table."""

        headers = await self._headers()
        url = f"{SUPABASE_URL}/rest/v1/{table}"

        try:
            async with self._session.delete(
                url,
                headers=headers,
                params=params,
            ) as response:
                response.raise_for_status()

        except Exception as err:
            raise InLeMaApiError(
                f"Error deleting from {table}"
            ) from err