import { state } from "../app.js";
import { api } from "../api.js";
import { escapeHtml, money } from "../utils.js";

export async function renderClientes() {
  const view = document.querySelector("#view");
  await loadClients();

  view.innerHTML = `
    <section class="clientes-view">
      <div class="section-head">
        <div>
          <h2>Clientes</h2>
          <p>Altas, datos de contacto, comunidad y dia de corte.</p>
        </div>
        <button class="primary" id="newClientBtn">Nuevo cliente</button>
      </div>

      <div class="toolbar">
        <input id="clientSearch" placeholder="Buscar cliente, comunidad o telefono" value="${escapeHtml(state.search)}">
        <button class="ghost" id="searchClientBtn">Buscar</button>
      </div>

      <div class="client-layout">
        <section class="panel">
          <h3>${state.editingClient ? "Editar cliente" : "Registrar cliente"}</h3>
          ${renderForm(state.editingClient)}
        </section>

        <section class="panel">
          <h3>Lista de clientes</h3>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Comunidad</th>
                  <th>Corte</th>
                  <th>Mensualidad</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                ${renderRows()}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </section>
  `;

  document.querySelector("#clientForm").addEventListener("submit", saveClient);
  document.querySelector("#cancelEditBtn")?.addEventListener("click", () => {
    state.editingClient = null;
    renderClientes();
  });
  document.querySelector("#newClientBtn").addEventListener("click", () => {
    state.editingClient = null;
    renderClientes();
  });
  document.querySelector("#searchClientBtn").addEventListener("click", searchClients);
  document.querySelector("#clientSearch").addEventListener("keydown", (event) => {
    if (event.key === "Enter") searchClients();
  });

  document.querySelectorAll("[data-edit-client]").forEach((button) => {
    button.addEventListener("click", () => {
      state.editingClient = state.clients.find((client) => String(client.id) === button.dataset.editClient);
      renderClientes();
    });
  });

  document.querySelectorAll("[data-delete-client]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!confirm("Deseas dar de baja este cliente?")) return;
      await api(`/api/clients/${button.dataset.deleteClient}`, { method: "DELETE" });
      clearLoadedData();
      await renderClientes();
    });
  });
}

async function loadClients() {
  const data = await api(`/api/clients?q=${encodeURIComponent(state.search || "")}`);
  state.clients = data.clients || [];
}

function renderForm(client) {
  return `
    <form id="clientForm" class="form-grid">
      <label>
        Nombre
        <input name="name" required value="${escapeHtml(client?.name || "")}">
      </label>

      <label>
        Comunidad
        <input name="community" value="${escapeHtml(client?.community || "Sin comunidad")}">
      </label>

      <label>
        Dia de corte
        <input name="cutoffDay" type="number" min="1" max="31" value="${escapeHtml(client?.cutoff_day || "")}">
      </label>

      <label>
        Mensualidad
        <input name="monthlyFee" type="number" min="0" step="1" value="${escapeHtml(client?.monthly_fee || "")}">
      </label>

      <label>
        Telefono
        <input name="phone" value="${escapeHtml(client?.phone || "")}">
      </label>

      <label>
        Direccion
        <input name="address" value="${escapeHtml(client?.address || "")}">
      </label>

      <label class="wide">
        Notas
        <textarea name="notes">${escapeHtml(client?.notes || "")}</textarea>
      </label>

      <div class="actions wide">
        <button class="primary" type="submit">${client ? "Guardar cambios" : "Guardar cliente"}</button>
        ${client ? `<button class="ghost" type="button" id="cancelEditBtn">Cancelar</button>` : ""}
      </div>
    </form>
  `;
}

function renderRows() {
  if (!state.clients.length) {
    return `<tr><td colspan="6" class="empty">No hay clientes con esa busqueda.</td></tr>`;
  }

  return state.clients.map((client) => `
    <tr>
      <td>
        <strong>${escapeHtml(client.name)}</strong>
        <small>${escapeHtml(client.phone || "")}</small>
      </td>
      <td>${escapeHtml(client.community || "")}</td>
      <td>Dia ${client.cutoff_day || "-"}</td>
      <td>${client.monthly_fee ? money.format(client.monthly_fee) : "-"}</td>
      <td><span class="tag ${client.latest_status || "pendiente"}">${escapeHtml(client.latest_status || "sin pago")}</span></td>
      <td>
        <div class="actions">
          <button class="ghost" data-edit-client="${client.id}">Editar</button>
          <button class="danger" data-delete-client="${client.id}">Baja</button>
        </div>
      </td>
    </tr>
  `).join("");
}

async function saveClient(event) {
  event.preventDefault();
  const form = new FormData(event.target);
  const body = {
    name: form.get("name"),
    community: form.get("community"),
    cutoffDay: Number(form.get("cutoffDay")) || null,
    monthlyFee: Number(form.get("monthlyFee")) || null,
    phone: form.get("phone"),
    address: form.get("address"),
    notes: form.get("notes"),
  };

  if (state.editingClient) {
    await api(`/api/clients/${state.editingClient.id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  } else {
    await api("/api/clients", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  state.editingClient = null;
  clearLoadedData();
  await renderClientes();
}

function searchClients() {
  state.search = document.querySelector("#clientSearch").value.trim();
  renderClientes();
}

function clearLoadedData() {
  state.dashboard = null;
  state.payments = [];
}
