import { state } from "./app.js";

import {
  renderLogin
} from "./views/login.js";

import {
  renderDashboard
} from "./views/dashboard.js";

import {
  renderClientes
} from "./views/clientes.js";

import {
  renderPagos
} from "./views/pagos.js";

import { setView } from "./router.js";

async function start() {

  if (!state.token) {
    renderLogin();
    return;
  }

  await renderShell();
}

async function renderShell() {
  document.querySelector("#app").innerHTML = `
    <div class="shell">
      <header class="topbar">
        <div class="brand">
          <div class="mark">CP</div>
          <div>
            <h1>Control de Clientes</h1>
            <p>Internet y cobranza</p>
          </div>
        </div>

        <nav class="nav" aria-label="Vistas">
          <button data-view="dashboard">Inicio</button>
          <button data-view="clientes">Clientes</button>
          <button data-view="pagos">Pagos</button>
        </nav>

        <button class="danger" id="logoutBtn">Salir</button>
      </header>

      <section class="content" id="view"></section>
    </div>
  `;

  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.view));
  });

  document.querySelector("#logoutBtn").addEventListener("click", () => {
    localStorage.removeItem("clientes_token");
    location.reload();
  });

  document.addEventListener("view-change", renderCurrentView);
  await renderCurrentView();
}

async function renderCurrentView() {
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === state.view);
  });

  if (state.view === "clientes") return renderClientes();
  if (state.view === "pagos") return renderPagos();
  return renderDashboard();
}

start();
