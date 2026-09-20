class InLeMaCard extends HTMLElement {
  setConfig(config) {
    this.config = config || {};
  }

  set hass(hass) {
    this._hass = hass;

    if (!this._registryLoaded && !this._registryLoading) {
      this._loadEntityRegistry();
    }

    // Einen geöffneten InLeMa-Dialog nicht durch
    // Home-Assistant-State-Updates zerstören.
    if (this.querySelector(".inlema-overlay")) {
      return;
    }

    this.render();
  }

  getCardSize() {
    return 5;
  }

  static getStubConfig() {
    return {};
  }

  async _loadEntityRegistry() {
    if (!this._hass) return;

    this._registryLoading = true;

    try {
      const entities = await this._hass.callWS({
        type: "config/entity_registry/list",
      });

      this._inlemaEntities = entities.filter(
        (entity) => entity.platform === "inlema"
      );

      this._registryLoaded = true;
    } catch (error) {
      console.error(
        "InLeMa Card: Entitätsregister konnte nicht geladen werden.",
        error
      );

      this._inlemaEntities = [];
    } finally {
      this._registryLoading = false;

      if (!this.querySelector(".inlema-overlay")) {
        this.render();
      }
    }
  }

  _findEntity(domain, uniqueSuffix) {
    const entities = this._inlemaEntities || [];

    const entry = entities.find((entity) => {
      return (
        entity.entity_id.startsWith(`${domain}.`) &&
        entity.unique_id &&
        entity.unique_id.endsWith(uniqueSuffix)
      );
    });

    return entry?.entity_id || null;
  }

  _findTodoEntities() {
    const entities = this._inlemaEntities || [];

    return entities
      .filter((entity) => {
        return (
          entity.entity_id.startsWith("todo.") &&
          entity.unique_id &&
          entity.unique_id.includes("_shopping_list_")
        );
      })
      .map((entity) => entity.entity_id);
  }

  _formatDate(value) {
    if (!value) return "";

    const date = new Date(`${value}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    const today = new Date();

    const todayString =
      `${today.getFullYear()}-` +
      `${String(today.getMonth() + 1).padStart(2, "0")}-` +
      `${String(today.getDate()).padStart(2, "0")}`;

    if (value === todayString) {
      return "Heute";
    }

    return new Intl.DateTimeFormat(
      this._hass?.locale?.language || "de",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }
    ).format(date);
  }

  _openMoreInfo(entityId) {
    if (!entityId) return;

    this.dispatchEvent(
      new CustomEvent("hass-more-info", {
        detail: {
          entityId: entityId,
        },
        bubbles: true,
        composed: true,
      })
    );
  }

  _escapeHtml(value) {
    if (value === null || value === undefined) {
      return "";
    }

    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
  async _callServiceWithResponse(domain, service, serviceData = {}) {
    const result = await this._hass.callWS({
      type: "call_service",
      domain: domain,
      service: service,
      service_data: serviceData,
      return_response: true,
    });

    return result?.response ?? result;
  }

  _closeDialog() {
    const overlay = this.querySelector(".inlema-overlay");

    if (overlay) {
      overlay.remove();
    }
  }

  _showMessage(title, message) {
    this._closeDialog();

    const overlay = document.createElement("div");
    overlay.className = "inlema-overlay";

    overlay.innerHTML = `
      <div class="inlema-dialog small-dialog">
        <div class="dialog-header">
          <div class="dialog-title">
            ${this._escapeHtml(title)}
          </div>

          <button class="icon-button close-dialog">
            <ha-icon icon="mdi:close"></ha-icon>
          </button>
        </div>

        <div class="dialog-message">
          ${this._escapeHtml(message)}
        </div>

        <div class="dialog-footer">
          <button class="primary-button close-dialog">
            OK
          </button>
        </div>
      </div>
    `;

    this.appendChild(overlay);

    overlay
      .querySelectorAll(".close-dialog")
      .forEach((button) => {
        button.addEventListener(
          "click",
          () => this._closeDialog()
        );
      });
  }
  _openMealPlanner() {
    this._closeDialog();

    const overlay = document.createElement("div");
    overlay.className = "inlema-overlay";

    overlay.innerHTML = `
      <div class="inlema-dialog">

        <div class="dialog-header">
          <div>
            <div class="dialog-title">
              Mahlzeit planen
            </div>

            <div class="dialog-subtitle">
              Rezept auswählen
            </div>
          </div>

          <button class="icon-button close-dialog">
            <ha-icon icon="mdi:close"></ha-icon>
          </button>
        </div>

        <div class="search-box">
          <ha-icon icon="mdi:magnify"></ha-icon>

          <input
            class="recipe-search-input"
            type="text"
            placeholder="Rezept suchen …"
            autocomplete="off"
          >
        </div>

        <div class="search-status">
          Gib einen Rezeptnamen ein.
        </div>

        <div class="recipe-results"></div>

      </div>
    `;

    this.appendChild(overlay);

    const input =
      overlay.querySelector(".recipe-search-input");

    const status =
      overlay.querySelector(".search-status");

    const results =
      overlay.querySelector(".recipe-results");

    overlay
      .querySelector(".close-dialog")
      .addEventListener(
        "click",
        () => this._closeDialog()
      );

    overlay.addEventListener(
      "click",
      (event) => {
        if (event.target === overlay) {
          this._closeDialog();
        }
      }
    );

    let timer = null;
    let requestNumber = 0;

    const search = async () => {
      const query = input.value.trim();

      if (query.length < 2) {
        status.textContent =
          "Mindestens 2 Zeichen eingeben.";

        results.innerHTML = "";
        return;
      }

      const currentRequest =
        ++requestNumber;

      status.innerHTML = `
        <span class="loading-line">
          <ha-icon icon="mdi:loading"></ha-icon>
          Suche …
        </span>
      `;

      results.innerHTML = "";

      try {
        const response =
          await this._callServiceWithResponse(
            "inlema",
            "search_recipe",
            {
              query: query,
            }
          );

        if (
          currentRequest !== requestNumber
        ) {
          return;
        }

        const recipes =
          response?.recipes || [];

        if (!recipes.length) {
          status.textContent =
            "Keine Rezepte gefunden.";

          return;
        }

        status.textContent =
          `${recipes.length} ${
            recipes.length === 1
              ? "Rezept"
              : "Rezepte"
          } gefunden`;

        results.innerHTML =
          recipes
            .map((recipe) => {
              const meta = [];

              if (recipe.cuisine) {
                meta.push(recipe.cuisine);
              }

              if (recipe.category) {
                meta.push(recipe.category);
              }

              if (recipe.servings) {
                meta.push(
                  `${recipe.servings} Portionen`
                );
              }

              return `
                <button
                  class="recipe-result"
                  data-recipe-id="${this._escapeHtml(
                    recipe.id
                  )}"
                >

                  <div class="recipe-result-icon">
                    <ha-icon icon="mdi:food"></ha-icon>
                  </div>

                  <div class="recipe-result-info">
                    <div class="recipe-result-name">
                      ${this._escapeHtml(
                        recipe.name
                      )}
                    </div>

                    ${
                      meta.length
                        ? `
                          <div class="recipe-result-meta">
                            ${this._escapeHtml(
                              meta.join(" · ")
                            )}
                          </div>
                        `
                        : ""
                    }
                  </div>

                  <ha-icon
                    class="chevron"
                    icon="mdi:chevron-right"
                  ></ha-icon>

                </button>
              `;
            })
            .join("");

        results
          .querySelectorAll(".recipe-result")
          .forEach((button) => {
            button.addEventListener(
              "click",
              () => {
                const recipe =
                  recipes.find(
                    (item) =>
                      String(item.id) ===
                      button.dataset.recipeId
                  );

                if (recipe) {
                  this._openMealPlanForm(
                    recipe
                  );
                }
              }
            );
          });

      } catch (error) {
        console.error(
          "InLeMa Mahlzeitenplanung:",
          error
        );

        status.textContent =
          "Die Rezeptsuche ist fehlgeschlagen.";
      }
    };

    input.addEventListener(
      "input",
      () => {
        clearTimeout(timer);

        timer = setTimeout(
          search,
          350
        );
      }
    );

    input.addEventListener(
      "keydown",
      (event) => {
        if (event.key === "Enter") {
          clearTimeout(timer);
          search();
        }
      }
    );

    setTimeout(
      () => input.focus(),
      50
    );
  }

    _openShoppingRecipeSearch() {
    this._closeDialog();

    const overlay = document.createElement("div");
    overlay.className = "inlema-overlay";

    overlay.innerHTML = `
      <div class="inlema-dialog">

        <div class="dialog-header">
          <div>
            <div class="dialog-title">
              Zutaten für Rezept einkaufen
            </div>

            <div class="dialog-subtitle">
              Rezept auswählen
            </div>
          </div>

          <button class="icon-button close-dialog">
            <ha-icon icon="mdi:close"></ha-icon>
          </button>
        </div>

        <div class="search-box">
          <ha-icon icon="mdi:magnify"></ha-icon>

          <input
            class="recipe-search-input"
            type="text"
            placeholder="Rezept suchen …"
            autocomplete="off"
          >
        </div>

        <div class="search-status">
          Gib einen Rezeptnamen ein.
        </div>

        <div class="recipe-results"></div>

      </div>
    `;

    this.appendChild(overlay);

    const input =
      overlay.querySelector(".recipe-search-input");

    const status =
      overlay.querySelector(".search-status");

    const results =
      overlay.querySelector(".recipe-results");

    overlay
      .querySelector(".close-dialog")
      .addEventListener(
        "click",
        () => this._closeDialog()
      );

    overlay.addEventListener(
      "click",
      (event) => {
        if (event.target === overlay) {
          this._closeDialog();
        }
      }
    );

    let timer = null;
    let requestNumber = 0;

    const search = async () => {
      const query = input.value.trim();

      if (query.length < 2) {
        status.textContent =
          "Mindestens 2 Zeichen eingeben.";

        results.innerHTML = "";
        return;
      }

      const currentRequest =
        ++requestNumber;

      status.innerHTML = `
        <span class="loading-line">
          <ha-icon icon="mdi:loading"></ha-icon>
          Suche …
        </span>
      `;

      results.innerHTML = "";

      try {
        const response =
          await this._callServiceWithResponse(
            "inlema",
            "search_recipe",
            {
              query: query,
            }
          );

        if (
          currentRequest !== requestNumber
        ) {
          return;
        }

        const recipes =
          response?.recipes || [];

        if (!recipes.length) {
          status.textContent =
            "Keine Rezepte gefunden.";

          return;
        }

        status.textContent =
          `${recipes.length} ${
            recipes.length === 1
              ? "Rezept"
              : "Rezepte"
          } gefunden`;

        results.innerHTML =
          recipes
            .map((recipe) => {
              const meta = [];

              if (recipe.cuisine) {
                meta.push(recipe.cuisine);
              }

              if (recipe.category) {
                meta.push(recipe.category);
              }

              if (recipe.servings) {
                meta.push(
                  `${recipe.servings} Portionen`
                );
              }

              return `
                <button
                  class="recipe-result"
                  data-recipe-id="${this._escapeHtml(
                    recipe.id
                  )}"
                >

                  <div class="recipe-result-icon">
                    <ha-icon
                      icon="mdi:food"
                    ></ha-icon>
                  </div>

                  <div class="recipe-result-info">

                    <div class="recipe-result-name">
                      ${this._escapeHtml(
                        recipe.name
                      )}
                    </div>

                    ${
                      meta.length
                        ? `
                          <div class="recipe-result-meta">
                            ${this._escapeHtml(
                              meta.join(" · ")
                            )}
                          </div>
                        `
                        : ""
                    }

                  </div>

                  <ha-icon
                    class="chevron"
                    icon="mdi:chevron-right"
                  ></ha-icon>

                </button>
              `;
            })
            .join("");

        results
          .querySelectorAll(".recipe-result")
          .forEach((button) => {
            button.addEventListener(
              "click",
              () => {
                const recipe =
                  recipes.find(
                    (item) =>
                      String(item.id) ===
                      button.dataset.recipeId
                  );

                if (recipe) {
                  this._openShoppingForm(
                    recipe
                  );
                }
              }
            );
          });

      } catch (error) {
        console.error(
          "InLeMa Zutaten einkaufen:",
          error
        );

        status.textContent =
          "Die Rezeptsuche ist fehlgeschlagen.";
      }
    };

    input.addEventListener(
      "input",
      () => {
        clearTimeout(timer);

        timer = setTimeout(
          search,
          350
        );
      }
    );

    input.addEventListener(
      "keydown",
      (event) => {
        if (event.key === "Enter") {
          clearTimeout(timer);
          search();
        }
      }
    );

    setTimeout(
      () => input.focus(),
      50
    );
  }

    _openShoppingForm(recipe) {
    this._closeDialog();

    const todoIds = this._findTodoEntities();

    const lists = todoIds
      .map((entityId) => {
        const entity =
          this._hass.states[entityId];

        const registryEntry =
          (this._inlemaEntities || [])
            .find(
              (item) =>
                item.entity_id === entityId
            );

        if (!entity || !registryEntry) {
          return null;
        }

        const marker =
          "_shopping_list_";

        const position =
          registryEntry.unique_id
            ?.indexOf(marker);

        if (
          position === undefined ||
          position < 0
        ) {
          return null;
        }

        const listId =
          registryEntry.unique_id.substring(
            position + marker.length
          );

        return {
          id: listId,
          entityId: entityId,
          name:
            entity.attributes.friendly_name ||
            "Einkaufsliste",
          count:
            entity.state !== "unknown" &&
            entity.state !== "unavailable"
              ? entity.state
              : "–",
        };
      })
      .filter(Boolean);

    const defaultServings =
      Number(recipe.servings) > 0
        ? Number(recipe.servings)
        : 1;

    const overlay =
      document.createElement("div");

    overlay.className =
      "inlema-overlay";

    overlay.innerHTML = `
      <div class="inlema-dialog small-dialog">

        <div class="dialog-header">

          <div>
            <div class="dialog-title">
              Zutaten einkaufen
            </div>

            <div class="dialog-subtitle">
              ${this._escapeHtml(recipe.name)}
            </div>
          </div>

          <button class="icon-button close-dialog">
            <ha-icon icon="mdi:close"></ha-icon>
          </button>

        </div>


        <div class="plan-form">

          <div class="selected-recipe">

            <div class="recipe-result-icon">
              <ha-icon
                icon="mdi:food"
              ></ha-icon>
            </div>

            <div class="selected-recipe-info">

              <div class="selected-recipe-name">
                ${this._escapeHtml(
                  recipe.name
                )}
              </div>

              ${
                recipe.servings
                  ? `
                    <div class="secondary">
                      Rezept für
                      ${this._escapeHtml(
                        recipe.servings
                      )}
                      Portionen
                    </div>
                  `
                  : ""
              }

            </div>

          </div>


          <label class="form-field">

            <span class="form-label">
              Portionen
            </span>

            <div class="servings-control">

              <button
                type="button"
                class="serving-button serving-minus"
              >
                <ha-icon icon="mdi:minus"></ha-icon>
              </button>

              <input
                class="form-input servings-input"
                type="number"
                min="1"
                max="100"
                step="1"
                value="${defaultServings}"
              >

              <button
                type="button"
                class="serving-button serving-plus"
              >
                <ha-icon icon="mdi:plus"></ha-icon>
              </button>

            </div>

          </label>


          <div class="form-field">

            <span class="form-label">
              Einkaufsliste
            </span>

            <div class="shopping-list-options">

              ${
                lists.length
                  ? lists
                      .map(
                        (list, index) => `
                          <label
                            class="shopping-list-option"
                          >

                            <input
                              type="radio"
                              name="inlema-shopping-list"
                              value="${this._escapeHtml(
                                list.id
                              )}"
                              ${
                                index === 0
                                  ? "checked"
                                  : ""
                              }
                            >

                            <span
                              class="shopping-list-radio"
                            ></span>

                            <ha-icon
                              icon="mdi:cart-outline"
                            ></ha-icon>

                            <span
                              class="shopping-list-info"
                            >
                              <strong>
                                ${this._escapeHtml(
                                  list.name
                                )}
                              </strong>

                              <small>
                                ${this._escapeHtml(
                                  list.count
                                )}
                                offen
                              </small>
                            </span>

                          </label>
                        `
                      )
                      .join("")
                  : `
                    <div class="empty">
                      Keine InLeMa-Einkaufsliste
                      verfügbar.
                    </div>
                  `
              }

            </div>

          </div>


          <div
            class="plan-error"
            hidden
          ></div>

        </div>


        <div class="dialog-footer">

          <button
            class="secondary-button change-recipe"
          >
            <ha-icon
              icon="mdi:arrow-left"
            ></ha-icon>
            Anderes Rezept
          </button>

          <button
            class="primary-button add-shopping"
            ${lists.length ? "" : "disabled"}
          >
            <ha-icon
              icon="mdi:cart-plus"
            ></ha-icon>
            Hinzufügen
          </button>

        </div>

      </div>
    `;

    this.appendChild(overlay);

    const servingsInput =
      overlay.querySelector(
        ".servings-input"
      );

    const addButton =
      overlay.querySelector(
        ".add-shopping"
      );

    const errorBox =
      overlay.querySelector(
        ".plan-error"
      );

    overlay
      .querySelector(".close-dialog")
      .addEventListener(
        "click",
        () => this._closeDialog()
      );

    overlay
      .querySelector(".change-recipe")
      .addEventListener(
        "click",
        () =>
          this._openShoppingRecipeSearch()
      );

    overlay
      .querySelector(".serving-minus")
      .addEventListener(
        "click",
        () => {
          const current =
            Number(servingsInput.value) || 1;

          servingsInput.value =
            Math.max(1, current - 1);
        }
      );

    overlay
      .querySelector(".serving-plus")
      .addEventListener(
        "click",
        () => {
          const current =
            Number(servingsInput.value) || 1;

          servingsInput.value =
            Math.min(100, current + 1);
        }
      );

    overlay.addEventListener(
      "click",
      (event) => {
        if (event.target === overlay) {
          this._closeDialog();
        }
      }
    );

    if (!addButton) {
      return;
    }

    addButton.addEventListener(
      "click",
      async () => {
        const servings =
          Number(servingsInput.value);

        const selectedList =
          overlay.querySelector(
            'input[name="inlema-shopping-list"]:checked'
          );

        if (
          !Number.isInteger(servings) ||
          servings < 1
        ) {
          errorBox.hidden = false;
          errorBox.textContent =
            "Bitte eine gültige Portionszahl eingeben.";
          return;
        }

        if (!selectedList) {
          errorBox.hidden = false;
          errorBox.textContent =
            "Bitte eine Einkaufsliste auswählen.";
          return;
        }

        errorBox.hidden = true;

        addButton.disabled = true;

        addButton.innerHTML = `
          <ha-icon
            class="spin"
            icon="mdi:loading"
          ></ha-icon>
          Wird hinzugefügt …
        `;

        try {
          const response =
            await this._callServiceWithResponse(
              "inlema",
              "add_recipe_to_shopping_list",
              {
                recipe_id: recipe.id,
                shopping_list_id:
                  selectedList.value,
                servings: servings,
              }
            );

          if (!response?.success) {
            throw new Error(
              response?.error ||
              "shopping_failed"
            );
          }

          this._closeDialog();

          this._showShoppingSuccess(
            recipe,
            response
          );

        } catch (error) {
          console.error(
            "InLeMa Zutaten einkaufen:",
            error
          );

          errorBox.hidden = false;

          errorBox.textContent =
            "Die Zutaten konnten nicht hinzugefügt werden.";

          addButton.disabled = false;

          addButton.innerHTML = `
            <ha-icon icon="mdi:cart-plus"></ha-icon>
            Hinzufügen
          `;
        }
      }
    );
  }

    _showShoppingSuccess(
    recipe,
    response
  ) {
    this._closeDialog();

    const overlay =
      document.createElement("div");

    overlay.className =
      "inlema-overlay";

    const added =
      response?.added_count ?? 0;

    const listName =
      response?.shopping_list_name ||
      "Einkaufsliste";

    overlay.innerHTML = `
      <div class="inlema-dialog small-dialog">

        <div class="dialog-header">

          <div class="dialog-title">
            Zutaten hinzugefügt
          </div>

          <button class="icon-button close-dialog">
            <ha-icon icon="mdi:close"></ha-icon>
          </button>

        </div>


        <div class="success-content">

          <div class="success-icon">
            <ha-icon
              icon="mdi:check"
            ></ha-icon>
          </div>

          <div class="success-name">
            ${this._escapeHtml(
              recipe.name
            )}
          </div>

          <div class="secondary">
            ${this._escapeHtml(added)}
            ${
              Number(added) === 1
                ? "Zutat"
                : "Zutaten"
            }
            zu
            „${this._escapeHtml(
              listName
            )}“
            hinzugefügt.
          </div>

        </div>


        <div class="dialog-footer">

          <button
            class="primary-button close-dialog"
          >
            Fertig
          </button>

        </div>

      </div>
    `;

    this.appendChild(overlay);

    overlay
      .querySelectorAll(".close-dialog")
      .forEach((button) => {
        button.addEventListener(
          "click",
          () => {
            this._closeDialog();

            this.render();
          }
        );
      });
  }


    _openMealPlanForm(recipe) {
    this._closeDialog();

    const overlay = document.createElement("div");
    overlay.className = "inlema-overlay";

    const today = new Date();

    const localToday =
      `${today.getFullYear()}-` +
      `${String(today.getMonth() + 1).padStart(2, "0")}-` +
      `${String(today.getDate()).padStart(2, "0")}`;

    const defaultServings =
      Number(recipe.servings) > 0
        ? Number(recipe.servings)
        : 1;

    overlay.innerHTML = `
      <div class="inlema-dialog small-dialog">

        <div class="dialog-header">
          <div>
            <div class="dialog-title">
              Mahlzeit planen
            </div>

            <div class="dialog-subtitle">
              ${this._escapeHtml(recipe.name)}
            </div>
          </div>

          <button class="icon-button close-dialog">
            <ha-icon icon="mdi:close"></ha-icon>
          </button>
        </div>


        <div class="plan-form">

          <div class="selected-recipe">

            <div class="recipe-result-icon">
              <ha-icon icon="mdi:food"></ha-icon>
            </div>

            <div class="selected-recipe-info">
              <div class="selected-recipe-name">
                ${this._escapeHtml(recipe.name)}
              </div>

              ${
                recipe.servings
                  ? `
                    <div class="secondary">
                      Rezept für
                      ${this._escapeHtml(recipe.servings)}
                      Portionen
                    </div>
                  `
                  : ""
              }
            </div>

          </div>


          <label class="form-field">

            <span class="form-label">
              Datum
            </span>

            <input
              class="form-input meal-date"
              type="date"
              value="${localToday}"
            >

          </label>


          <label class="form-field">

            <span class="form-label">
              Portionen
            </span>

            <div class="servings-control">

              <button
                type="button"
                class="serving-button serving-minus"
              >
                <ha-icon icon="mdi:minus"></ha-icon>
              </button>

              <input
                class="form-input servings-input"
                type="number"
                min="1"
                max="100"
                step="1"
                value="${defaultServings}"
              >

              <button
                type="button"
                class="serving-button serving-plus"
              >
                <ha-icon icon="mdi:plus"></ha-icon>
              </button>

            </div>

          </label>


          <div
            class="plan-error"
            hidden
          ></div>

        </div>


        <div class="dialog-footer">

          <button
            class="secondary-button change-recipe"
          >
            <ha-icon icon="mdi:arrow-left"></ha-icon>
            Anderes Rezept
          </button>

          <button
            class="primary-button save-meal"
          >
            <ha-icon icon="mdi:calendar-plus"></ha-icon>
            Planen
          </button>

        </div>

      </div>
    `;

    this.appendChild(overlay);

    const dateInput =
      overlay.querySelector(".meal-date");

    const servingsInput =
      overlay.querySelector(".servings-input");

    const saveButton =
      overlay.querySelector(".save-meal");

    const errorBox =
      overlay.querySelector(".plan-error");

    overlay
      .querySelector(".close-dialog")
      .addEventListener(
        "click",
        () => this._closeDialog()
      );

    overlay
      .querySelector(".change-recipe")
      .addEventListener(
        "click",
        () => this._openMealPlanner()
      );

    overlay
      .querySelector(".serving-minus")
      .addEventListener(
        "click",
        () => {
          const current =
            Number(servingsInput.value) || 1;

          servingsInput.value =
            Math.max(1, current - 1);
        }
      );

    overlay
      .querySelector(".serving-plus")
      .addEventListener(
        "click",
        () => {
          const current =
            Number(servingsInput.value) || 1;

          servingsInput.value =
            Math.min(100, current + 1);
        }
      );

    overlay.addEventListener(
      "click",
      (event) => {
        if (event.target === overlay) {
          this._closeDialog();
        }
      }
    );

    saveButton.addEventListener(
      "click",
      async () => {
        const date =
          dateInput.value;

        const servings =
          Number(servingsInput.value);

        if (!date) {
          errorBox.hidden = false;
          errorBox.textContent =
            "Bitte ein Datum auswählen.";
          return;
        }

        if (
          !Number.isInteger(servings) ||
          servings < 1
        ) {
          errorBox.hidden = false;
          errorBox.textContent =
            "Bitte eine gültige Portionszahl eingeben.";
          return;
        }

        errorBox.hidden = true;

        saveButton.disabled = true;

        saveButton.innerHTML = `
          <ha-icon
            class="spin"
            icon="mdi:loading"
          ></ha-icon>
          Wird geplant …
        `;

        try {
          const response =
            await this._callServiceWithResponse(
              "inlema",
              "plan_meal",
              {
                recipe_id: recipe.id,
                date: date,
                servings: servings,
              }
            );

          if (!response?.success) {
            throw new Error(
              response?.error ||
              "meal_plan_failed"
            );
          }

          this._closeDialog();

          this._showMealPlanSuccess(
            recipe,
            date,
            servings
          );

        } catch (error) {
          console.error(
            "InLeMa Mahlzeit planen:",
            error
          );

          errorBox.hidden = false;
          errorBox.textContent =
            "Die Mahlzeit konnte nicht geplant werden.";

          saveButton.disabled = false;

          saveButton.innerHTML = `
            <ha-icon icon="mdi:calendar-plus"></ha-icon>
            Planen
          `;
        }
      }
    );
  }
    _showMealPlanSuccess(
    recipe,
    date,
    servings
  ) {
    this._closeDialog();

    const overlay = document.createElement("div");
    overlay.className = "inlema-overlay";

    overlay.innerHTML = `
      <div class="inlema-dialog small-dialog">

        <div class="dialog-header">
          <div class="dialog-title">
            Mahlzeit geplant
          </div>

          <button class="icon-button close-dialog">
            <ha-icon icon="mdi:close"></ha-icon>
          </button>
        </div>


        <div class="success-content">

          <div class="success-icon">
            <ha-icon
              icon="mdi:check"
            ></ha-icon>
          </div>

          <div class="success-name">
            ${this._escapeHtml(recipe.name)}
          </div>

          <div class="secondary">
            ${this._escapeHtml(
              this._formatDate(date)
            )}
            ·
            ${this._escapeHtml(servings)}
            ${
              Number(servings) === 1
                ? "Portion"
                : "Portionen"
            }
          </div>

        </div>


        <div class="dialog-footer">

          <button
            class="primary-button close-dialog"
          >
            Fertig
          </button>

        </div>

      </div>
    `;

    this.appendChild(overlay);

    overlay
      .querySelectorAll(".close-dialog")
      .forEach((button) => {
        button.addEventListener(
          "click",
          () => {
            this._closeDialog();

            // Hauptkarte anschließend mit
            // aktuellen HA-Daten neu zeichnen.
            this.render();
          }
        );
      });
  }
  _openRecipeSearch() {
    this._closeDialog();

    const overlay = document.createElement("div");
    overlay.className = "inlema-overlay";

    overlay.innerHTML = `
      <div class="inlema-dialog">

        <div class="dialog-header">

          <div>
            <div class="dialog-title">
              Rezept kochen
            </div>

            <div class="dialog-subtitle">
              Wähle ein Rezept aus
            </div>
          </div>

          <button class="icon-button close-dialog">
            <ha-icon icon="mdi:close"></ha-icon>
          </button>

        </div>


        <div class="search-box">

          <ha-icon icon="mdi:magnify"></ha-icon>

          <input
            class="recipe-search-input"
            type="text"
            placeholder="Rezeptname …"
            autocomplete="off"
          >

        </div>


        <div class="search-status">
          Gib einen Rezeptnamen ein.
        </div>


        <div class="recipe-results"></div>

      </div>
    `;

    this.appendChild(overlay);

    const input =
      overlay.querySelector(
        ".recipe-search-input"
      );

    const status =
      overlay.querySelector(
        ".search-status"
      );

    const results =
      overlay.querySelector(
        ".recipe-results"
      );

    overlay
      .querySelector(".close-dialog")
      .addEventListener(
        "click",
        () => this._closeDialog()
      );

    overlay.addEventListener(
      "click",
      (event) => {
        if (event.target === overlay) {
          this._closeDialog();
        }
      }
    );

    let timer = null;
    let requestNumber = 0;

    const search = async () => {
      const query = input.value.trim();

      if (query.length < 2) {
        status.textContent =
          "Mindestens 2 Zeichen eingeben.";

        results.innerHTML = "";
        return;
      }

      const currentRequest =
        ++requestNumber;

      status.innerHTML = `
        <span class="loading-line">
          <ha-icon icon="mdi:loading"></ha-icon>
          Suche …
        </span>
      `;

      results.innerHTML = "";

      try {
        const response =
          await this._callServiceWithResponse(
            "inlema",
            "search_recipe",
            {
              query: query,
            }
          );

        if (
          currentRequest !== requestNumber
        ) {
          return;
        }

        const recipes =
          response?.recipes || [];

        if (!recipes.length) {
          status.textContent =
            "Keine Rezepte gefunden.";

          return;
        }

        status.textContent =
          `${recipes.length} ${
            recipes.length === 1
              ? "Rezept"
              : "Rezepte"
          } gefunden`;

        results.innerHTML =
          recipes
            .map((recipe) => {
              const meta = [];

              if (recipe.cuisine) {
                meta.push(recipe.cuisine);
              }

              if (recipe.category) {
                meta.push(recipe.category);
              }

              if (recipe.servings) {
                meta.push(
                  `${recipe.servings} Portionen`
                );
              }

              return `
                <button
                  class="recipe-result"
                  data-recipe-id="${this._escapeHtml(
                    recipe.id
                  )}"
                >

                  <div class="recipe-result-icon">
                    <ha-icon
                      icon="mdi:food"
                    ></ha-icon>
                  </div>

                  <div class="recipe-result-info">

                    <div class="recipe-result-name">
                      ${this._escapeHtml(
                        recipe.name
                      )}
                    </div>

                    ${
                      meta.length
                        ? `
                          <div class="recipe-result-meta">
                            ${this._escapeHtml(
                              meta.join(" · ")
                            )}
                          </div>
                        `
                        : ""
                    }

                  </div>

                </button>
              `;
            })
            .join("");

        results
          .querySelectorAll(
            ".recipe-result"
          )
          .forEach((button) => {
            button.addEventListener(
              "click",
              () => {
                const recipe =
                  recipes.find(
                    (item) =>
                      String(item.id) ===
                      button.dataset.recipeId
                  );

              if (recipe) {
                this._openCookingRecipe(
                  recipe
                );
              }
              }
            );
          });

      } catch (error) {
        console.error(
          "InLeMa Rezeptsuche:",
          error
        );

        status.textContent =
          "Die Rezeptsuche ist fehlgeschlagen.";
      }
    };

    input.addEventListener(
      "input",
      () => {
        clearTimeout(timer);

        timer = setTimeout(
          search,
          350
        );
      }
    );

    input.addEventListener(
      "keydown",
      (event) => {
        if (event.key === "Enter") {
          clearTimeout(timer);
          search();
        }
      }
    );

    setTimeout(
      () => input.focus(),
      50
    );
  }
  async _openCookingRecipe(recipe) {
    this._closeDialog();

    const overlay =
      document.createElement("div");

    overlay.className =
      "inlema-overlay";

    overlay.innerHTML = `
      <div class="inlema-dialog small-dialog">

        <div class="dialog-header">

          <div>
            <div class="dialog-title">
              Rezept wird geladen
            </div>

            <div class="dialog-subtitle">
              ${this._escapeHtml(recipe.name)}
            </div>
          </div>

          <button class="icon-button close-dialog">
            <ha-icon icon="mdi:close"></ha-icon>
          </button>

        </div>

        <div class="cooking-loading">
          <ha-icon
            class="spin"
            icon="mdi:loading"
          ></ha-icon>

          Rezept wird vorbereitet …
        </div>

      </div>
    `;

    this.appendChild(overlay);

    overlay
      .querySelector(".close-dialog")
      .addEventListener(
        "click",
        () => this._closeDialog()
      );

    try {
      const response =
        await this._callServiceWithResponse(
          "inlema",
          "get_recipe",
          {
            recipe_id: recipe.id,
          }
        );

      if (
        !response?.success ||
        !response?.recipe
      ) {
        throw new Error(
          response?.error ||
          "recipe_load_failed"
        );
      }

      this._showCookingOverview(
        response.recipe
      );

    } catch (error) {
      console.error(
        "InLeMa Rezept kochen:",
        error
      );

      this._showMessage(
        "Rezept konnte nicht geladen werden",
        "Das vollständige Rezept konnte nicht aus InLeMa geladen werden."
      );
    }
  }

  _showCookingOverview(recipe) {
  this._closeDialog();

  const overlay =
    document.createElement("div");

  overlay.className =
    "inlema-overlay";

  const steps =
    recipe.steps || [];

  const allIngredients =
    steps.flatMap(
      (step) => step.ingredients || []
    );

  const ingredientsHtml =
    allIngredients.length
      ? allIngredients
          .map((ingredient) => {
            const quantity =
              ingredient.quantity !== null &&
              ingredient.quantity !== undefined
                ? ingredient.quantity
                : "";

            const unit =
              ingredient.unit || "";

            return `
              <div class="cooking-ingredient">

                <span class="ingredient-amount">
                  ${this._escapeHtml(quantity)}
                  ${this._escapeHtml(unit)}
                </span>

                <span class="ingredient-name">
                  ${this._escapeHtml(
                    ingredient.name
                  )}
                </span>

              </div>
            `;
          })
          .join("")
      : `
          <div class="secondary">
            Keine Zutaten angegeben.
          </div>
        `;

  overlay.innerHTML = `
    <div class="inlema-dialog cooking-dialog">

      <div class="dialog-header">

        <div>
          <div class="dialog-title">
            ${this._escapeHtml(recipe.name)}
          </div>

          <div class="dialog-subtitle">
            ${this._escapeHtml(
              recipe.servings || "–"
            )}
            Portionen
            ·
            ${this._escapeHtml(
              recipe.step_count || steps.length
            )}
            Schritte
          </div>
        </div>

        <button class="icon-button close-dialog">
          <ha-icon icon="mdi:close"></ha-icon>
        </button>

      </div>

      ${
        recipe.image_url
          ? `
            <img
              class="cooking-recipe-image"
              src="${this._escapeHtml(
                recipe.image_url
              )}"
              alt="${this._escapeHtml(
                recipe.name
              )}"
            >
          `
          : ""
      }

      <div class="cooking-overview">

        ${
          recipe.description
            ? `
              <div class="cooking-description">
                ${this._escapeHtml(
                  recipe.description
                )}
              </div>
            `
            : ""
        }

        <div class="cooking-section-title">
          Zutaten
        </div>

        <div class="cooking-ingredients">
          ${ingredientsHtml}
        </div>

      </div>

      <div class="dialog-footer">

        <button
          class="secondary-button back-search"
        >
          <ha-icon icon="mdi:arrow-left"></ha-icon>
          Anderes Rezept
        </button>

        <button
          class="primary-button start-cooking"
          ${steps.length ? "" : "disabled"}
        >
          <ha-icon icon="mdi:chef-hat"></ha-icon>
          Kochen starten
        </button>

      </div>

    </div>
  `;

  this.appendChild(overlay);

  overlay
    .querySelector(".close-dialog")
    .addEventListener(
      "click",
      () => this._closeDialog()
    );

  overlay
    .querySelector(".back-search")
    .addEventListener(
      "click",
      () => this._openRecipeSearch()
    );

  const startButton =
    overlay.querySelector(
      ".start-cooking"
    );

  if (startButton && steps.length) {
    startButton.addEventListener(
      "click",
      () => {
        this._showCookingStep(
          recipe,
          0
        );
      }
    );
  }
}


  _showCookingStep(recipe, stepIndex) {
  this._closeDialog();

  const steps =
    recipe.steps || [];

  const step =
    steps[stepIndex];

  if (!step) {
    return;
  }

  const overlay =
    document.createElement("div");

  overlay.className =
    "inlema-overlay";

  const progress =
    ((stepIndex + 1) / steps.length) * 100;

  const ingredients =
    step.ingredients || [];

  const ingredientsHtml =
    ingredients.length
      ? `
        <div class="step-ingredients">

          <div class="step-ingredients-title">
            Für diesen Schritt
          </div>

          ${ingredients
            .map((ingredient) => `
              <div class="step-ingredient">

                <ha-icon
                  icon="mdi:circle-small"
                ></ha-icon>

                <span>
                  ${
                    ingredient.quantity !== null &&
                    ingredient.quantity !== undefined
                      ? this._escapeHtml(
                          ingredient.quantity
                        )
                      : ""
                  }
                  ${this._escapeHtml(
                    ingredient.unit || ""
                  )}
                  ${this._escapeHtml(
                    ingredient.name
                  )}
                </span>

              </div>
            `)
            .join("")}

        </div>
      `
      : "";

  const isLast =
    stepIndex === steps.length - 1;

  overlay.innerHTML = `
    <div class="inlema-dialog cooking-dialog">

      <div class="dialog-header">

        <div>
          <div class="dialog-title">
            ${this._escapeHtml(recipe.name)}
          </div>

          <div class="dialog-subtitle">
            Schritt ${stepIndex + 1}
            von ${steps.length}
          </div>
        </div>

        <button class="icon-button close-dialog">
          <ha-icon icon="mdi:close"></ha-icon>
        </button>

      </div>

      <div class="cooking-progress">
        <div
          class="cooking-progress-bar"
          style="width: ${progress}%"
        ></div>
      </div>

      <div class="cooking-step-content">

        <div class="cooking-step-title">
          ${this._escapeHtml(
            step.title || `Schritt ${stepIndex + 1}`
          )}
        </div>

        ${ingredientsHtml}

        <div class="cooking-instruction">
          ${this._escapeHtml(
            step.preparation || ""
          )}
        </div>

      </div>

      <div class="dialog-footer cooking-footer">

        ${
          stepIndex > 0
            ? `
              <button
                class="secondary-button previous-step"
              >
                <ha-icon
                  icon="mdi:arrow-left"
                ></ha-icon>
                Zurück
              </button>
            `
            : `
              <button
                class="secondary-button back-overview"
              >
                <ha-icon
                  icon="mdi:arrow-left"
                ></ha-icon>
                Übersicht
              </button>
            `
        }

        <button
          class="primary-button next-step"
        >
          ${
            isLast
              ? `
                <ha-icon icon="mdi:check"></ha-icon>
                Fertig
              `
              : `
                Weiter
                <ha-icon
                  icon="mdi:arrow-right"
                ></ha-icon>
              `
          }
        </button>

      </div>

    </div>
  `;

  this.appendChild(overlay);

  overlay
    .querySelector(".close-dialog")
    .addEventListener(
      "click",
      () => this._closeDialog()
    );

  const previousButton =
    overlay.querySelector(
      ".previous-step"
    );

  if (previousButton) {
    previousButton.addEventListener(
      "click",
      () => {
        this._showCookingStep(
          recipe,
          stepIndex - 1
        );
      }
    );
  }

  const overviewButton =
    overlay.querySelector(
      ".back-overview"
    );

  if (overviewButton) {
    overviewButton.addEventListener(
      "click",
      () => {
        this._showCookingOverview(
          recipe
        );
      }
    );
  }

  overlay
    .querySelector(".next-step")
    .addEventListener(
      "click",
      () => {
        if (isLast) {
          this._closeDialog();
          this.render();
          return;
        }

        this._showCookingStep(
          recipe,
          stepIndex + 1
        );
      }
    );
} 

  _showRecipeResult(recipe) {
    this._closeDialog();

    const overlay =
      document.createElement("div");

    overlay.className =
      "inlema-overlay";

    const meta = [];

    if (recipe.cuisine) {
      meta.push(recipe.cuisine);
    }

    if (recipe.category) {
      meta.push(recipe.category);
    }

    if (recipe.servings) {
      meta.push(
        `${recipe.servings} Portionen`
      );
    }

    overlay.innerHTML = `
      <div class="inlema-dialog small-dialog">

        <div class="dialog-header">

          <div class="dialog-title">
            ${this._escapeHtml(
              recipe.name
            )}
          </div>

          <button class="icon-button close-dialog">
            <ha-icon icon="mdi:close"></ha-icon>
          </button>

        </div>


        <div class="recipe-detail">

          <div class="recipe-detail-icon">
            <ha-icon
              icon="mdi:food"
            ></ha-icon>
          </div>

          ${
            meta.length
              ? `
                <div class="recipe-detail-meta">
                  ${this._escapeHtml(
                    meta.join(" · ")
                  )}
                </div>
              `
              : ""
          }

        </div>


        <div class="dialog-footer">

          <button
            class="secondary-button back-search"
          >
            <ha-icon
              icon="mdi:arrow-left"
            ></ha-icon>

            Zurück
          </button>

        </div>

      </div>
    `;

    this.appendChild(overlay);

    overlay
      .querySelector(".close-dialog")
      .addEventListener(
        "click",
        () => this._closeDialog()
      );

    overlay
      .querySelector(".back-search")
      .addEventListener(
        "click",
        () => this._openRecipeSearch()
      );

    overlay.addEventListener(
      "click",
      (event) => {
        if (event.target === overlay) {
          this._closeDialog();
        }
      }
    );
  }
  render() {
    if (!this._hass) return;

    if (!this._registryLoaded) {
      this.innerHTML = `
        <ha-card>
          <div class="loading">
            InLeMa wird geladen …
          </div>
        </ha-card>

        <style>
          .loading {
            padding: 20px;
            color: var(--secondary-text-color);
          }
        </style>
      `;

      return;
    }

    const nextMealId = this._findEntity(
      "sensor",
      "_next_meal"
    );

    const stockId = this._findEntity(
      "sensor",
      "_stock"
    );

    const calendarId = this._findEntity(
      "calendar",
      "_meal_calendar"
    );

    const meal = nextMealId
      ? this._hass.states[nextMealId]
      : null;

    const stock = stockId
      ? this._hass.states[stockId]
      : null;

    const todoIds = this._findTodoEntities();

    const mealAvailable =
      meal &&
      meal.state !== "unknown" &&
      meal.state !== "unavailable";

    const mealName = mealAvailable
      ? meal.state
      : "Keine Mahlzeit geplant";

    const mealDate =
      meal?.attributes?.date || null;

    const servings =
      meal?.attributes?.servings || null;

    const mealImageUrl =
      meal?.attributes?.image_url || null;

    const hasMealImage =
      mealAvailable &&
      typeof mealImageUrl === "string" &&
      (
        mealImageUrl.startsWith("https://") ||
        mealImageUrl.startsWith("http://")
      );

    const stockCount =
      stock &&
      stock.state !== "unknown" &&
      stock.state !== "unavailable"
        ? stock.state
        : "–";

    const mealMeta = [];

    if (mealDate) {
      mealMeta.push(this._formatDate(mealDate));
    }

    if (servings) {
      mealMeta.push(
        `${servings} ${
          Number(servings) === 1
            ? "Portion"
            : "Portionen"
        }`
      );
    }

    const todoRows = todoIds
      .map((entityId) => {
        const entity =
          this._hass.states[entityId];

        if (!entity) return "";

        const name =
          entity.attributes.friendly_name ||
          "Einkaufsliste";

        const count =
          entity.state !== "unknown" &&
          entity.state !== "unavailable"
            ? entity.state
            : "–";

        return `
          <button
            class="data-row entity-row"
            data-entity="${this._escapeHtml(entityId)}"
          >
            <div class="row-left">
              <ha-icon icon="mdi:cart-outline"></ha-icon>

              <span class="row-name">
                ${this._escapeHtml(name)}
              </span>
            </div>

            <div class="row-right">
              <span class="row-value">
                ${this._escapeHtml(count)} offen
              </span>

              <ha-icon
                class="chevron"
                icon="mdi:chevron-right"
              ></ha-icon>
            </div>
          </button>
        `;
      })
      .join("");

    this.innerHTML = `
      <ha-card>

        <div class="header">

          <img
            class="logo"
            src="/inlema/logo.png"
            alt="InLeMa"
          >

          <div class="brand">
            <div class="title">
              InLeMa
            </div>

            <div class="subtitle">
              Lebensmittel & Mahlzeiten
            </div>
          </div>

        </div>


        <button
          class="meal-section entity-row"
          ${
            calendarId
              ? `data-entity="${this._escapeHtml(calendarId)}"`
              : ""
          }
        >

          <div class="section-label">
            NÄCHSTE MAHLZEIT
          </div>

          <div class="meal-content">

          ${
            hasMealImage
              ? `
                <img
                  class="meal-image"
                  src="${this._escapeHtml(mealImageUrl)}"
                  alt="${this._escapeHtml(mealName)}"
                  loading="lazy"
                >
              `
              : `
                <div class="meal-icon">
                  <ha-icon
                    icon="mdi:silverware-fork-knife"
                  ></ha-icon>
                </div>
              `
          }

            <div class="meal-info">

              <div class="meal-name">
                ${this._escapeHtml(mealName)}
              </div>

              ${
                mealMeta.length
                  ? `
                    <div class="secondary">
                      ${this._escapeHtml(
                        mealMeta.join(" · ")
                      )}
                    </div>
                  `
                  : ""
              }

            </div>

            ${
              calendarId
                ? `
                  <ha-icon
                    class="chevron"
                    icon="mdi:chevron-right"
                  ></ha-icon>
                `
                : ""
            }

          </div>

        </button>


        <div class="section">

          <div class="section-label">
            EINKAUF
          </div>

          <div class="rows">

            ${
              todoRows ||
              `
                <div class="empty">
                  Keine InLeMa-Einkaufslisten gefunden
                </div>
              `
            }

          </div>

        </div>


        <div class="section">

          <div class="section-label">
            VORRAT
          </div>

          <button
            class="data-row entity-row"
            ${
              stockId
                ? `data-entity="${this._escapeHtml(stockId)}"`
                : ""
            }
          >

            <div class="row-left">

              <ha-icon
                icon="mdi:package-variant-closed"
              ></ha-icon>

              <span class="row-name">
                Vorrat
              </span>

            </div>

            <div class="row-right">

              <span class="row-value">
                ${this._escapeHtml(stockCount)}
                Positionen
              </span>

              ${
                stockId
                  ? `
                    <ha-icon
                      class="chevron"
                      icon="mdi:chevron-right"
                    ></ha-icon>
                  `
                  : ""
              }

            </div>

          </button>

        </div>


        <div class="actions">

          <button
            class="action"
            data-action="plan"
          >
            <ha-icon
              icon="mdi:calendar-plus"
            ></ha-icon>

            <span>
              Mahlzeit planen
            </span>
          </button>


          <button
            class="action"
            data-action="cook"
          >
            <ha-icon
              icon="mdi:chef-hat"
            ></ha-icon>

            <span>
              Rezept kochen
            </span>
          </button>


          <button
            class="action"
            data-action="shopping"
          >
            <ha-icon
              icon="mdi:cart-plus"
            ></ha-icon>

            <span>
              Zutaten einkaufen
            </span>
          </button>

        </div>

      </ha-card>


      <style>

        ha-card {
          overflow: hidden;
          color: var(--primary-text-color);
        }


        button {
          font: inherit;
          color: inherit;
        }


        .header {
          display: flex;
          align-items: center;
          gap: 12px;

          padding: 16px 18px 14px;
        }


        .logo {
          width: 38px;
          height: 38px;

          object-fit: contain;
          flex-shrink: 0;
        }


        .brand {
          min-width: 0;
        }


        .title {
          font-size: 20px;
          line-height: 1.15;
          font-weight: 600;
        }


        .subtitle {
          margin-top: 2px;

          color: var(--secondary-text-color);
          font-size: 13px;
        }


        .meal-section {
          display: block;
          width: 100%;

          padding: 14px 18px 16px;

          border: 0;
          border-top: 1px solid var(--divider-color);

          background: transparent;
          text-align: left;

          cursor: pointer;
        }


        .section {
          padding: 14px 18px;

          border-top: 1px solid var(--divider-color);
        }


        .section-label {
          margin-bottom: 9px;

          color: var(--secondary-text-color);

          font-size: 11px;
          font-weight: 600;

          letter-spacing: 0.08em;
        }


        .meal-content {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .meal-image {
          width: 70px;
          height: 70px;

          flex: 0 0 70px;

          border-radius: 12px;

          object-fit: cover;

          background:
            color-mix(
              in srgb,
              var(--primary-text-color) 5%,
              transparent
            );
        }


        .meal-icon {
          display: flex;
          align-items: center;
          justify-content: center;

          width: 38px;
          height: 38px;

          flex: 0 0 38px;

          border-radius: 10px;

          background:
            color-mix(
              in srgb,
              var(--primary-color) 12%,
              transparent
            );

          color: var(--primary-color);
        }


        .meal-icon ha-icon {
          --mdc-icon-size: 21px;
        }


        .meal-info {
          flex: 1;
          min-width: 0;
        }


        .meal-name {
          font-size: 16px;
          font-weight: 500;
          line-height: 1.3;
        }


        .secondary {
          margin-top: 3px;

          color: var(--secondary-text-color);

          font-size: 13px;
        }


        .rows {
          display: flex;
          flex-direction: column;
        }


        .data-row {
          display: flex;
          align-items: center;
          justify-content: space-between;

          width: 100%;

          padding: 9px 0;

          border: 0;

          background: transparent;

          text-align: left;

          cursor: pointer;
        }


        .data-row + .data-row {
          border-top: 1px solid
            color-mix(
              in srgb,
              var(--divider-color) 55%,
              transparent
            );
        }


        .row-left,
        .row-right {
          display: flex;
          align-items: center;
        }


        .row-left {
          min-width: 0;
          gap: 11px;
        }


        .row-left > ha-icon {
          color: var(--secondary-text-color);
          --mdc-icon-size: 21px;
        }


        .row-name {
          overflow: hidden;

          font-size: 14px;
          font-weight: 500;

          text-overflow: ellipsis;
          white-space: nowrap;
        }


        .row-right {
          gap: 5px;
          flex-shrink: 0;
        }


        .row-value {
          color: var(--secondary-text-color);
          font-size: 13px;
        }


        .chevron {
          color: var(--secondary-text-color);
          --mdc-icon-size: 19px;
        }


        .empty {
          padding: 5px 0;

          color: var(--secondary-text-color);
          font-size: 13px;
        }


        .actions {
          display: grid;

          grid-template-columns:
            repeat(3, minmax(0, 1fr));

          gap: 8px;

          padding: 12px 18px 16px;

          border-top: 1px solid var(--divider-color);
        }


        .action {
          display: flex;
          align-items: center;
          justify-content: center;

          min-width: 0;

          gap: 7px;

          padding: 9px 8px;

          border: 1px solid var(--divider-color);
          border-radius: 10px;

          background:
            var(
              --ha-card-background,
              var(--card-background-color)
            );

          cursor: pointer;
        }


        .action:hover,
        .data-row:hover,
        .meal-section:hover {
          background:
            color-mix(
              in srgb,
              var(--primary-color) 5%,
              transparent
            );
        }


        .action ha-icon {
          color: var(--primary-color);
          --mdc-icon-size: 19px;
        }


        .action span {
          overflow: hidden;

          font-size: 12px;
          font-weight: 500;

          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .inlema-overlay {
          position: fixed;
          inset: 0;

          z-index: 9999;

          display: flex;
          align-items: center;
          justify-content: center;

          padding: 20px;

          background: rgba(0, 0, 0, 0.35);
        }


        .inlema-dialog {
          width: min(520px, 100%);
          max-height: min(650px, 85vh);

          overflow: auto;

          border-radius: var(
            --ha-card-border-radius,
            12px
          );

          background:
            var(
              --ha-card-background,
              var(--card-background-color)
            );

          color: var(--primary-text-color);

          box-shadow:
            0 12px 40px
            rgba(0, 0, 0, 0.25);
        }


        .small-dialog {
          width: min(420px, 100%);
        }


        .dialog-header {
          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: 16px;

          padding: 18px;
        }


        .dialog-title {
          font-size: 19px;
          font-weight: 600;
        }


        .dialog-subtitle {
          margin-top: 3px;

          color: var(--secondary-text-color);
          font-size: 13px;
        }


        .icon-button {
          display: flex;
          align-items: center;
          justify-content: center;

          width: 38px;
          height: 38px;

          flex: 0 0 38px;

          border: 0;
          border-radius: 50%;

          background: transparent;

          cursor: pointer;
        }


        .icon-button:hover {
          background:
            color-mix(
              in srgb,
              var(--primary-text-color) 7%,
              transparent
            );
        }


        .search-box {
          display: flex;
          align-items: center;

          gap: 10px;

          margin: 0 18px;

          padding: 0 12px;

          border: 1px solid var(--divider-color);
          border-radius: 10px;

          background:
            color-mix(
              in srgb,
              var(--primary-text-color) 3%,
              transparent
            );
        }


        .search-box ha-icon {
          color: var(--secondary-text-color);
          --mdc-icon-size: 20px;
        }


        .recipe-search-input {
          width: 100%;

          padding: 12px 0;

          border: 0;
          outline: 0;

          background: transparent;

          color: var(--primary-text-color);

          font: inherit;
          font-size: 15px;
        }


        .recipe-search-input::placeholder {
          color: var(--secondary-text-color);
        }


        .search-status {
          padding: 12px 18px 8px;

          color: var(--secondary-text-color);

          font-size: 12px;
        }


        .loading-line {
          display: flex;
          align-items: center;
          gap: 6px;
        }


        .loading-line ha-icon {
          --mdc-icon-size: 16px;

          animation:
            inlema-spin 1s linear infinite;
        }


        @keyframes inlema-spin {
          to {
            transform: rotate(360deg);
          }
        }


        .recipe-results {
          padding: 0 10px 12px;
        }


        .recipe-result {
          display: flex;
          align-items: center;

          width: 100%;

          gap: 12px;

          padding: 11px 8px;

          border: 0;
          border-radius: 9px;

          background: transparent;

          text-align: left;

          cursor: pointer;
        }


        .recipe-result:hover {
          background:
            color-mix(
              in srgb,
              var(--primary-color) 6%,
              transparent
            );
        }


        .recipe-result-icon {
          display: flex;
          align-items: center;
          justify-content: center;

          width: 38px;
          height: 38px;

          flex: 0 0 38px;

          border-radius: 9px;

          background:
            color-mix(
              in srgb,
              var(--primary-color) 10%,
              transparent
            );

          color: var(--primary-color);
        }


        .recipe-result-icon ha-icon {
          --mdc-icon-size: 20px;
        }


        .recipe-result-info {
          min-width: 0;
        }


        .recipe-result-name {
          font-size: 14px;
          font-weight: 500;
        }


        .recipe-result-meta {
          margin-top: 2px;

          color: var(--secondary-text-color);

          font-size: 12px;
        }


        .recipe-detail {
          padding: 8px 18px 20px;

          text-align: center;
        }


        .recipe-detail-icon {
          display: flex;
          align-items: center;
          justify-content: center;

          width: 64px;
          height: 64px;

          margin: 5px auto 12px;

          border-radius: 18px;

          background:
            color-mix(
              in srgb,
              var(--primary-color) 10%,
              transparent
            );

          color: var(--primary-color);
        }


        .recipe-detail-icon ha-icon {
          --mdc-icon-size: 32px;
        }


        .recipe-detail-meta {
          color: var(--secondary-text-color);
          font-size: 13px;
        }


        .dialog-message {
          padding: 4px 18px 20px;

          color: var(--secondary-text-color);

          font-size: 14px;
          line-height: 1.5;
        }


        .dialog-footer {
          display: flex;
          justify-content: flex-end;

          gap: 8px;

          padding: 12px 18px 18px;

          border-top: 1px solid var(--divider-color);
        }


        .primary-button,
        .secondary-button {
          display: flex;
          align-items: center;
          justify-content: center;

          gap: 7px;

          padding: 9px 14px;

          border-radius: 9px;

          cursor: pointer;

          font-size: 13px;
          font-weight: 500;
        }


        .primary-button {
          border: 0;

          background: var(--primary-color);
          color: var(--text-primary-color);
        }


        .secondary-button {
          border: 1px solid var(--divider-color);

          background: transparent;
          color: var(--primary-text-color);
        }


        .secondary-button ha-icon {
          --mdc-icon-size: 18px;
        }
        .plan-form {
          padding: 0 18px 20px;
        }


        .selected-recipe {
          display: flex;
          align-items: center;

          gap: 12px;

          padding: 4px 0 18px;
        }


        .selected-recipe-info {
          min-width: 0;
        }


        .selected-recipe-name {
          font-size: 15px;
          font-weight: 600;
        }


        .form-field {
          display: block;

          margin-top: 15px;
        }


        .form-label {
          display: block;

          margin-bottom: 6px;

          color: var(--secondary-text-color);

          font-size: 12px;
          font-weight: 500;
        }


        .form-input {
          box-sizing: border-box;

          width: 100%;

          padding: 10px 11px;

          border: 1px solid var(--divider-color);
          border-radius: 9px;

          outline: none;

          background:
            color-mix(
              in srgb,
              var(--primary-text-color) 3%,
              transparent
            );

          color: var(--primary-text-color);

          font: inherit;
          font-size: 14px;
        }


        .form-input:focus {
          border-color: var(--primary-color);
        }


        .servings-control {
          display: grid;

          grid-template-columns:
            42px 1fr 42px;

          gap: 7px;
        }


        .servings-input {
          text-align: center;
        }


        .serving-button {
          display: flex;
          align-items: center;
          justify-content: center;

          border: 1px solid var(--divider-color);
          border-radius: 9px;

          background: transparent;

          cursor: pointer;
        }


        .serving-button:hover {
          background:
            color-mix(
              in srgb,
              var(--primary-color) 6%,
              transparent
            );
        }


        .serving-button ha-icon {
          --mdc-icon-size: 18px;
        }


        .plan-error {
          margin-top: 14px;

          padding: 10px 12px;

          border-radius: 8px;

          background:
            color-mix(
              in srgb,
              var(--error-color) 10%,
              transparent
            );

          color: var(--error-color);

          font-size: 12px;
        }


        .primary-button:disabled {
          opacity: 0.6;
          cursor: default;
        }


        .primary-button ha-icon,
        .secondary-button ha-icon {
          --mdc-icon-size: 18px;
        }


        .spin {
          animation:
            inlema-spin 1s linear infinite;
        }


        .success-content {
          padding: 8px 18px 24px;

          text-align: center;
        }


        .success-icon {
          display: flex;
          align-items: center;
          justify-content: center;

          width: 58px;
          height: 58px;

          margin: 4px auto 13px;

          border-radius: 50%;

          background:
            color-mix(
              in srgb,
              var(--success-color, #43a047) 12%,
              transparent
            );

          color:
            var(--success-color, #43a047);
        }


        .success-icon ha-icon {
          --mdc-icon-size: 30px;
        }


        .success-name {
          margin-bottom: 4px;

          font-size: 16px;
          font-weight: 600;
        }

                .shopping-list-options {
          display: flex;
          flex-direction: column;

          border: 1px solid var(--divider-color);
          border-radius: 10px;

          overflow: hidden;
        }


        .shopping-list-option {
          display: flex;
          align-items: center;

          gap: 10px;

          padding: 11px 12px;

          cursor: pointer;
        }


        .shopping-list-option +
        .shopping-list-option {
          border-top:
            1px solid var(--divider-color);
        }


        .shopping-list-option:hover {
          background:
            color-mix(
              in srgb,
              var(--primary-color) 5%,
              transparent
            );
        }


        .shopping-list-option input {
          position: absolute;
          opacity: 0;
          pointer-events: none;
        }


        .shopping-list-radio {
          box-sizing: border-box;

          width: 18px;
          height: 18px;

          flex: 0 0 18px;

          border:
            2px solid
            var(--secondary-text-color);

          border-radius: 50%;
        }


        .shopping-list-option
        input:checked +
        .shopping-list-radio {
          border:
            5px solid
            var(--primary-color);
        }


        .shopping-list-option > ha-icon {
          color:
            var(--secondary-text-color);

          --mdc-icon-size: 20px;
        }


        .shopping-list-info {
          display: flex;
          flex-direction: column;

          min-width: 0;
        }


        .shopping-list-info strong {
          font-size: 14px;
          font-weight: 500;
        }


        .shopping-list-info small {
          margin-top: 1px;

          color:
            var(--secondary-text-color);

          font-size: 11px;
        }


        .cooking-loading {
          display: flex;
          align-items: center;
          justify-content: center;

          gap: 10px;

          padding: 30px 18px;

          color: var(--secondary-text-color);

          font-size: 14px;
        }


        .cooking-dialog {
          width: min(560px, 100%);
        }


        .cooking-recipe-image {
          display: block;

          width: calc(100% - 36px);
          height: 220px;

          margin: 0 18px;

          border-radius: 12px;

          object-fit: cover;
        }


        .cooking-overview {
          padding: 18px;
        }


        .cooking-description {
          margin-bottom: 20px;

          color: var(--secondary-text-color);

          font-size: 14px;
          line-height: 1.55;
        }


        .cooking-section-title {
          margin-bottom: 10px;

          font-size: 15px;
          font-weight: 600;
        }


        .cooking-ingredients {
          display: flex;
          flex-direction: column;
        }


        .cooking-ingredient {
          display: grid;

          grid-template-columns: 100px 1fr;

          gap: 10px;

          padding: 7px 0;

          border-bottom:
            1px solid
            color-mix(
              in srgb,
              var(--divider-color) 60%,
              transparent
            );

          font-size: 14px;
        }


        .ingredient-amount {
          color: var(--secondary-text-color);
        }


        .ingredient-name {
          font-weight: 500;
        }


        .cooking-progress {
          height: 4px;

          margin: 0 18px;

          overflow: hidden;

          border-radius: 4px;

          background:
            color-mix(
              in srgb,
              var(--primary-text-color) 8%,
              transparent
            );
        }


        .cooking-progress-bar {
          height: 100%;

          border-radius: inherit;

          background: var(--primary-color);

          transition: width 0.2s ease;
        }


        .cooking-step-content {
          padding: 24px 18px 28px;
        }


        .cooking-step-title {
          margin-bottom: 18px;

          font-size: 20px;
          font-weight: 600;

          line-height: 1.3;
        }


        .step-ingredients {
          margin-bottom: 22px;

          padding: 13px 14px;

          border-radius: 10px;

          background:
            color-mix(
              in srgb,
              var(--primary-color) 7%,
              transparent
            );
        }


        .step-ingredients-title {
          margin-bottom: 7px;

          color: var(--secondary-text-color);

          font-size: 11px;
          font-weight: 600;

          letter-spacing: 0.06em;

          text-transform: uppercase;
        }


        .step-ingredient {
          display: flex;
          align-items: center;

          gap: 4px;

          padding: 3px 0;

          font-size: 14px;
        }


        .step-ingredient ha-icon {
          --mdc-icon-size: 18px;

          color: var(--primary-color);
        }


        .cooking-instruction {
          font-size: 16px;
          line-height: 1.65;
        }


        .cooking-footer {
          justify-content: space-between;
        }



        @media (max-width: 520px) {

          .actions {
            grid-template-columns: 1fr;
          }


          .action {
            justify-content: flex-start;

            padding-left: 12px;
          }

        }

      </style>
    `;


    this.querySelectorAll(
      "[data-entity]"
    ).forEach((element) => {

      element.addEventListener(
        "click",
        () => {
          this._openMoreInfo(
            element.dataset.entity
          );
        }
      );

    });


    this.querySelectorAll(
      "[data-action]"
    ).forEach((element) => {

      element.addEventListener(
        "click",
        () => {

          const action =
            element.dataset.action;

          if (action === "cook") {
            this._openRecipeSearch();
            return;
          }

          if (action === "plan") {
            this._openMealPlanner();
            return;
          }

          if (action === "shopping") {
            this._openShoppingRecipeSearch();
            return;
          }

        }
      );

    });

  }
}


if (
  !customElements.get("inlema-card")
) {
  customElements.define(
    "inlema-card",
    InLeMaCard
  );
}


window.customCards =
  window.customCards || [];


if (
  !window.customCards.some(
    (card) =>
      card.type === "inlema-card"
  )
) {
  window.customCards.push({
    type: "inlema-card",
    name: "InLeMa",
    description:
      "Lebensmittel, Einkauf und Mahlzeiten mit InLeMa",
    preview: true,
  });
}