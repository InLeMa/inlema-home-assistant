<p align="center">
  <img src="assets/InLeMa_Banner.png" alt="InLeMa Banner" width="100%">
</p>

<h1 align="center">InLeMa for Home Assistant</h1>

<p align="center">
  <strong>Bring your InLeMa meal planner into your smart home.</strong>
</p>

<p align="center">
  OAuth2 &nbsp;•&nbsp; Meal Planner &nbsp;•&nbsp; Home Assistant Sensor &nbsp;•&nbsp; Dashboard Card
</p>

<p align="center">
  <a href="https://www.inlema.de">InLeMa Website</a>
  &nbsp;•&nbsp;
  <a href="#installation">Installation</a>
  &nbsp;•&nbsp;
  <a href="#features">Features</a>
  &nbsp;•&nbsp;
  <a href="#support">Support</a>
</p>

---

## About

<p align="center">
  <img src="assets/logo.png" alt="InLeMa Logo" width="100">
</p>

<p align="center">
  <strong>InLeMa – Intelligent Food Management</strong><br>
  Recipes, meal planning, shopping lists and pantry management – connected in one place.
</p>

**InLeMa** is a food and meal management application designed to connect the entire process from choosing a recipe to planning meals, shopping for ingredients and managing the food you already have at home.

Instead of treating recipes, shopping lists and pantry supplies as separate tools, InLeMa connects them into one workflow:

<p align="center">
  <strong>Recipes → Meal Planner → Shopping List → Pantry</strong>
</p>

### What can InLeMa do?

🍽️ **Recipes**  
Create your own recipes with ingredients, quantities, units and preparation instructions, or use recipes from the InLeMa recipe library as a starting point. Personal recipes can be adapted to your own preferences.

📅 **Meal Planner**  
Plan recipes for specific days and choose the number of servings for each planned meal. With an InLeMa account, supported meal planning data can be synchronized between your devices.

🛒 **Shopping List**  
Create shopping lists manually or transfer the required ingredients directly from a recipe. Existing items can be combined and purchased items can be checked off while shopping.

🥫 **Pantry & Stock Management**  
Keep track of the food you already have at home. InLeMa can compare recipe ingredients with your current stock and help you see what is already available and what still needs to be purchased.

⭐ **Personal & Community Ratings**  
Rate recipes for yourself and see Community ratings for shared InLeMa recipes. Recipes from the library can also be copied into your personal collection and modified without changing the original recipe.

📖 **Import, Export & Cookbook**  
Back up and restore your recipes using InLeMa's import and export functions. Your recipes can also be turned into a PDF cookbook including a table of contents and ingredient index.

📍 **Smart Shopping on Android**  
Frequently visited supermarkets can optionally be stored locally on Android devices. Using the device location, InLeMa can recognize a shopping visit and help transfer purchased items from the shopping list into your pantry afterwards.

☁️ **Optional Account & Synchronization**  
An InLeMa account is not required for basic use. With an account, supported data can be synchronized between devices and used by connected services such as Home Assistant.

Some information intentionally remains local to the device, including personal recipe images and locally configured supermarkets.

---

### InLeMa meets Home Assistant

**InLeMa for Home Assistant** brings your meal planning data into your smart home.

The integration securely connects Home Assistant to your InLeMa account using **OAuth2 with PKCE** and currently provides your **next planned meal** as a native Home Assistant entity.

This includes information such as:

- Recipe name
- Planned date
- Number of servings
- Notes

The entity can be used throughout Home Assistant – for example in **dashboards, templates and automations**.

<p align="center">
  <strong>Plan in InLeMa → Use it in your smart home</strong>
</p>

Authentication is handled securely through OAuth2. Your **InLeMa password is never shared with or stored by Home Assistant**.

## Features

| Feature | Support |
|---|:---:|
| Secure OAuth2 account linking with PKCE | ✅ |
| Next planned meal | ✅ |
| Localized recipe names | ✅ |
| Meal date | ✅ |
| Native Home Assistant sensor | ✅ |
| Optional InLeMa dashboard card | ✅ |

---

## Home Assistant Entity

The integration creates a sensor containing your next planned meal.

Depending on your Home Assistant installation, the entity ID may for example be:

```text
sensor.nachste_mahlzeit
```

### Example

```yaml
state: Chicken Tikka Masala
date: 2026-08-18
servings: 2
notes: Dinner with friends
```

The sensor state contains the name of the next planned recipe.

Additional meal information is exposed through sensor attributes.

The entity can be used in Home Assistant dashboards, templates and automations.

---

## Dashboard Card

An optional InLeMa dashboard card can be used to display the next planned meal in Home Assistant.

<p align="center">
  <img src="assets/Dashboard_Card.png"
       alt="InLeMa Home Assistant Dashboard Card"
       width="650">
</p>

The card can display information such as:

- Recipe name
- Date
- Number of servings
- Notes

> **Note:** The custom dashboard card is separate from the core InLeMa integration and is not automatically installed with the integration at this time.

---

## Secure OAuth2 Authentication

InLeMa uses **OAuth2 Authorization Code Flow with PKCE** to connect Home Assistant with your InLeMa account.

```text
Home Assistant
      │
      ▼
InLeMa OAuth Authorization
      │
      ▼
Sign in to InLeMa
      │
      ▼
Authorize Home Assistant
      │
      ▼
OAuth Token
      │
      ▼
InLeMa data in Home Assistant
```

### Why OAuth2?

Your InLeMa credentials stay with InLeMa.

Home Assistant does **not** receive your InLeMa password.

After you authorize the connection, Home Assistant receives an OAuth authorization token instead.

---

# Installation
## Before you start: Create an InLeMa account

A free **InLeMa account is required** to connect InLeMa with Home Assistant.

If you do not already have an InLeMa account, visit:

**[www.inlema.de](https://www.inlema.de)**

Create an account and confirm your email address before continuing with the Home Assistant installation.

> **Important:** InLeMa itself can be used without an account for basic local functionality. However, an account is required for the **Home Assistant integration**, because Home Assistant accesses your InLeMa data through the authenticated InLeMa connection.

Once your InLeMa account is ready, continue with the installation below.

---
## ~~HACS~~

*HACS publication in progress.*

InLeMa has been submitted for inclusion in the default HACS repository.

Until InLeMa is available directly through HACS, please use the manual installation method below.

---

## Manual Installation

The following instructions describe the complete installation process.

### 1. Download InLeMa

Download the InLeMa Home Assistant integration from this GitHub repository.

At the top of this repository, select:

**Code → Download ZIP**

GitHub will download the complete repository as a ZIP file.

---

### 2. Extract the ZIP file

Extract the downloaded ZIP file to a location on your Windows PC or Mac.

Inside the extracted repository you will find:

```text
custom_components/
└── inlema/
```

The `inlema` folder contains the Home Assistant integration.

---

### 3. Install Samba Share in Home Assistant

To copy the integration to Home Assistant, you need access to the Home Assistant file system.

In the Home Assistant web interface, open:

**Settings → Apps → App Store**

Search for:

**Samba share**

Install the **Samba share** app.

---

### 4. Configure Samba Share

Open the **Configuration** page of the Samba share app.

Configure a username and password that you will use to access Home Assistant from your computer.

Save the configuration and start Samba share.

---

### 5. Connect your computer to Home Assistant

You can now access your Home Assistant file system from your Windows PC or Mac.

#### Windows

Open the Windows **Start menu**, enter:

```text
cmd
```

and open the Command Prompt.

You can then connect to your Home Assistant Samba share.

For example, if your Home Assistant IP address is `192.168.1.100`, open:

```text
\\192.168.1.100\config
```

Replace `192.168.1.100` with the IP address of your own Home Assistant installation.

Windows will ask for the username and password configured in Samba share.

#### macOS

Open **Finder** and select:

**Go → Connect to Server**

Enter:

```text
smb://192.168.1.100/config
```

Replace `192.168.1.100` with the IP address of your own Home Assistant installation.

Enter the username and password configured in Samba share when prompted.

After connecting, you can access the Home Assistant files directly from your computer.

---

### 6. Copy the InLeMa integration

On your computer, open the extracted InLeMa repository.

Navigate to:

```text
custom_components/
```

Inside this directory you will find:

```text
inlema/
```

Now open the existing Home Assistant directory:

```text
custom_components/
```

Copy the complete **`inlema`** folder from the downloaded repository into the Home Assistant `custom_components` directory.

The resulting structure should look like this:

```text
custom_components/
└── inlema/
    ├── __init__.py
    ├── application_credentials.py
    ├── config_flow.py
    ├── const.py
    ├── manifest.json
    ├── sensor.py
    ├── strings.json
    └── brand/
        ├── icon.png
        └── icon@2x.png
```

> **Important:** Do not copy the downloaded `custom_components` folder itself into the existing Home Assistant `custom_components` folder.

This is **wrong**:

```text
custom_components/
└── custom_components/
    └── inlema/
```

This is **correct**:

```text
custom_components/
└── inlema/
```

---

### 7. Restart Home Assistant

After copying the `inlema` folder, restart Home Assistant so that the new integration can be detected.

In the Home Assistant web interface, open:

**Settings → System**

Open the menu in the **top-right corner** and select:

**Restart Home Assistant**

Wait until Home Assistant has completely restarted.

---

### 8. Add the InLeMa integration

After the restart, open:

**Settings → Devices & services**

Select:

**Add Integration**

Search for:

```text
InLeMa
```

If the installation was successful, **InLeMa** will appear in the list of available integrations.

Select **InLeMa**.

---

### 9. Add the InLeMa OAuth credentials

During the first setup, Home Assistant will ask you to add OAuth credentials for InLeMa.

Enter the following values:

```text
Name:
InLeMa

OAuth Client ID:
25eefd5b-9f3c-4176-bd2d-1aede5e8d75f

OAuth Client Secret:
unused
```

Then select **Add**.

#### Why is the Client Secret `unused`?

InLeMa uses a **public OAuth2 client with PKCE**.

A public PKCE client does not use a traditional client secret. However, Home Assistant currently requires a value in the Client Secret field when manually adding the application credentials.

For this reason, enter:

```text
unused
```

This is only a placeholder required by the Home Assistant configuration interface.

**It is not an InLeMa password or secret and is not used by the InLeMa integration for authentication.**

---

### 10. Connect your InLeMa account

After adding the OAuth credentials, Home Assistant starts the InLeMa account linking process.

You will be redirected to InLeMa.

If you are not currently signed in to InLeMa, sign in with your InLeMa account.

You will then be asked to authorize Home Assistant to access the required InLeMa data.

Approve the connection.

The authorization process is:

```text
Home Assistant
      │
      ▼
InLeMa OAuth login
      │
      ▼
Sign in to your InLeMa account
      │
      ▼
Authorize Home Assistant
      │
      ▼
Return to Home Assistant
```

Your InLeMa password is entered only on the InLeMa authentication page and is never provided to Home Assistant.

---

### 11. Installation complete

After successful authorization, you will be returned to Home Assistant.

The InLeMa integration should now appear under:

**Settings → Devices & services**

The integration automatically creates the Home Assistant entity for your next planned InLeMa meal.

You can now use the entity in:

- Dashboards
- Automations
- Templates
- Scripts
- Other Home Assistant integrations

---

## Requirements

To use InLeMa for Home Assistant you need:

- Home Assistant
- An InLeMa account
- Internet access
- Meal planner data available through your InLeMa account

---

## Languages

InLeMa recipe names currently support localized translations for:

| Language | Recipe translation |
|---|:---:|
| 🇩🇪 German | ✅ |
| 🇬🇧 English | ✅ |
| 🇷🇺 Russian | ✅ |

Recipe names from the InLeMa standard recipe library can be displayed using localized translations.

Custom user-created recipes retain their individual names.

If the Home Assistant language is not currently supported by the InLeMa recipe translations, the integration uses a fallback language.

---

## Privacy & Security

Privacy and account security are important parts of the InLeMa integration.

- Authentication uses **OAuth2 with PKCE**
- Home Assistant does **not** receive your InLeMa password
- The OAuth client is a **public client**
- No OAuth client secret is required by InLeMa
- Access is associated with the authenticated InLeMa account
- Only data required by the integration is requested and processed
- User-specific InLeMa data is protected by the authenticated connection

The value `unused` entered during manual OAuth configuration is only a placeholder for the Home Assistant application credentials interface and is not used as an authentication secret.

---

## Current Scope

The current version focuses on the **InLeMa Meal Planner**.

```text
InLeMa
│
└── Meal Planner
    │
    └── Next planned meal
        ├── Recipe name
        ├── Date
        ├── Servings
        └── Notes
```

This provides the foundation for bringing additional InLeMa functionality into Home Assistant in future versions.

---

## Planned Features

Potential future additions include:

- Upcoming meals
- Today's meal
- Additional meal planner entities
- Home Assistant calendar support
- Shopping list integration
- Pantry / stock entities
- Additional dashboard cards
- Home Assistant services and actions

---

## Repository Structure

```text
inlema-home-assistant/
│
├── .github/
│
├── assets/
│   ├── Dashboard_Card.png
│   ├── InLeMa_Banner.png
│   └── logo.png
│
├── custom_components/
│   └── inlema/
│       ├── brand/
│       │   ├── icon.png
│       │   └── icon@2x.png
│       ├── __init__.py
│       ├── application_credentials.py
│       ├── config_flow.py
│       ├── const.py
│       ├── manifest.json
│       ├── sensor.py
│       └── strings.json
│
├── .gitignore
├── hacs.json
├── LICENSE
└── README.md
```

---

## Support

Found a bug or have an idea for the integration?

Please use the **Issues** section of this repository for bug reports and feature requests.

For more information about InLeMa, visit:

**[www.inlema.de](https://www.inlema.de)**

---

## About InLeMa

**InLeMa** helps organize recipes, meal planning, shopping lists and pantry management in one place.

The Home Assistant integration connects your InLeMa meal planning data with your smart home.

<p align="center">
  <a href="https://www.inlema.de">
    <strong>Visit InLeMa →</strong>
  </a>
</p>

---

## Disclaimer

InLeMa for Home Assistant is a third-party integration for connecting **InLeMa** with **Home Assistant**.

Home Assistant is a trademark of the Open Home Foundation.

This project is not part of the official **Works with Home Assistant** certification program.

---

<p align="center">
  <img src="assets/logo.png" alt="InLeMa Logo" width="90">
</p>

<p align="center">
  <strong>InLeMa</strong><br>
  <sub>Meal planning for your smart home.</sub>
</p>
