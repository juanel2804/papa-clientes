import { state } from "../app.js";
import { api } from "../api.js";
import { money } from "../utils.js";

export async function renderDashboard() {
  const view = document.querySelector("#view");

  if (!state.dashboard) {
    try {
      state.dashboard = await api(`/api/dashboard?month=${state.month}`);
    } catch (error) {
      view.innerHTML = `<div class="notice">Error: ${error.message}</div>`;
      return;
    }
  }

  const totals = state.dashboard?.totals || {};
  const rate = state.dashboard?.collectionRate || 0;
  const expectedRevenue = state.dashboard?.expectedRevenue || 0;
  const collectedRevenue = state.dashboard?.collectedRevenue || 0;

  view.innerHTML = `
    <section class="dashboard">
      <header class="dashboard-header">
        <div>
          <h1>Control de Clientes</h1>
          <p>Estado general del negocio</p>
        </div>
      </header>

      <section class="kpis">
        <div class="kpi-card clientes">
          <span>Clientes</span>
          <strong>${totals.total_clients || 0}</strong>
        </div>
        <div class="kpi-card pagados">
          <span>Pagados</span>
          <strong>${totals.paid_this_month || 0}</strong>
        </div>
        <div class="kpi-card pendientes">
          <span>Atrasados</span>
          <strong>${totals.pending_this_month || 0}</strong>
        </div>
        <div class="kpi-card suspendidos">
          <span>Suspendidos</span>
          <strong>${totals.suspended_clients || 0}</strong>
        </div>
        <div class="kpi-card warning">
          <span>Cortes Proximos</span>
          <strong>${totals.due_soon || 0}</strong>
        </div>
        <div class="kpi-card success">
          <span>Cobranza</span>
          <strong>${rate}%</strong>
        </div>
      </section>

      <section class="collection-card">
        <div class="collection-header">
          <h3>Cobranza del Mes</h3>
          <strong>${rate}%</strong>
        </div>
        <div class="progress">
          <div class="progress-fill" style="width:${Math.min(rate, 100)}%"></div>
        </div>
        <p>${money.format(collectedRevenue)} de ${money.format(expectedRevenue)}</p>
      </section>

      <section class="dashboard-grid">
        <div class="panel-card">
          <h3>Cortes Proximos</h3>
          <div class="mini-list">${renderClients(state.dashboard?.dueSoon || [], "cutoff")}</div>
        </div>
        <div class="panel-card">
          <h3>Pendientes de Cobro</h3>
          <div class="mini-list">${renderClients(state.dashboard?.pendingClients || [], "fee")}</div>
        </div>
      </section>

      <section class="panel-card">
        <h3>Ultimos Pagos</h3>
        <div class="mini-list">${renderPayments(state.dashboard?.latestPayments || [])}</div>
      </section>
    </section>
  `;
}

function renderClients(clients, type) {
  if (!clients.length) return `<div class="empty">Sin registros por ahora.</div>`;

  return clients.slice(0, 8).map((client) => `
    <div class="mini-client">
      <div>
        <strong>${client.name}</strong>
        <small>${client.community}</small>
      </div>
      <span>${type === "fee" ? money.format(client.monthly_fee || 0) : `Dia ${client.cutoff_day || "-"}`}</span>
    </div>
  `).join("");
}

function renderPayments(payments) {
  if (!payments.length) return `<div class="empty">Sin pagos registrados.</div>`;

  return payments.slice(0, 8).map((payment) => `
    <div class="mini-client">
      <div>
        <strong>${payment.client_name}</strong>
        <small>
  ${payment.status}
  <br>
  ${new Date(payment.updated_at).toLocaleString("es-MX")}
</small>
      </div>
      <span>${payment.amount ? money.format(payment.amount) : "-"}</span>
    </div>
  `).join("");
}
