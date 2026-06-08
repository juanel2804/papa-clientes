import { app, state } from "../app.js";
import { api } from "../api.js";
import { escapeHtml } from "../utils.js";

export function renderLogin() {

  app.innerHTML = `
    <section class="login-screen">

      <form id="loginForm" class="login-box">

        <div class="mark">
          CP
        </div>

        <h1>
          Control de Clientes
        </h1>

        <p>
          Inicia sesión para continuar
        </p>

        ${
          state.error
            ? `
              <div class="notice">
                ${escapeHtml(state.error)}
              </div>
            `
            : ""
        }

        <div class="grid">

          <label>
            Usuario

            <input
              name="username"
              required
            >
          </label>

          <label>
            Contraseña

            <input
              name="password"
              type="password"
              required
            >
          </label>

          <button
            class="primary"
            type="submit"
          >
            Entrar
          </button>

        </div>

      </form>

    </section>
  `;

  document
    .querySelector("#loginForm")
    .addEventListener(
      "submit",
      login
    );
}

async function login(event){

  event.preventDefault();

  const form =
    new FormData(event.target);

  try {

    const data =
      await api(
        "/api/auth/login",
        {
          method:"POST",

          body:JSON.stringify({
            username:
              form.get("username"),

            password:
              form.get("password"),
          }),
        }
      );

    state.token = data.token;

    localStorage.setItem(
      "clientes_token",
      data.token
    );

    location.reload();

  } catch(error){

    state.error =
      error.message;

    renderLogin();
  }
}