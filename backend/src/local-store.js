import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "data");
const dataFile = path.join(dataDir, "local-db.json");
const seedFile = path.join(__dirname, "seed-data.json");

function todayIso() {
  return new Date().toISOString();
}

function monthStart(input) {
  const value = input || new Date().toISOString().slice(0, 7);
  return `${value.slice(0, 7)}-01`;
}

function normalizeName(value) {
  return String(value || "").trim().toLowerCase();
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, "utf8"));
}

async function save(db) {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(dataFile, JSON.stringify(db, null, 2));
}

function nextId(items) {
  return items.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
}

function paymentFromSeed(payment, client) {
  return {
    id: 0,
    client_id: client.id,
    payment_month: monthStart(payment.paymentMonth),
    paid_at: payment.status === "pagado" ? new Date().toISOString().slice(0, 10) : null,
    amount: payment.amount ?? null,
    status: payment.status || "pendiente",
    method: payment.method || "efectivo",
    notes: [payment.notes, payment.source].filter(Boolean).join(" - "),
    created_at: todayIso(),
    updated_at: todayIso(),
  };
}

export async function seedLocalDatabase() {
  const seed = await readJson(seedFile);
  const now = todayIso();
  const clients = seed.clients.map((item, index) => ({
    id: index + 1,
    name: item.name,
    community: item.community || "Sin comunidad",
    cutoff_day: item.cutoffDay ?? null,
    monthly_fee: item.monthlyFee ?? null,
    phone: item.phone || "",
    address: item.address || "",
    notes: item.notes || "",
    active: item.active !== false,
    created_at: now,
    updated_at: now,
  }));

  const payments = [];
  for (const item of seed.payments) {
    const client = clients.find((entry) => normalizeName(entry.name) === normalizeName(item.clientName));
    if (!client) continue;
    const payment = paymentFromSeed(item, client);
    payment.id = payments.length + 1;
    payments.push(payment);
  }

  const db = { clients, payments };
  await save(db);
  return {
    clients: clients.length,
    payments: payments.length,
  };
}

export async function loadLocalDatabase() {
  try {
    return await readJson(dataFile);
  } catch {
    await seedLocalDatabase();
    return readJson(dataFile);
  }
}

export async function getLocalDashboard(paymentMonth, dueDays) {
  const db = await loadLocalDatabase();
  const activeClients = db.clients.filter((client) => client.active);
  const paymentsForMonth = db.payments.filter((payment) => payment.payment_month === paymentMonth);
  const paidIds = new Set(paymentsForMonth.filter((payment) => payment.status === "pagado").map((payment) => payment.client_id));
  const pendingIds = new Set(paymentsForMonth.filter((payment) => payment.status === "pendiente").map((payment) => payment.client_id));
  const suspendedIds = new Set(db.payments.filter((payment) => payment.status === "suspendido").map((payment) => payment.client_id));
  const expectedRevenue = activeClients.reduce((sum, client) => sum + Number(client.monthly_fee || 0), 0);
  const collectedRevenue = paymentsForMonth
    .filter((payment) => payment.status === "pagado")
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

  const byCommunityMap = new Map();
  for (const client of activeClients) {
    byCommunityMap.set(client.community, (byCommunityMap.get(client.community) || 0) + 1);
  }

  return {
    month: paymentMonth,
    totals: {
      total_clients: activeClients.length,
      due_soon: activeClients.filter((client) => dueDays.includes(Number(client.cutoff_day))).length,
      paid_this_month: activeClients.filter((client) => paidIds.has(client.id)).length,
      pending_this_month: activeClients.filter((client) => pendingIds.has(client.id)).length,
      suspended_clients: activeClients.filter((client) => suspendedIds.has(client.id)).length,
    },
    byCommunity: [...byCommunityMap.entries()]
      .map(([community, total]) => ({ community, total }))
      .sort((a, b) => b.total - a.total || a.community.localeCompare(b.community)),
    dueSoon: activeClients
      .filter((client) => dueDays.includes(Number(client.cutoff_day)))
      .sort((a, b) => Number(a.cutoff_day || 99) - Number(b.cutoff_day || 99) || a.name.localeCompare(b.name))
      .slice(0, 20),
    latestPayments: db.payments
      .map((payment) => ({ ...payment, client_name: db.clients.find((client) => client.id === payment.client_id)?.name || "" }))
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
      .slice(0, 12),
    pendingClients: activeClients
      .filter((client) => !paidIds.has(client.id))
      .sort((a, b) => Number(a.cutoff_day || 99) - Number(b.cutoff_day || 99) || a.name.localeCompare(b.name))
      .slice(0, 20),
    expectedRevenue,
    collectedRevenue,
    collectionRate: expectedRevenue > 0 ? Math.round((collectedRevenue / expectedRevenue) * 100) : 0,
  };
}

export async function getLocalClients({ search = "", community = "" } = {}) {
  const db = await loadLocalDatabase();
  const needle = search.trim().toLowerCase();
  const clients = db.clients
    .filter((client) => client.active)
    .filter((client) => !community || client.community === community)
    .filter((client) => {
      if (!needle) return true;
      return [client.name, client.community, client.phone].some((value) => String(value || "").toLowerCase().includes(needle));
    })
    .map((client) => {
      const latest = db.payments
        .filter((payment) => payment.client_id === client.id)
        .sort((a, b) => new Date(b.payment_month) - new Date(a.payment_month))[0];
      return {
        ...client,
        latest_status: latest?.status || "",
        latest_payment_month: latest?.payment_month || null,
      };
    })
    .sort((a, b) => Number(a.cutoff_day || 99) - Number(b.cutoff_day || 99) || a.name.localeCompare(b.name));
  return { clients };
}

export async function createLocalClient(body) {
  const db = await loadLocalDatabase();
  const now = todayIso();
  const client = {
    id: nextId(db.clients),
    name: body.name,
    community: body.community || "Sin comunidad",
    cutoff_day: body.cutoffDay || null,
    monthly_fee: body.monthlyFee || null,
    phone: body.phone || "",
    address: body.address || "",
    notes: body.notes || "",
    active: true,
    created_at: now,
    updated_at: now,
  };
  db.clients.push(client);
  await save(db);
  return { client };
}

export async function updateLocalClient(id, body) {
  const db = await loadLocalDatabase();
  const client = db.clients.find((item) => item.id === Number(id));
  if (!client) return null;
  Object.assign(client, {
    name: body.name,
    community: body.community || "Sin comunidad",
    cutoff_day: body.cutoffDay || null,
    monthly_fee: body.monthlyFee || null,
    phone: body.phone || "",
    address: body.address || "",
    notes: body.notes || "",
    active: body.active !== false,
    updated_at: todayIso(),
  });
  await save(db);
  return { client };
}

export async function deleteLocalClient(id) {
  const db = await loadLocalDatabase();
  const client = db.clients.find((item) => item.id === Number(id));
  if (client) {
    client.active = false;
    client.updated_at = todayIso();
    await save(db);
  }
  return { ok: true };
}

export async function getLocalPayments(paymentMonth) {
  const db = await loadLocalDatabase();
  const paymentsByClient = new Map(
    db.payments
      .filter((payment) => payment.payment_month === paymentMonth)
      .map((payment) => [payment.client_id, payment]),
  );
  const payments = db.clients
    .filter((client) => client.active)
    .map((client) => ({
      id: paymentsByClient.get(client.id)?.id || null,
      client_id: client.id,
      payment_month: paymentMonth,
      paid_at: paymentsByClient.get(client.id)?.paid_at || null,
      amount: paymentsByClient.get(client.id)?.amount ?? client.monthly_fee ?? null,
      status: paymentsByClient.get(client.id)?.status || "pendiente",
      method: paymentsByClient.get(client.id)?.method || "efectivo",
      notes: paymentsByClient.get(client.id)?.notes || "",
      client_name: client.name,
      community: client.community,
      cutoff_day: client.cutoff_day,
    }))
    .sort((a, b) => Number(a.cutoff_day || 99) - Number(b.cutoff_day || 99) || a.client_name.localeCompare(b.client_name));
  return { month: paymentMonth, payments };
}

export async function saveLocalPayment(body) {
  const db = await loadLocalDatabase();
  const clientId = Number(body.clientId);
  const paymentMonth = monthStart(body.paymentMonth);
  const now = todayIso();
  let payment = db.payments.find((item) => item.client_id === clientId && item.payment_month === paymentMonth);
  if (!payment) {
    payment = {
      id: nextId(db.payments),
      client_id: clientId,
      payment_month: paymentMonth,
      created_at: now,
    };
    db.payments.push(payment);
  }
  Object.assign(payment, {
    paid_at: body.status === "pagado" ? (body.paidAt || new Date().toISOString().slice(0, 10)) : null,
    amount: body.amount || null,
    status: body.status || "pagado",
    method: body.method || "efectivo",
    notes: body.notes || "",
    updated_at: now,
  });
  await save(db);
  return { payment };
}
