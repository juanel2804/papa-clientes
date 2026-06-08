const app = document.querySelector("#app");
const config = window.APP_CONFIG || {};
const apiBase = (config.API_BASE_URL || "").replace(/\/$/, "");

const state = {
  token: localStorage.getItem("clientes_token") || "",
  view: "dashboard",
  clients: [],
  dashboard: null,
  payments: [],
  editingClient: null,
  search: "",
  month: new Date().toISOString().slice(0, 7),
  error: "",
};

const money = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

function monthLabel(value) {
  if (!value) return "";
  const date = new Date(`${value.slice(0, 7)}-02T00:00:00`);
  return date.toLocaleDateString("es-MX", { month: "long", year: "numeric" });
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function api(path, options = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) logout();
    throw new Error(data.error || "No se pudo completar la accion");
  }
  return data;
}

function setView(view) {
  state.view = view;
  state.error = "";
  render();
  loadCurrentView();
}

function logout() {
  state.token = "";
  localStorage.removeItem("clientes_token");
  render();
}

async function login(event) {
  event.preventDefault();
  const form = new FormData(event.target);
  try {
    const data = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        username: form.get("username"),
        password: form.get("password"),
      }),
    });
    state.token = data.token;
    localStorage.setItem("clientes_token", data.token);
    state.error = "";
    render();
    loadCurrentView();
  } catch (error) {
    state.error = error.message;
    renderLogin();
  }
}

async function loadDashboard() {
  const data = await api(`/api/dashboard?month=${state.month}`);
  state.dashboard = data;
  render();
}

async function loadClients() {
  const data = await api(`/api/clients?q=${encodeURIComponent(state.search)}`);
  state.clients = data.clients;
  render();
}

async function loadPayments() {
  const data = await api(`/api/payments?month=${state.month}`);
  state.payments = data.payments;
  if (!state.clients.length) {
    const clients = await api("/api/clients");
    state.clients = clients.clients;
  }
  render();
}

async function loadCurrentView() {
  try {
    if (!state.token) return;
    if (state.view === "dashboard") await loadDashboard();
    if (state.view === "clientes") await loadClients();
    if (state.view === "pagos") await loadPayments();
  } catch (error) {
    state.error = error.message;
    render();
  }
}

function renderLogin() {
  app.innerHTML = `
    <section class="login-screen">
      <form class="login-box" id="loginForm">
        <div class="mark">CP</div>
        <h1>Control de clientes</h1>
        <p>Inicia sesion para revisar clientes, cortes y pagos.</p>
        ${state.error ? `<div class="notice">${escapeHtml(state.error)}</div>` : ""}
        <div class="grid">
          <label>Usuario
            <input name="username" autocomplete="username" required />
          </label>
          <label>Contrasena
            <input name="password" type="password" autocomplete="current-password" required />
          </label>
          <button class="primary" type="submit">Entrar</button>
        </div>
      </form>
    </section>
  `;
  document.querySelector("#loginForm").addEventListener("submit", login);
}

function renderShell(content) {
  app.innerHTML = `
    <section class="shell">
      <header class="topbar">
        <div class="brand">
          <div class="mark">CP</div>
          <div>
            <h1>Control de Clientes</h1>
            <p>Internet, cortes y pagos</p>
          </div>
        </div>
        <nav class="nav">
          <button class="${state.view === "dashboard" ? "active" : ""}" data-view="dashboard">Dashboard</button>
          <button class="${state.view === "clientes" ? "active" : ""}" data-view="clientes">Clientes</button>
          <button class="${state.view === "pagos" ? "active" : ""}" data-view="pagos">Pagos</button>
        </nav>
        <button class="ghost" id="logoutBtn">Salir</button>
      </header>
      <div class="content">
        ${state.error ? `<div class="notice">${escapeHtml(state.error)}</div>` : ""}
        ${content}
      </div>
    </section>
  `;

  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.view));
  });
  document.querySelector("#logoutBtn").addEventListener("click", logout);
}

function renderDashboard() {
  const data = state.dashboard;
  const totals = data?.totals || {};
  renderShell(`
    <div class="section-head">
      <div>
        <h2>Dashboard</h2>
        <p>Resumen para ${monthLabel(state.month)}.</p>
      </div>
      <label>Mes
        <input id="dashboardMonth" type="month" value="${state.month}" />
      </label>
    </div>
    <section class="grid kpis">
      <div class="kpi"><span>Clientes activos</span><strong>${totals.total_clients || 0}</strong></div>
      <div class="kpi"><span>Pagados</span><strong>${totals.paid_this_month || 0}</strong></div>
      <div class="kpi"><span>Pendientes</span><strong>${totals.pending_this_month || 0}</strong></div>
      <div class="kpi"><span>Corte pronto</span><strong>${totals.due_soon || 0}</strong></div>
      <div class="kpi"><span>Suspendidos</span><strong>${totals.suspended_clients || 0}</strong></div>
    </section>
    <section class="grid two" style="margin-top:16px">
      <div class="panel">
        <h3>Comunidades</h3>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Comunidad</th><th>Clientes</th></tr></thead>
            <tbody>
              ${(data?.byCommunity || []).map((item) => `
                <tr><td>${escapeHtml(item.community)}</td><td>${item.total}</td></tr>
              `).join("") || `<tr><td colspan="2" class="empty">Sin datos todavia</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
      <div class="panel">
        <h3>Cortes proximos</h3>
        <div class="mini-list">
          ${(data?.dueSoon || []).map((client) => `
            <div class="mini-item">
              <div>
                <strong>${escapeHtml(client.name)}</strong>
                <span>${escapeHtml(client.community)}</span>
              </div>
              <span class="tag">Dia ${client.cutoff_day}</span>
            </div>
          `).join("") || `<div class="empty">No hay cortes en los proximos dias.</div>`}
        </div>
      </div>
    </section>
    <section class="panel" style="margin-top:16px">
      <h3>Ultimos movimientos</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Cliente</th><th>Mes</th><th>Estado</th><th>Monto</th><th>Nota</th></tr></thead>
          <tbody>
            ${(data?.latestPayments || []).map((payment) => `
              <tr>
                <td>${escapeHtml(payment.client_name)}</td>
                <td>${monthLabel(payment.payment_month)}</td>
                <td><span class="tag ${payment.status}">${escapeHtml(payment.status)}</span></td>
                <td>${payment.amount ? money.format(payment.amount) : "-"}</td>
                <td>${escapeHtml(payment.notes || "")}</td>
              </tr>
            `).join("") || `<tr><td colspan="5" class="empty">Sin pagos registrados.</td></tr>`}
          </tbody>
        </table>
      </div>
    </section>
  `);

  document.querySelector("#dashboardMonth").addEventListener("change", (event) => {
    state.month = event.target.value;
    loadDashboard();
  });
}

function clientForm(client = {}) {
  return `
    <form id="clientForm" class="form-grid">
      <label>Nombre
        <input name="name" required value="${escapeHtml(client.name || "")}" />
      </label>
      <label>Comunidad
        <input name="community" value="${escapeHtml(client.community || "Sin comunidad")}" />
      </label>
      <label>Dia de corte
        <input name="cutoffDay" type="number" min="1" max="31" value="${client.cutoff_day || client.cutoffDay || ""}" />
      </label>
      <label>Mensualidad
        <input name="monthlyFee" type="number" min="0" step="0.01" value="${client.monthly_fee || client.monthlyFee || ""}" />
      </label>
      <label>Telefono
        <input name="phone" value="${escapeHtml(client.phone || "")}" />
      </label>
      <label>Direccion
        <input name="address" value="${escapeHtml(client.address || "")}" />
      </label>
      <label class="wide">Notas
        <textarea name="notes">${escapeHtml(client.notes || "")}</textarea>
      </label>
      <div class="actions wide">
        <button class="primary" type="submit">${state.editingClient ? "Guardar cambios" : "Agregar cliente"}</button>
        ${state.editingClient ? `<button class="ghost" type="button" id="cancelEdit">Cancelar</button>` : ""}
      </div>
    </form>
  `;
}

function renderClients() {
  renderShell(`
    <div class="section-head">
      <div>
        <h2>Clientes</h2>
        <p>${state.clients.length} clientes visibles.</p>
      </div>
    </div>
    <section class="grid two">
      <div class="panel">
        <div class="toolbar">
          <input id="clientSearch" placeholder="Buscar cliente, comunidad o telefono" value="${escapeHtml(state.search)}" />
          <button class="ghost" id="searchBtn">Buscar</button>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Nombre</th><th>Comunidad</th><th>Corte</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              ${state.clients.map((client) => `
                <tr>
                  <td><strong>${escapeHtml(client.name)}</strong><br><small>${escapeHtml(client.phone || "")}</small></td>
                  <td>${escapeHtml(client.community)}</td>
                  <td>${client.cutoff_day ? `Dia ${client.cutoff_day}` : "-"}</td>
                  <td><span class="tag ${client.latest_status || ""}">${escapeHtml(client.latest_status || "sin pago")}</span></td>
                  <td class="actions">
                    <button class="ghost" data-edit="${client.id}">Editar</button>
                    <button class="danger" data-delete="${client.id}">Baja</button>
                  </td>
                </tr>
              `).join("") || `<tr><td colspan="5" class="empty">No encontre clientes.</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
      <div class="panel">
        <h3>${state.editingClient ? "Editar cliente" : "Nuevo cliente"}</h3>
        ${clientForm(state.editingClient || {})}
      </div>
    </section>
  `);

  document.querySelector("#searchBtn").addEventListener("click", () => {
    state.search = document.querySelector("#clientSearch").value;
    loadClients();
  });
  document.querySelector("#clientSearch").addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      state.search = event.target.value;
      loadClients();
    }
  });
  document.querySelectorAll("[data-edit]").forEach((button) => {
    button.addEventListener("click", () => {
      state.editingClient = state.clients.find((client) => String(client.id) === button.dataset.edit);
      renderClients();
    });
  });
  document.querySelectorAll("[data-delete]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!confirm("Dar de baja este cliente?")) return;
      await api(`/api/clients/${button.dataset.delete}`, { method: "DELETE" });
      await loadClients();
    });
  });
  const cancel = document.querySelector("#cancelEdit");
  if (cancel) {
    cancel.addEventListener("click", () => {
      state.editingClient = null;
      renderClients();
    });
  }
  document.querySelector("#clientForm").addEventListener("submit", saveClient);
}

async function saveClient(event) {
  event.preventDefault();
  const form = new FormData(event.target);
  const payload = {
    name: form.get("name"),
    community: form.get("community"),
    cutoffDay: Number(form.get("cutoffDay")) || null,
    monthlyFee: Number(form.get("monthlyFee")) || null,
    phone: form.get("phone"),
    address: form.get("address"),
    notes: form.get("notes"),
    active: true,
  };
  const path = state.editingClient ? `/api/clients/${state.editingClient.id}` : "/api/clients";
  const method = state.editingClient ? "PUT" : "POST";
  await api(path, { method, body: JSON.stringify(payload) });
  state.editingClient = null;
  await loadClients();
}

function renderPayments() {
  renderShell(`
    <div class="section-head">
      <div>
        <h2>Pagos</h2>
        <p>Registro mensual para ${monthLabel(state.month)}.</p>
      </div>
      <label>Mes
        <input id="paymentsMonth" type="month" value="${state.month}" />
      </label>
    </div>
    <section class="grid two">
      <div class="panel">
        <h3>Pagos del mes</h3>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Cliente</th><th>Corte</th><th>Estado</th><th>Monto</th><th>Metodo</th><th>Notas</th></tr></thead>
            <tbody>
              ${state.payments.map((payment) => `
                <tr>
                  <td>${escapeHtml(payment.client_name)}</td>
                  <td>${payment.cutoff_day ? `Dia ${payment.cutoff_day}` : "-"}</td>
                  <td><span class="tag ${payment.status}">${escapeHtml(payment.status)}</span></td>
                  <td>${payment.amount ? money.format(payment.amount) : "-"}</td>
                  <td>${escapeHtml(payment.method)}</td>
                  <td>${escapeHtml(payment.notes || "")}</td>
                </tr>
              `).join("") || `<tr><td colspan="6" class="empty">No hay pagos capturados en este mes.</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
      <div class="panel">
        <h3>Registrar pago</h3>
        <form id="paymentForm" class="form-grid">
          <label class="wide">Cliente
            <select name="clientId" required>
              <option value="">Selecciona cliente</option>
              ${state.clients.map((client) => `<option value="${client.id}">${escapeHtml(client.name)} - ${escapeHtml(client.community)}</option>`).join("")}
            </select>
          </label>
          <label>Mes
            <input name="paymentMonth" type="month" value="${state.month}" required />
          </label>
          <label>Estado
            <select name="status">
              <option value="pagado">Pagado</option>
              <option value="pendiente">Pendiente</option>
              <option value="suspendido">Suspendido</option>
              <option value="condonado">Condonado</option>
              <option value="inicio">Inicio</option>
            </select>
          </label>
          <label>Monto
            <input name="amount" type="number" min="0" step="0.01" />
          </label>
          <label>Metodo
            <select name="method">
              <option value="efectivo">Efectivo</option>
              <option value="deposito">Deposito</option>
              <option value="transferencia">Transferencia</option>
              <option value="otro">Otro</option>
            </select>
          </label>
          <label class="wide">Notas
            <textarea name="notes" placeholder="Ej. pendiente 300, pago parcial, revisar"></textarea>
          </label>
          <button class="primary wide" type="submit">Guardar pago</button>
        </form>
      </div>
    </section>
  `);

  document.querySelector("#paymentsMonth").addEventListener("change", (event) => {
    state.month = event.target.value;
    loadPayments();
  });
  document.querySelector("#paymentForm").addEventListener("submit", savePayment);
}

async function savePayment(event) {
  event.preventDefault();
  const form = new FormData(event.target);
  const payload = {
    clientId: Number(form.get("clientId")),
    paymentMonth: form.get("paymentMonth"),
    status: form.get("status"),
    amount: Number(form.get("amount")) || null,
    method: form.get("method"),
    notes: form.get("notes"),
  };
  await api("/api/payments", { method: "POST", body: JSON.stringify(payload) });
  state.month = payload.paymentMonth;
  await loadPayments();
}

function render() {
  if (!state.token) return renderLogin();
  if (state.view === "dashboard") return renderDashboard();
  if (state.view === "clientes") return renderClients();
  return renderPayments();
}

render();
loadCurrentView();
