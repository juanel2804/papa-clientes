import { app, state } from "../app.js";

export function renderDashboard() {

  app.innerHTML = `
  
  <section class="dashboard">

    <header class="dashboard-header">

      <div>
        <h1>Control de Clientes</h1>
        <p>
          Dashboard principal
        </p>
      </div>

      <button id="logoutBtn">
        Salir
      </button>

    </header>

    <section class="kpis">

      <div class="kpi-card">
        <span>Clientes</span>
        <strong>0</strong>
      </div>

      <div class="kpi-card">
        <span>Pagados</span>
        <strong>0</strong>
      </div>

      <div class="kpi-card">
        <span>Pendientes</span>
        <strong>0</strong>
      </div>

      <div class="kpi-card">
        <span>Suspendidos</span>
        <strong>0</strong>
      </div>

    </section>

  </section>

  `;

  document
    .querySelector("#logoutBtn")
    .addEventListener(
      "click",
      () => {

        localStorage.removeItem(
          "clientes_token"
        );

        location.reload();
      }
    );
}