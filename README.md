<p align="center">
  <img src="assets/inlema-logo.png" alt="InLeMa" width="120">
</p>


<h1 align="center">InLeMa for Home Assistant</h1>


<p align="center">
  Bring your InLeMa meal planner into your smart home.
</p>


<p align="center">
  <strong>OAuth2 · Meal Planner · Home Assistant Sensor · Dashboard Card</strong>
</p>


---


## About


**InLeMa for Home Assistant** connects your InLeMa account with Home Assistant.


The integration brings your meal planning data directly into your smart home and makes the next planned meal available as a Home Assistant entity.


Your InLeMa account is connected securely using **OAuth2**. Home Assistant does not receive or store your InLeMa password.


---


## Features


- Secure account linking using **OAuth2**
- Access to the user's InLeMa meal planner
- Displays the **next planned meal**
- Recipe names localized for supported languages
- Meal date
- Servings
- Notes
- Native Home Assistant sensor
- Optional custom InLeMa dashboard card
- Works with Home Assistant automations, templates and dashboards


---


## Entity


The integration currently creates the following entity:


```text
sensor.nachste_mahlzeit

Example:

State:
Chicken Tikka Masala


Attributes:
date: 2026-08-18
servings: 2
notes: Dinner with friends

The state of the sensor contains the name of the next planned meal.

Additional meal information is exposed through sensor attributes.

Dashboard Card

InLeMa also provides an optional custom dashboard card for Home Assistant.

Example:

┌────────────────────────────────────┐
│ InLeMa                       Today │
│                                    │
│ NEXT MEAL                          │
│ Chicken Tikka Masala               │
│                                    │
│ 18 August · 2 servings             │
└────────────────────────────────────┘

The card automatically uses the entity:

sensor.nachste_mahlzeit

and follows the Home Assistant light and dark theme.

Authentication

InLeMa uses OAuth2 account linking.

The connection flow works like this:

Home Assistant
      │
      ▼
InLeMa OAuth authorization
      │
      ▼
User signs in to InLeMa
      │
      ▼
User authorizes Home Assistant
      │
      ▼
Home Assistant receives an OAuth token
      │
      ▼
InLeMa data becomes available in Home Assistant

Your InLeMa password is entered only on the InLeMa website.

Home Assistant receives an authorization token instead of your password.

Installation
HACS

HACS installation will be available once the integration is published.

After installation:

Restart Home Assistant.
Open Settings → Devices & services.
Select Add Integration.
Search for InLeMa.
Start the account linking process.
Sign in with your InLeMa account.
Authorize Home Assistant.

After successful authorization, the InLeMa entities will appear automatically.

Manual installation

For development and testing, copy:

custom_components/inlema

to:

/config/custom_components/inlema

or, depending on your Home Assistant installation:

/homeassistant/custom_components/inlema

Restart Home Assistant afterwards.

Requirements

You need:

Home Assistant
An InLeMa account
Internet access
Cloud synchronization enabled for the relevant InLeMa data
Languages

The integration is designed to support:

German
English
Russian

Recipe names from InLeMa's standard recipe library can be displayed using localized translations.

Custom user recipes keep their individual recipe names.

Privacy

InLeMa only exposes the data required by the integration.

Authentication is handled through OAuth2.

Home Assistant does not receive your InLeMa password.

Access to user-specific InLeMa data is protected by the authenticated account connection.

Current scope

The first version focuses on the InLeMa Meal Planner.

Current Home Assistant functionality:

Meal Planner
└── Next planned meal
    ├── Recipe name
    ├── Date
    ├── Servings
    └── Notes

Additional InLeMa features may be added in future versions.

Planned features

Possible future additions include:

More meal planner entities
Upcoming meals
Today's meal
Meal planner calendar support
Shopping list integration
Pantry / stock entities
Additional dashboard cards
Home Assistant services and actions
Repository structure
inlema-home-assistant/
│
├── custom_components/
│   └── inlema/
│       ├── __init__.py
│       ├── application_credentials.py
│       ├── config_flow.py
│       ├── const.py
│       ├── manifest.json
│       ├── sensor.py
│       └── strings.json
│
├── README.md
├── hacs.json
├── LICENSE
└── .gitignore
Support

If you find a bug or have a feature request, please open an issue in this repository.

For information about InLeMa:

https://www.inlema.de

Disclaimer

This is an integration for connecting InLeMa with Home Assistant.

Home Assistant is a trademark of the Open Home Foundation.

This project is not part of the official Home Assistant "Works with Home Assistant" certification program.
