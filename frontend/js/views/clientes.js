import { state } from "../app.js";
import { api } from "../api.js";
import { escapeHtml, money } from "../utils.js";
import { confirmDialog, openModal, toast } from "../ui.js";

export async function renderClientes() {
  const view = document.querySelector("#view");
  await loadClients();

  view.innerHTML = `
    <section class="clientes-view">
      <div class="section-head compact-head">
        <div>
          <h2>Clientes</h2>
          <p>Altas, contacto, comunidad y dia de corte.</p>
        </div>
        <button class="primary" id="newClientBtn" type="button">Nuevo cliente</button>
      </div>

      <div class="toolbar search-bar">
        <input id="clientSearch" placeholder="Buscar cliente, comunidad o telefono" value="${escapeHtml(state.search)}">
        <button class="ghost" id="searchClientBtn" type="button">Buscar</button>
      </div>

      <section class="panel clients-panel">
        <div class="panel-title">
          <h3>Lista de clientes</h3>
          <span>${state.clients.length} registros</span>
        </div>
        <div class="client-list">
          ${renderClientCards()}
        </div>
      </section>
    </section>
  `;

  document.querySelector("#newClientBtn").addEventListener("click", () => openClientModal());
  document.querySelector("#searchClientBtn").addEventListener("click", searchClients);
  document.querySelector("#clientSearch").addEventListener("keydown", (event) => {
    if (event.key === "Enter") searchClients();
  });

  document.querySelectorAll("[data-edit-client]").forEach((button) => {
    button.addEventListener("click", () => {
      const client = state.clients.find((item) => String(item.id) === button.dataset.editClient);
      openClientModal(client);
    });
  });

  document.querySelectorAll("[data-delete-client]").forEach((button) => {
    button.addEventListener("click", async () => {
      const client = state.clients.find((item) => String(item.id) === button.dataset.deleteClient);
      const ok = await confirmDialog({
        title: "Dar de baja cliente",
        message: `Estas seguro de dar de baja a ${escapeHtml(client?.name || "este cliente")}?`,
        confirmText: "Si, dar de baja",
        danger: true,
      });
      if (!ok) return;

      await api(`/api/clients/${button.dataset.deleteClient}`, { method: "DELETE" });
      clearLoadedData();
      toast("Cliente dado de baja", "warning");
      await renderClientes();
    });
  });
}

async function loadClients() {
  const data = await api(`/api/clients?q=${encodeURIComponent(state.search || "")}`);
  state.clients = data.clients || [];
}

function renderClientCards() {
  if (!state.clients.length) {
    return `<div class="empty">No hay clientes con esa busqueda.</div>`;
  }

  return state.clients.map((client) => `
    <article class="client-card">
      <div class="client-main">
        <div>
          <strong>${escapeHtml(client.name)}</strong>
          <small>${escapeHtml(client.community || "Sin comunidad")}</small>
        </div>
       <span class="tag ${client.latest_status}">
  ${client.latest_status} </span>
      </div>

      <dl class="client-meta">
        <div>
          <dt>Corte</dt>
          <dd>Dia ${client.cutoff_day || "-"}</dd>
        </div>
        <div>
          <dt>Mensualidad</dt>
          <dd>${client.monthly_fee ? money.format(client.monthly_fee) : "-"}</dd>
        </div>
        <div>
          <dt>Telefono</dt>
          <dd>${escapeHtml(client.phone || "-")}</dd>
        </div>
      </dl>

      <div class="card-actions">
        <button class="ghost" data-edit-client="${client.id}" type="button">Editar</button>
        <button class="danger" data-delete-client="${client.id}" type="button">Baja</button>
      </div>
    </article>
  `).join("");
}

function openClientModal(client = null) {
  const title = client ? "Editar cliente" : "Registrar cliente";
  const submitText = client ? "Guardar cambios" : "Registrar cliente";

  openModal(`
    <section class="modal-card client-modal" role="dialog" aria-modal="true">
      <header class="modal-head">
        <div>
          <h3>${title}</h3>
          <p>${client ? "Actualiza los datos del cliente." : "Llena los campos del nuevo cliente."}</p>
        </div>
        <button class="icon-close" data-close-modal type="button" aria-label="Cerrar">x</button>
      </header>

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

        <div class="modal-actions wide">
          <button class="ghost" data-close-modal type="button">Cancelar</button>
          <button class="primary" type="submit">${submitText}</button>
        </div>
      </form>
    </section>
  `, (overlay, close) => {
    overlay.querySelector("#clientForm").addEventListener("submit", (event) => saveClient(event, client, close));
  });
}

async function saveClient(event, client, close) {
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

  const ok = await confirmDialog({
    title: client ? "Guardar cambios" : "Registrar cliente",
    message: client
      ? "Estas seguro de guardar los cambios de este cliente?"
      : "Estas seguro de registrar este nuevo cliente?",
    confirmText: client ? "Si, guardar" : "Si, registrar",
  });
  if (!ok) return;

  if (client) {
    await api(`/api/clients/${client.id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
    toast("Cambios guardados");
  } else {
    await api("/api/clients", {
      method: "POST",
      body: JSON.stringify(body),
    });
    toast("Cliente registrado");
  }

  close();
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
