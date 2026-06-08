import { app, state } from "../app.js";
import { api } from "../api.js";

export async function renderDashboard() {

  if (!state.dashboard) {
    try {
      state.dashboard = await api(
        `/api/dashboard?month=${state.month}`
      );
    } catch (error) {
      app.innerHTML = `
        <div style="padding:20px">
          Error: ${error.message}
        </div>
      `;
      return;
    }
  }

  const totals =
    state.dashboard?.totals || {};

  app.innerHTML = `

  <section class="dashboard">

    <header class="dashboard-header">

      <div>
        <h1>Control de Clientes</h1>
        <p>Dashboard principal</p>
      </div>

      <button id="logoutBtn">
        Salir
      </button>

    </header>

    <section class="kpis">

      <div class="kpi-card clientes">
        <span>Clientes</span>
        <strong>
          ${totals.total_clients || 0}
        </strong>
      </div>

      <div class="kpi-card pagados">
        <span>Pagados</span>
        <strong>
          ${totals.paid_this_month || 0}
        </strong>
      </div>

      <div class="kpi-card pendientes">
        <span>Pendientes</span>
        <strong>
          ${totals.pending_this_month || 0}
        </strong>
      </div>

      <div class="kpi-card suspendidos">
        <span>Suspendidos</span>
        <strong>
          ${totals.suspended_clients || 0}
        </strong>
      </div>

    </section>

    <section class="panel-card">

      <h3>
        ⚡ Cortes próximos
      </h3>

      <div class="mini-list">

        ${
          (state.dashboard?.dueSoon || [])
            .map(client => `
              <div class="mini-client">

                <div>
                  <strong>
                    ${client.name}
                  </strong>

                  <small>
                    ${client.community}
                  </small>
                </div>

                <span>
                  Día ${client.cutoff_day}
                </span>

              </div>
            `)
            .join("")
        }

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