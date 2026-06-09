import { state } from "../app.js";
import { api } from "../api.js";
import { escapeHtml, money, monthLabel } from "../utils.js";

const statuses = ["pagado", "pendiente", "suspendido", "condonado", "inicio"];

export async function renderPagos() {
  const view = document.querySelector("#view");
  await loadPayments();

  view.innerHTML = `
    <section class="pagos-view">
      <div class="section-head">
        <div>
          <h2>Pagos</h2>
          <p>Mes actual: ${monthLabel(state.month)}</p>
        </div>
        <label class="month-picker">
          Mes
          <input id="paymentMonth" type="month" value="${state.month}">
        </label>
      </div>

      <section class="panel">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Corte</th>
                <th>Estado</th>
                <th>Monto</th>
                <th>Metodo</th>
                <th>Notas</th>
                <th>Guardar</th>
              </tr>
            </thead>
            <tbody>
              ${renderPaymentRows()}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  `;

  document.querySelector("#paymentMonth").addEventListener("change", async (event) => {
    state.month = event.target.value;
    state.dashboard = null;
    state.payments = [];
    await renderPagos();
  });

  document.querySelectorAll("[data-save-payment]").forEach((button) => {
    button.addEventListener("click", savePayment);
  });
}

async function loadPayments() {
  const data = await api(`/api/payments?month=${state.month}`);
  state.payments = data.payments || [];
}

function renderPaymentRows() {
  if (!state.payments.length) {
    return `<tr><td colspan="7" class="empty">No hay clientes para cobrar.</td></tr>`;
  }

  return state.payments.map((payment) => `
    <tr>
      <td>
        <strong>${escapeHtml(payment.client_name)}</strong>
        <small>${escapeHtml(payment.community || "")}</small>
      </td>
      <td>Dia ${payment.cutoff_day || "-"}</td>
      <td>
        <select data-client="${payment.client_id}" data-field="status">
          ${statuses.map((status) => `
            <option value="${status}" ${payment.status === status ? "selected" : ""}>${status}</option>
          `).join("")}
        </select>
      </td>
      <td>
        <input data-client="${payment.client_id}" data-field="amount" type="number" min="0" step="1" value="${escapeHtml(payment.amount || "")}">
      </td>
      <td>
        <select data-client="${payment.client_id}" data-field="method">
          ${["efectivo", "transferencia", "tarjeta", "otro"].map((method) => `
            <option value="${method}" ${payment.method === method ? "selected" : ""}>${method}</option>
          `).join("")}
        </select>
      </td>
      <td>
        <input data-client="${payment.client_id}" data-field="notes" value="${escapeHtml(payment.notes || "")}" placeholder="Nota">
      </td>
      <td>
        <button class="primary" data-save-payment="${payment.client_id}" type="button">Guardar</button>
      </td>
    </tr>
  `).join("");
}

async function savePayment(event) {
  const clientId = Number(event.currentTarget.dataset.savePayment);
  const field = (name) => document.querySelector(`[data-client="${clientId}"][data-field="${name}"]`)?.value || "";

  await api("/api/payments", {
    method: "POST",
    body: JSON.stringify({
      clientId,
      paymentMonth: state.month,
      amount: Number(field("amount")) || null,
      status: field("status"),
      method: field("method"),
      notes: field("notes"),
    }),
  });

  state.dashboard = null;
  await renderPagos();
}
