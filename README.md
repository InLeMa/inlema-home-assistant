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
