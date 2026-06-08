import { app, state } from "../app.js";
import { api } from "../api.js";

const money = new Intl.NumberFormat(
  "es-MX",
  {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }
);

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

  const rate =
    state.dashboard?.collectionRate || 0;

  const expectedRevenue =
    state.dashboard?.expectedRevenue || 0;

  const collectedRevenue =
    state.dashboard?.collectedRevenue || 0;

  app.innerHTML = `

  <section class="dashboard">

    <header class="dashboard-header">

      <div>
        <h1>📡 Control de Clientes</h1>
        <p>
          Estado general del negocio
        </p>
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

      <div class="kpi-card warning">
        <span>Cortes Próximos</span>
        <strong>
          ${totals.due_soon || 0}
        </strong>
      </div>

      <div class="kpi-card success">
        <span>Cobranza</span>
        <strong>
          ${rate}%
        </strong>
      </div>

    </section>

    <section class="collection-card">

      <div class="collection-header">

        <h3>
          💰 Cobranza del Mes
        </h3>

        <strong>
          ${rate}%
        </strong>

      </div>

      <div class="progress">

        <div
          class="progress-fill"
          style="width:${rate}%"
        ></div>

      </div>

      <p>
        ${money.format(collectedRevenue)}
        de
        ${money.format(expectedRevenue)}
      </p>

    </section>

    <section class="dashboard-grid">

      <div class="panel-card">

        <h3>
          ⚡ Cortes Próximos
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

      </div>

      <div class="panel-card">

        <h3>
          🟡 Pendientes de Cobro
        </h3>

        <div class="mini-list">

          ${
            (state.dashboard?.pendingClients || [])
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
                    ${
                      client.monthly_fee
                        ? money.format(
                            client.monthly_fee
                          )
                        : "-"
                    }
                  </span>

                </div>
              `)
              .join("")
          }

        </div>

      </div>

    </section>

    <section class="panel-card">

      <h3>
        💵 Últimos Pagos
      </h3>

      <div class="mini-list">

        ${
          (state.dashboard?.latestPayments || [])
            .map(payment => `
              <div class="mini-client">

                <div>

                  <strong>
                    ${payment.client_name}
                  </strong>

                  <small>
                    ${payment.status}
                  </small>

                </div>

                <span>
                  ${
                    payment.amount
                      ? money.format(
                          payment.amount
                        )
                      : "-"
                  }
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