<p align="center">
  <img src="https://www.inlema.de/assets/assets/icon/logo.png" alt="InLeMa Logo" width="120">
</p>

<h1 align="center">InLeMa for Home Assistant</h1>

<p align="center">
  <strong>Food management for your smart home.</strong>
</p>

<p align="center">
  <a href="https://github.com/InLeMa/inlema-home-assistant/releases"><img src="https://img.shields.io/github/v/release/InLeMa/inlema-home-assistant?label=release" alt="Latest release"></a>
  <a href="https://github.com/InLeMa/inlema-home-assistant/actions"><img src="https://img.shields.io/badge/validation-Hassfest%20%26%20Validate-blue" alt="Validation workflows"></a>
  <img src="https://img.shields.io/badge/languages-6-blue" alt="Six supported languages">
</p>

---

**InLeMa for Home Assistant** brings your meal planning, shopping lists, pantry and recipes directly into your smart home.

[InLeMa](https://www.inlema.de) is a food management platform designed to simplify everyday meal planning and household organization. It combines recipes, meal planning, shopping lists and pantry management in one connected system.

The Home Assistant integration connects your InLeMa account with Home Assistant, allowing you to access and manage your food-related data directly from your smart home dashboard.

Plan meals, manage synchronized shopping lists, keep track of your pantry, search recipes and use the integrated Cooking Mode — without leaving Home Assistant.

**Learn more about InLeMa at [www.inlema.de](https://www.inlema.de).**

## Features

### Meal Planning

- Next planned meal as a Home Assistant sensor
- Upcoming meals as a Home Assistant calendar
- Plan meals directly from Home Assistant
- Select the number of servings
- Browse and select recipes from the dashboard card

### Shopping Lists

- Multiple InLeMa shopping lists
- Native Home Assistant To-do entities
- Add, remove and check off shopping items
- Bidirectional synchronization with InLeMa
- Add recipe ingredients directly to a selected shopping list
- Automatic ingredient quantity scaling based on servings
- Localized interface labels and status messages

### Pantry

- Pantry overview in Home Assistant
- Number of stored items
- Selected pantry items as individual sensors

### Recipes

- Search the InLeMa recipe database
- Display recipe images
- View ingredients, quantities and units
- Localized recipe and ingredient names where translations are available
- Open recipes directly from the dashboard card

### Cooking Mode

- Select a recipe directly in Home Assistant
- View ingredients before cooking
- Follow step-by-step preparation instructions
- Navigate through individual cooking steps
- Localized controls, prompts and cooking status messages

### Multilingual Support — New in v0.3.3

InLeMa supports **six languages**:

| Language | Code |
|---|---|
| German | `de` |
| English | `en` |
| French | `fr` |
| Spanish | `es` |
| Polish | `pl` |
| Russian | `ru` |

The dashboard card automatically adapts its interface to the Home Assistant frontend language. This includes buttons, dialogs, recipe selection, search placeholders, meal planning, shopping list actions and Cooking Mode.

The integration also provides localized configuration text, sensor names and service descriptions. Recipe and ingredient translations use the configured Home Assistant language where available, with German fallback.

> **Language note:** The dashboard card follows the language selected in the Home Assistant user interface. Recipe and ingredient data may follow the Home Assistant system language instead. User-created shopping list names and other user-entered content are not translated.

## Home Assistant Dashboard

InLeMa includes its own Home Assistant dashboard card, bundled with the integration.

The card provides quick access to:

- Next planned meal
- Shopping lists and open item counts
- Pantry information
- Plan a meal
- Cook a recipe
- Add recipe ingredients to a shopping list

### Dashboard Card Setup

The InLeMa dashboard card is included in the integration and is automatically registered when Home Assistant starts.

**No manual JavaScript resource configuration is required.**

To add the InLeMa card to your dashboard:

1. Open your Home Assistant dashboard.
2. Click **Edit Dashboard**.
3. Select **Add Card**.
4. Choose **Manual**.
5. Enter the following configuration:

```yaml
type: custom:inlema-card
```

6. Save the card.

The InLeMa dashboard card is now ready to use.

> **Tip:** If the card does not show the latest interface after an update, reload the browser with **Ctrl + F5** to refresh cached JavaScript.

## Secure Login

InLeMa uses **OAuth2 with PKCE** to connect your account securely.

Your InLeMa password is never stored by Home Assistant.

## Installation

InLeMa can be installed manually or added to HACS as a custom repository. **Official inclusion in the default HACS catalog is pending approval.**

### Option A: Install through HACS as a Custom Repository

If you already use HACS:

1. Open **HACS** in Home Assistant.
2. Open the menu in the upper-right corner and select **Custom repositories**.
3. Enter the repository URL:

   ```text
   https://github.com/InLeMa/inlema-home-assistant
   ```

4. Select **Integration** as the repository type and add it.
5. Find **InLeMa** in HACS and install it.
6. Restart Home Assistant.
7. Continue with **Add InLeMa** below.

> The exact HACS menu labels may vary between HACS versions. Adding a custom repository is only necessary until the integration is accepted into the default catalog.

### Option B: Manual Installation (Windows / Samba Share)

No Linux or command-line knowledge is required.

#### 1. Download InLeMa

For a specific stable version, open the [GitHub Releases](https://github.com/InLeMa/inlema-home-assistant/releases) page and download the source ZIP for the latest release.

Alternatively, at the top of this GitHub repository, click **Code → Download ZIP** to download the current `main` branch.

Extract the ZIP file on your computer and navigate to:

```text
custom_components
└── inlema
```

The complete **`inlema` folder** is what you need to copy later.

#### 2. Install Samba Share in Home Assistant

Samba Share allows you to open your Home Assistant files like a normal network folder on your Windows computer.

In Home Assistant, go to:

**Settings → Apps → App Store**

Search for **Samba share** and install it.

Open its configuration and set a username and password. For example:

```text
Username: homeassistant
Password: choose-your-own-password
```

Save the configuration and start **Samba share**.

> Samba Share availability and menu names depend on your Home Assistant installation type and version. If Samba Share is unavailable, use another supported method to access the Home Assistant configuration directory.

#### 3. Open Home Assistant on your computer

On your Windows computer, open **File Explorer**.

Enter the following into the address bar:

```text
\\homeassistant.local
```

If this does not work, use the IP address of your Home Assistant system instead:

```text
\\192.168.1.100
```

Replace `192.168.1.100` with your actual Home Assistant IP address.

Enter the Samba username and password you created above, then open the `config` folder.

#### 4. Copy InLeMa to Home Assistant

Inside `config`, look for `custom_components`. If the folder does not exist, create it.

Copy the **complete `inlema` folder** from the downloaded ZIP into `custom_components`.

The resulting directory should look like this (selected files shown):

```text
config
└── custom_components
    └── inlema
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
        ├── frontend/
        │   └── inlema-card.js
        └── translations/
            ├── de.json
            ├── en.json
            ├── es.json
            ├── fr.json
            ├── pl.json
            └── ru.json
```

> **Important:** Copy the entire `inlema` folder, including `frontend` and `translations`, not just individual Python files.

The final path must be:

```text
/config/custom_components/inlema/
```

Do **not** accidentally create:

```text
/config/custom_components/custom_components/inlema/
```

#### 5. Restart Home Assistant

After copying the folder, restart Home Assistant:

**Settings → System → Restart Home Assistant**

Wait until Home Assistant has completely restarted.

### Add InLeMa

In Home Assistant, go to:

**Settings → Devices & services → Add Integration**

Search for **InLeMa** and select it.

### Configure Application Credentials

During the first setup, Home Assistant asks for Application Credentials.

Enter the following values:

| Field | Value |
|---|---|
| Name | InLeMa |
| OAuth Client ID | `25eefd5b-9f3c-4176-bd2d-1aede5e8d75f` |
| OAuth Client Secret | `unused` |

**Important:** InLeMa uses OAuth2 with PKCE and does not require a real client secret. Enter `unused` as a placeholder.

Save the credentials to continue.

### Connect your InLeMa account

Home Assistant will redirect you to the InLeMa login page.

1. Sign in with your InLeMa account.
2. Authorize Home Assistant to access your InLeMa data.
3. Return to Home Assistant.

After successful authorization, your InLeMa integration is ready to use.

## Updating InLeMa

### HACS installation

If you installed InLeMa through HACS, use the update notification in HACS when a new version becomes available. Restart Home Assistant after updating.

### Manual installation

1. Download the latest stable version from [GitHub Releases](https://github.com/InLeMa/inlema-home-assistant/releases).
2. Extract the ZIP file.
3. Replace the existing `/config/custom_components/inlema/` folder with the new `custom_components/inlema/` folder from the release.
4. Restart Home Assistant.
5. Refresh your browser (**Ctrl + F5**) if the dashboard card still shows an older interface.

Your InLeMa account and integration configuration do not normally need to be set up again when updating the integration files.

## Version

**Current release: v0.3.3 — Multilingual Support**

Highlights:

- Added German, English, French, Spanish, Polish and Russian translations
- Localized the dashboard card, including recipe search, meal planning, shopping list dialogs and Cooking Mode
- Added localized Home Assistant integration text and entity names
- Improved translation handling for dynamic interface messages
- Kept existing entity IDs, service names and recipe/food keys unchanged

See the [GitHub Releases](https://github.com/InLeMa/inlema-home-assistant/releases) page for release notes and future updates.

## Support

Bug reports and feature requests can be submitted through [GitHub Issues](https://github.com/InLeMa/inlema-home-assistant/issues).

More information about InLeMa:

**https://www.inlema.de**

---

<p align="center">
  <strong>InLeMa</strong><br>
  Food management for your smart home.
</p>
