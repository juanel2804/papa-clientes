import { state } from "../app.js";
import { api } from "../api.js";
import { escapeHtml, money, monthLabel } from "../utils.js";
import { confirmDialog, openModal, toast } from "../ui.js";

const methods = ["efectivo", "transferencia", "tarjeta", "otro"];

export async function renderPagos() {
const view = document.querySelector("#view");

await loadPayments();

const totals = paymentTotals();

view.innerHTML = ` <section class="pagos-view"> <div class="section-head compact-head"> <div> <h2>Pagos</h2> <p>Registra cobros de ${monthLabel(state.month)}.</p> </div>


    <label class="month-picker">
      Mes
      <input id="paymentMonth" type="month" value="${state.month}">
    </label>
  </div>

  <section class="payment-summary">
    <div>
      <span>Pagados</span>
      <strong>${totals.pagado}</strong>
    </div>

    <div>
      <span>Pendientes</span>
      <strong>${totals.pendiente}</strong>
    </div>

    <div>
      <span>Cobrado</span>
      <strong>${money.format(totals.collected)}</strong>
    </div>
  </section>

  <div class="toolbar search-bar">
    <input id="paymentSearch" placeholder="Buscar cliente para cobrar">
    <button class="ghost" id="clearPaymentSearch" type="button">
      Limpiar
    </button>
  </div>

  <section class="payment-list">
    ${renderPaymentCards()}
  </section>
</section>


`;

document.querySelector("#paymentMonth").addEventListener("change", async (event) => {
state.month = event.target.value;
state.dashboard = null;
state.payments = [];


await renderPagos();


});

document.querySelector("#paymentSearch").addEventListener(
"input",
filterPaymentCards
);

document.querySelector("#clearPaymentSearch").addEventListener("click", () => {
document.querySelector("#paymentSearch").value = "";
filterPaymentCards();
});

document.querySelectorAll("[data-register-payment]").forEach((button) => {
button.addEventListener("click", () => {
const payment = state.payments.find(
(item) => String(item.client_id) === button.dataset.registerPayment
);


  if (payment) {
    openPaymentModal(payment);
  }
});


});
}

async function loadPayments() {
const data = await api(`/api/payments?month=${state.month}`);
state.payments = data.payments || [];
}

function paymentTotals() {
return state.payments.reduce(
(totals, payment) => {
totals[payment.status] = (totals[payment.status] || 0) + 1;


  if (payment.status === "pagado") {
    totals.collected += Number(payment.amount || 0);
  }

  return totals;
},
{
  pagado: 0,
  pendiente: 0,
  collected: 0,
}


);
}

function renderPaymentCards() {
const pendientes = state.payments.filter(
(payment) => payment.status !== "pagado"
);

if (!pendientes.length) {
return `<div class="empty">No hay clientes para cobrar.</div>`;
}

return pendientes
.map(
(payment) => `       <article
        class="payment-card"
        data-payment-card
        data-search="${escapeHtml(
          `${payment.client_name} ${payment.community || ""}`.toLowerCase()
)}"
> <div class="payment-main"> <div> <strong>${escapeHtml(payment.client_name)}</strong> <small>
${escapeHtml(payment.community || "Sin comunidad")}
· Dia ${payment.cutoff_day || "-"} </small> </div>


      <span class="tag ${payment.status}">
        ${escapeHtml(payment.status)}
      </span>
    </div>

    <dl class="payment-meta">
      <div>
        <dt>Monto</dt>
        <dd>${payment.amount ? money.format(payment.amount) : "-"}</dd>
      </div>

      <div>
        <dt>Metodo</dt>
        <dd>${escapeHtml(payment.method || "efectivo")}</dd>
      </div>
    </dl>

    <button
      class="primary full-button"
      data-register-payment="${payment.client_id}"
      type="button"
    >
      Registrar pago
    </button>
  </article>
`
)
.join("");


}

function openPaymentModal(payment) {
openModal(
` <section class="modal-card payment-modal" role="dialog" aria-modal="true"> <header class="modal-head"> <div> <h3>Registrar pago</h3> <p>
${escapeHtml(payment.client_name)}
· ${monthLabel(state.month)} </p> </div>


    <button
      class="icon-close"
      data-close-modal
      type="button"
      aria-label="Cerrar"
    >
      ×
    </button>
  </header>

  <form id="paymentForm" class="form-grid">
    <label>
      Metodo de pago
      <select name="method">
        ${methods
          .map(
            (method) => `
            <option value="${method}">
              ${method}
            </option>
          `
          )
          .join("")}
      </select>
    </label>

    <div class="modal-actions wide">
      <button
        class="ghost"
        data-close-modal
        type="button"
      >
        Cancelar
      </button>

      <button
        class="primary"
        type="submit"
      >
        Registrar pago
      </button>
    </div>
  </form>
</section>
`,
(overlay, close) => {
  overlay
    .querySelector("#paymentForm")
    .addEventListener("submit", (event) =>
      savePayment(event, payment, close)
    );
}


);
}

async function savePayment(event, payment, close) {
event.preventDefault();

const form = new FormData(event.target);
const method = form.get("method");

const ok = await confirmDialog({
title: "Registrar pago",
message: `¿Estas seguro de registrar el pago de ${escapeHtml(
      payment.client_name
    )}?`,
confirmText: "Si, registrar",
});

if (!ok) return;

await api("/api/payments", {
method: "POST",
body: JSON.stringify({
clientId: Number(payment.client_id),
paymentMonth: state.month,
paidAt: new Date().toISOString().slice(0, 10),
status: "pagado",
method,
}),
});

state.dashboard = null;

toast("Pago registrado");

close();

await renderPagos();
}

function filterPaymentCards() {
const value = document
.querySelector("#paymentSearch")
.value
.trim()
.toLowerCase();

document.querySelectorAll("[data-payment-card]").forEach((card) => {
card.hidden = value && !card.dataset.search.includes(value);
});
}
