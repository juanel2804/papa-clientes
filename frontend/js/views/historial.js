import { state } from "../app.js";
import { api } from "../api.js";
import { money } from "../utils.js";

export async function renderHistorial() {
  const view = document.querySelector("#view");

  const today = new Date();

const currentMonth = `${today.getFullYear()}-${String(
today.getMonth()+1
).padStart(2,"0")}`;

const month =
state.historialMonth ||
currentMonth;
  try {
    const data =
      await api(
        `/api/history?month=${month}`
      );

    const search =
      (state.historialSearch || "").toLowerCase();

    const payments = (data.payments || []).filter((payment) =>
      payment.client_name
        ?.toLowerCase()
        .includes(search)
    );

    const totalCollected = payments.reduce(
      (sum, p) => sum + Number(p.amount || 0),
      0
    );

    const paidClients = payments.length;


    view.innerHTML = `
      <section class="historial-view">

        <div class="section-head">
          <div>
            <h2>Historial de Pagos</h2>
            <p>Consulta mensual de pagos</p>
          </div>
        </div>

     <div class="historial-toolbar">

  <input
    type="text"
    id="searchHistory"
    placeholder="Buscar cliente..."
    value="${state.historialSearch || ""}"
  >

</div>

<div class="month-nav">

  <button
    class="month-btn"
    id="prevMonth"
  >

    ❮

  </button>

  <div class="month-title">

    ${formatMonth(month)}

  </div>

  <button
    class="month-btn"
    id="nextMonth"
  >

    ❯

  </button>

</div>

        </div>

        <section class="historial-kpis">

          <div class="kpi-card success">
            <span>Total Cobrado</span>
            <strong>${money.format(totalCollected)}</strong>
          </div>

          <div class="kpi-card pagados">
            <span>Clientes que pagaron</span>
            <strong>${paidClients}</strong>
          </div>

          
        </section>

        <section class="historial-panel panel-card">

          <h3>Pagos Registrados</h3>

          <div class="table-wrapper">
            ${renderPaymentsTable(payments)}
          </div>

        </section>

      </section>
    `;

    document
      .querySelector("#searchHistory")
      .addEventListener("input", (e) => {
        state.historialSearch = e.target.value;
        renderHistorial();
      });

    document
      .querySelector("#prevMonth")
      .addEventListener("click", () => {
        state.historialMonth = changeMonth(month, -1);
        renderHistorial();
      });

    document
      .querySelector("#nextMonth")
      .addEventListener("click", () => {
        state.historialMonth = changeMonth(month, 1);
        renderHistorial();
      });

  } catch (error) {
    view.innerHTML = `
      <div class="notice">
        Error: ${error.message}
      </div>
    `;
  }
}

function renderPaymentsTable(payments) {

  if (!payments.length) {

    return `
      <div class="empty">

        No hay pagos registrados.

      </div>
    `;
  }

  return `

  <table class="history-table">

    <thead>

      <tr>

      <th>Cliente</th>

<th>Fecha</th>

<th>Monto</th>

<th>Tipo Pago</th>

<th>Corte</th>

   

      </tr>

    </thead>

   <tbody>

${payments.map(payment => `

<tr class="payment-row">

  <td>

    <div class="client-cell">

      <strong>

        ${payment.client_name}

      </strong>

      <small>

        ${payment.community || "Sin comunidad"}

      </small>

    </div>

  </td>

  <td>

    ${payment.paid_at

      ? new Date(payment.paid_at)

        .toLocaleDateString("es-MX")

      : "-"

    }

  </td>

  <td>

    ${money.format(payment.amount || 0)}

  </td>

  <td>

    ${payment.method || "-"}

  </td>

  <td>

    Día ${payment.cutoff_day || "-"}

  </td>

</tr>

`).join("")}

</tbody>

  </table>

  `;
}
function formatMonth(month) {
  return new Date(`${month}-01`)
    .toLocaleDateString("es-MX", {
      month: "long",
      year: "numeric"
    });
}

function changeMonth(month, offset) {

  const [year, currentMonth] =
    month.split("-").map(Number);

  const date = new Date(
    year,
    currentMonth - 1,
    1
  );

  date.setMonth(
    date.getMonth() + offset
  );

  const newYear =
    date.getFullYear();

  const newMonth =
    String(
      date.getMonth() + 1
    ).padStart(2, "0");

  return `${newYear}-${newMonth}`;

}