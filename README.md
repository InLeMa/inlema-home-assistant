<p align="center">
  <img src="https://www.inlema.de/assets/assets/icon/logo.png" alt="InLeMa Logo" width="120">
</p>

<h1 align="center">InLeMa for Home Assistant</h1>

<p align="center">
  <strong>Food management for your smart home.</strong>
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

### Shopping Lists
- Multiple InLeMa shopping lists
- Native Home Assistant To-do entities
- Add, remove and check off shopping items
- Bidirectional synchronization with InLeMa
- Add recipe ingredients directly to a shopping list
- Automatic quantity scaling based on servings

### Pantry
- Pantry overview in Home Assistant
- Number of stored items
- Selected pantry items as individual sensors

### Recipes
- Search the InLeMa recipe database
- Display recipe images
- View ingredients, quantities and units
- Localized recipe and ingredient names

### Cooking Mode
- Select a recipe directly in Home Assistant
- View ingredients before cooking
- Step-by-step preparation
- Navigate through individual cooking steps

## Home Assistant Dashboard

InLeMa includes its own Home Assistant dashboard card.

The card provides quick access to:

- Next planned meal
- Shopping lists
- Pantry
- Plan a meal
- Cook a recipe
- Add recipe ingredients to a shopping list
- 
### Dashboard Card Setup

The InLeMa dashboard card is included in the integration.

To add the card to your Home Assistant dashboard, use:

```yaml
type: custom:inlema-card
```

If the card is not automatically available, register the following resource under **Settings → Dashboards → Resources**:

- URL: `/inlema/inlema-card.js`
- Type: JavaScript Module
  
## Secure Login

InLeMa uses **OAuth2 with PKCE** to connect your account securely.

Your InLeMa password is never stored by Home Assistant.

## Installation

InLeMa is currently **not yet available through the default HACS repository**.

Until then, the integration can be installed manually. No Linux or command-line knowledge is required.

### 1. Download InLeMa

At the top of this GitHub page, click:

**Code → Download ZIP**

Extract the downloaded ZIP file on your computer.

Open the extracted folder and navigate to:

```text
custom_components
└── inlema
```

The complete **`inlema` folder** is what you need to copy later.

---

### 2. Install Samba Share in Home Assistant

Samba Share allows you to open your Home Assistant files like a normal network folder on your Windows computer.

In Home Assistant, go to:

**Settings → Apps → App Store**

Search for:

**Samba share**

Install it.

Open the **Configuration** tab and set a username and password.

For example:

```text
Username: homeassistant
Password: choose-your-own-password
```

Save the configuration and start **Samba share**.

---

### 3. Open Home Assistant on your computer

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

Enter the Samba username and password you created above.

Open the:

```text
config
```

folder.

---

### 4. Copy InLeMa to Home Assistant

Inside the `config` folder, look for:

```text
custom_components
```

If the folder does not exist, create it.

Now copy the **complete `inlema` folder** from the downloaded ZIP into `custom_components`.

When finished, it must look exactly like this:

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
        ├── brand
        └── frontend
```

> **Important:** Copy the entire `inlema` folder, not just the individual files.

The final path must be:

```text
/config/custom_components/inlema/
```

Do **not** create this by mistake:

```text
/config/custom_components/custom_components/inlema/
```

---

### 5. Restart Home Assistant

After copying the folder, restart Home Assistant:

**Settings → System → Restart Home Assistant**

Wait until Home Assistant has completely restarted.

---

### 6. Add InLeMa

In Home Assistant, go to:

**Settings → Devices & services → Add Integration**

Search for **InLeMa** and select it.

---

### 7. Configure Application Credentials

During the first setup, Home Assistant asks for Application Credentials.

Enter the following values:

| Field | Value |
|---|---|
| Name | InLeMa |
| OAuth Client ID | `25eefd5b-9f3c-4176-bd2d-1aede5e8d75f` |
| OAuth Client Secret | `unused` |

**Important:** InLeMa uses OAuth2 with PKCE and does not require a real client secret. Enter `unused` as a placeholder.

Save the credentials to continue.

---

### 8. Connect your InLeMa account

Home Assistant will redirect you to the InLeMa login page.

1. Sign in with your InLeMa account.
2. Authorize Home Assistant to access your InLeMa data.
3. Return to Home Assistant.

After successful authorization, your InLeMa integration is ready to use.

## Version

Current version:

**v0.3.0**

## Support

Bug reports and feature requests can be submitted through the GitHub Issues section of this repository.

More information about InLeMa:

**https://www.inlema.de**

---

<p align="center">
  <strong>InLeMa</strong><br>
  Food management for your smart home.
</p>
