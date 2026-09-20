```{=html}
<p align="center">
```
`<img src="assets/InLeMa_Banner.png" alt="InLeMa Banner" width="100%">`{=html}
```{=html}
</p>
```
```{=html}
<h1 align="center">
```
InLeMa for Home Assistant
```{=html}
</h1>
```
```{=html}
<p align="center">
```
`<strong>`{=html}Your InLeMa kitchen workflow directly in Home
Assistant.`</strong>`{=html}
```{=html}
</p>
```
```{=html}
<p align="center">
```
Meal planning · Shopping lists · Pantry · Recipes · Guided cooking
```{=html}
</p>
```
```{=html}
<p align="center">
```
`<a href="#features">`{=html}Features`</a>`{=html} ·
`<a href="#installation">`{=html}Installation`</a>`{=html} ·
`<a href="#dashboard-card">`{=html}Dashboard Card`</a>`{=html} ·
`<a href="#home-assistant-services">`{=html}Services`</a>`{=html} ·
`<a href="#support">`{=html}Support`</a>`{=html}
```{=html}
</p>
```

------------------------------------------------------------------------

## Overview

**InLeMa for Home Assistant** connects your InLeMa account with Home
Assistant using OAuth2 with PKCE.

Version **0.3.0** goes far beyond displaying the next meal: meal
planning, shopping lists, pantry data, recipe search and guided cooking
are brought together in one Home Assistant integration.

```{=html}
<p align="center">
```
`<strong>`{=html}Plan → Shop → Manage stock → Cook`</strong>`{=html}
```{=html}
</p>
```
```{=html}
<p align="center">
```
`<img src="assets/InLeMa_Karte.PNG"
       alt="InLeMa dashboard card for Home Assistant"
       width="460">`{=html}
```{=html}
</p>
```

------------------------------------------------------------------------

## Features

  Area                 Available in v0.3.0
  -------------------- ------------------------------------------------
  🔐 Account           OAuth2 account linking with PKCE
  🍽️ Next meal         Native Home Assistant sensor
  📅 Meal planning     Calendar + plan meals from Home Assistant
  🛒 Shopping          Multiple native Home Assistant To-do lists
  🔄 Synchronization   Shopping-list changes synchronized with InLeMa
  🥫 Pantry            Stock overview + selected stock-item sensors
  🔎 Recipes           Search the InLeMa recipe database
  🧾 Ingredients       Add recipe ingredients to a shopping list
  ⚖️ Servings          Ingredient quantities scaled automatically
  🖼️ Recipe images     Display recipe images in Home Assistant
  👨‍🍳 Cooking Mode      Ingredients and step-by-step preparation
  🏠 Dashboard         Dedicated InLeMa Home Assistant card

### Meal planning

The integration provides the next planned meal as a sensor and upcoming
meals through a native Home Assistant calendar.

Meals can also be planned directly from the InLeMa dashboard card.

### Shopping lists

Each synchronized InLeMa shopping list becomes a native Home Assistant
**To-do** entity.

You can:

-   view multiple shopping lists;
-   add and remove items;
-   check and uncheck items;
-   see quantities and units;
-   add all ingredients of a recipe to a selected list.

Changes are synchronized with InLeMa.

### Pantry

Your InLeMa pantry is available in Home Assistant as a stock overview.
Selected stock items can additionally be exposed as individual sensors.

### Recipes & Cooking Mode

Recipes can be searched directly from the dashboard.

After selecting a recipe, InLeMa loads its image, ingredients, servings
and preparation steps. **Cooking Mode** then guides you through the
recipe step by step.

------------------------------------------------------------------------

## Dashboard Card

The included `custom:inlema-card` is the central InLeMa interface in
Home Assistant.

It shows:

-   the next planned meal;
-   recipe image and servings;
-   shopping lists and their open-item counts;
-   pantry position count;
-   shortcuts for **Plan meal**, **Cook recipe** and **Buy
    ingredients**.

### Card setup

The integration serves the card frontend itself. If Home Assistant does
not already know the resource, register it once:

**Settings → Dashboards → Resources → Add Resource**

``` text
URL: /inlema/inlema-card.js
Type: JavaScript Module
```

Then add the card to a dashboard:

``` yaml
type: custom:inlema-card
```

If an old JavaScript version remains cached after an update, reload the
browser. A temporary cache-busting URL such as
`/inlema/inlema-card.js?v=1` can also be used.

------------------------------------------------------------------------

# Installation

> **HACS status:** InLeMa has been submitted for inclusion in the
> default HACS repository, but is **not yet available there**.\
> Until publication is complete, use the manual installation below.

## Requirements

-   Home Assistant
-   An InLeMa account
-   Internet access
-   File access to the Home Assistant `/config` directory

An InLeMa account is required because Home Assistant accesses
synchronized account data through the authenticated InLeMa connection.

------------------------------------------------------------------------

## 1. Download InLeMa

Download this repository using:

**Code → Download ZIP**

Extract the ZIP on your computer.

The integration is located here:

``` text
custom_components/
└── inlema/
```

------------------------------------------------------------------------

## 2. Open the Home Assistant `/config` directory

You need access to the Home Assistant file system.

For **Home Assistant OS**, one convenient option is the **Samba share**
app:

**Settings → Apps → App Store → Samba share**

Install it, configure a username and password, and start the app.

If you already use SSH, Studio Code Server or another method to access
`/config`, you can use that instead.

### Windows example

Open Windows Explorer and enter:

``` text
\\192.168.1.100\config
```

Replace `192.168.1.100` with the IP address of your Home Assistant
system.

------------------------------------------------------------------------

## 3. Copy the integration

Copy the complete downloaded `inlema` directory to:

``` text
/config/custom_components/inlema
```

The important part is the directory structure:

``` text
/config/
└── custom_components/
    └── inlema/
        ├── __init__.py
        ├── api.py
        ├── application_credentials.py
        ├── calendar.py
        ├── config_flow.py
        ├── const.py
        ├── coordinator.py
        ├── entity.py
        ├── manifest.json
        ├── sensor.py
        ├── services.yaml
        ├── strings.json
        ├── todo.py
        ├── brand/
        └── frontend/
```

**Correct**

``` text
/config/custom_components/inlema
```

**Wrong**

``` text
/config/custom_components/custom_components/inlema
```

------------------------------------------------------------------------

## 4. Restart Home Assistant

Restart Home Assistant after copying the files:

**Settings → System → Restart Home Assistant**

Wait until Home Assistant is fully available again.

------------------------------------------------------------------------

## 5. Add the integration

Open:

**Settings → Devices & services → Add Integration**

Search for:

``` text
InLeMa
```

Select **InLeMa**.

------------------------------------------------------------------------

## 6. Configure OAuth

During the first setup, Home Assistant asks for application credentials.

Use:

``` text
Name:
InLeMa

OAuth Client ID:
25eefd5b-9f3c-4176-bd2d-1aede5e8d75f

OAuth Client Secret:
unused
```

### Why `unused`?

InLeMa uses a **public OAuth2 client with PKCE** and therefore does not
use a traditional client secret.

Home Assistant's application-credentials interface requires a value in
this field, so `unused` is only a placeholder. It is **not a password,
API key or secret**.

------------------------------------------------------------------------

## 7. Connect your InLeMa account

Home Assistant redirects you to InLeMa.

``` text
Home Assistant
      ↓
InLeMa login
      ↓
Authorize Home Assistant
      ↓
Return to Home Assistant
```

Sign in and approve the connection.

Your InLeMa password is entered only on the InLeMa authentication page
and is not provided to Home Assistant.

After authorization, the InLeMa integration and its entities are
created.

------------------------------------------------------------------------

## Updating

Until HACS installation is available:

1.  Download the latest repository version.
2.  Replace `/config/custom_components/inlema` with the new
    `custom_components/inlema` directory.
3.  Restart Home Assistant.
4.  Refresh the browser if the dashboard frontend changed.

Normally, replacing the integration files does **not** require
reconnecting your InLeMa account.

------------------------------------------------------------------------

## Home Assistant entities

Depending on your Home Assistant naming and language settings, entity
IDs may differ.

### Next meal

A sensor represents the next planned meal and exposes additional meal
information.

Example:

``` yaml
state: Chicken Tikka Masala
date: 2026-09-21
servings: 4
```

### Meal calendar

Upcoming InLeMa meals are available through a native Home Assistant
calendar entity.

### Shopping lists

Synchronized InLeMa shopping lists are exposed as native Home Assistant
To-do entities.

Example:

``` text
todo.meine_liste
todo.party
```

### Pantry

The integration provides a pantry summary and can expose selected stock
items as individual sensors.

------------------------------------------------------------------------

## Home Assistant services

### `inlema.search_recipe`

Search recipes.

``` yaml
query: Chicken Tikka
```

Returns matching recipe IDs and recipe information.

### `inlema.get_recipe`

Retrieve a complete recipe for Cooking Mode.

``` yaml
recipe_id: "RECIPE_UUID"
```

The response can contain the recipe image, servings, ingredients,
quantities, units and preparation steps.

### `inlema.plan_meal`

Plan a recipe.

``` yaml
recipe_id: "RECIPE_UUID"
date: "2026-09-21"
servings: 4
```

### `inlema.add_recipe_to_shopping_list`

Add recipe ingredients to a shopping list.

``` yaml
recipe_id: "RECIPE_UUID"
shopping_list_id: "SHOPPING_LIST_UUID"
servings: 4
```

Ingredient quantities are scaled according to the requested servings.

------------------------------------------------------------------------

## Synchronization

InLeMa periodically refreshes cloud data. The current integration
refresh interval is approximately **60 seconds**.

Supported actions performed through Home Assistant are sent back to
InLeMa and followed by a data refresh.

------------------------------------------------------------------------

## Security

-   OAuth2 Authorization Code Flow with PKCE
-   Public OAuth client
-   No InLeMa password stored by Home Assistant
-   User-scoped authenticated access
-   No Supabase `service_role` key required by the integration
-   Server-side InLeMa access controls remain in effect

------------------------------------------------------------------------

## HACS

InLeMa has been submitted for inclusion in the default HACS repository.

Until that process is complete, **manual installation is the supported
installation method described above**.

------------------------------------------------------------------------

## Support

For bugs and feature requests, use the repository's **Issues** section.

For InLeMa itself, visit **www.inlema.de**.

------------------------------------------------------------------------

## Disclaimer

InLeMa for Home Assistant is a third-party integration connecting
**InLeMa** with **Home Assistant**.

Home Assistant is a trademark of the Open Home Foundation.

This project is not part of the official **Works with Home Assistant**
certification program.

```{=html}
<p align="center">
```
`<img src="assets/logo.png" alt="InLeMa Logo" width="80">`{=html}
```{=html}
</p>
```
```{=html}
<p align="center">
```
`<strong>`{=html}InLeMa`</strong>`{=html}`<br>`{=html}
`<sub>`{=html}Food management for your smart home.`</sub>`{=html}
```{=html}
</p>
```
