"""Base entity for InLeMa."""

from __future__ import annotations

from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .coordinator import InLeMaDataCoordinator


class InLeMaEntity(
    CoordinatorEntity[InLeMaDataCoordinator]
):
    """Base class for InLeMa entities."""

    _attr_has_entity_name = True