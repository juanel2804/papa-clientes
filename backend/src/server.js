import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createToken, requireAuth, validateLogin } from "./auth.js";
import { hasDatabase, query } from "./db.js";
import {
  createLocalClient,
  deleteLocalClient,
  getLocalClients,
  getLocalDashboard,
  getLocalPayments,
  saveLocalPayment,
  updateLocalClient,
} from "./local-store.js";
import { seedDatabase } from "./seed.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const port = process.env.PORT || 4000;
const frontendOrigin = process.env.FRONTEND_ORIGIN || "*";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": frontendOrigin,
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  };
}

function send(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    ...corsHeaders(),
  });
  res.end(JSON.stringify(data));
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function monthStart(input) {
  const value = input || new Date().toISOString().slice(0, 7);
  return `${value.slice(0, 7)}-01`;
}

function dueSoonSql() {
  const today = new Date();
  const days = [];
  for (let i = 0; i < 8; i += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    days.push(date.getDate());
  }
  return days;
}

async function ensureSchema() {
  if (!hasDatabase) {
    await seedDatabase();
    return;
  }
  const schema = await fs.readFile(path.join(__dirname, "schema.sql"), "utf8");
  await query(schema);
}

async function handleLogin(req, res) {
  const { username, password } = await readBody(req);
  if (!validateLogin(username, password)) {
    return send(res, 401, { error: "Usuario o contrasena incorrectos" });
  }
  return send(res, 200, {
    token: createToken({ username }),
    user: { username },
  });
}

async function getDashboard(req, res, url) {
  const paymentMonth = monthStart(url.searchParams.get("month"));
  const dueDays = dueSoonSql();

  if (!hasDatabase) {
    return send(res, 200, await getLocalDashboard(paymentMonth, dueDays));
  }

  const [
  { rows: totals },
  { rows: byCommunity },
  { rows: dueSoon },
  { rows: latestPayments },
  { rows: revenue },
  { rows: pendingClients }
] = await Promise.all([
    query(
      `SELECT
        COUNT(*) FILTER (WHERE active) AS total_clients,
        COUNT(*) FILTER (
  WHERE active
  AND cutoff_day = ANY($2::int[])
  AND NOT EXISTS (
    SELECT 1
    FROM payments p
    WHERE p.client_id = clients.id
    AND p.payment_month = $1::date
    AND p.status = 'pagado'
  )
) AS due_soon,
        COUNT(*) FILTER (WHERE active AND EXISTS (
          SELECT 1 FROM payments p
          WHERE p.client_id = clients.id AND p.payment_month = $1::date AND p.status = 'pagado'
        )) AS paid_this_month,
        COUNT(*) FILTER (
  WHERE active
  AND cutoff_day <= EXTRACT(DAY FROM CURRENT_DATE)
  AND NOT EXISTS (
    SELECT 1
    FROM payments p
    WHERE p.client_id = clients.id
    AND p.payment_month = $1::date
    AND p.status = 'pagado'
  )
) AS pending_this_month,
        COUNT(*) FILTER (
  WHERE active
  AND status = 'suspendido'
  AND suspension_until >= CURRENT_DATE
) AS suspended_clients

       FROM clients`,
      [paymentMonth, dueDays],
    ),
    query(
      `SELECT community, COUNT(*)::int AS total
       FROM clients
       WHERE active
       GROUP BY community
       ORDER BY total DESC, community ASC`,
    ),
    query(
      `SELECT
  c.id,
  c.name,
  c.community,
  c.cutoff_day

FROM clients c

WHERE c.active = TRUE

AND c.cutoff_day = ANY($1::int[])

AND NOT EXISTS (
  SELECT 1
  FROM payments p
  WHERE p.client_id = c.id
  AND p.payment_month = $2::date
  AND p.status = 'pagado'
)

ORDER BY
  c.cutoff_day ASC,
  c.name ASC

LIMIT 20`,
      [dueDays, paymentMonth]
    ),
    query(
      `SELECT p.id, c.name AS client_name, p.payment_month, p.amount, p.status, p.method, p.notes, p.updated_at
       FROM payments p
       JOIN clients c ON c.id = p.client_id
       ORDER BY p.updated_at DESC
       LIMIT 12`,
    ),
      query(
  `
  SELECT
    COALESCE(SUM(monthly_fee),0) AS expected_revenue,

    COALESCE(
      (
        SELECT SUM(amount)
        FROM payments
        WHERE payment_month = $1::date
        AND status = 'pagado'
      ),
      0
    ) AS collected_revenue

  FROM clients
  WHERE active = TRUE
  `,
  [paymentMonth]
),

query(
  `
  SELECT
  c.id,
  c.name,
  c.community,
  c.cutoff_day,
  c.monthly_fee

FROM clients c

WHERE c.active = TRUE

AND c.cutoff_day <= EXTRACT(DAY FROM CURRENT_DATE)

AND NOT EXISTS (
  SELECT 1
  FROM payments p
  WHERE p.client_id = c.id
  AND p.payment_month = $1::date
  AND p.status = 'pagado'
)

  ORDER BY
    c.cutoff_day ASC,
    c.name ASC

  LIMIT 20
  `,
  [paymentMonth]
),
  ]);
  const expectedRevenue =
  Number(
    revenue[0]?.expected_revenue || 0
  );

const collectedRevenue =
  Number(
    revenue[0]?.collected_revenue || 0
  );

const collectionRate =
  expectedRevenue > 0
    ? Math.round(
        (collectedRevenue / expectedRevenue) * 100
      )
    : 0;

  return send(res, 200, {
  month: paymentMonth,

  totals: totals[0],

  byCommunity,

  dueSoon,

  latestPayments,

  pendingClients,

  expectedRevenue,

  collectedRevenue,

  collectionRate
});

}

async function getClients(req, res, url) {
  if (!hasDatabase) {
    const data = await getLocalClients({
      search: url.searchParams.get("q") || "",
      community: url.searchParams.get("community") || "",
    });
    return send(res, 200, data);
  }

  const search = `%${(url.searchParams.get("q") || "").trim()}%`;
  const community = url.searchParams.get("community");
  const params = [search];
  let communityFilter = "";
  if (community) {
    params.push(community);
    communityFilter = `AND community = $${params.length}`;
  }

  const { rows } = await query(
  `SELECT
      c.*,

      CASE
  WHEN c.status = 'suspendido'
       AND c.suspension_until >= CURRENT_DATE
       THEN 'suspendido'

  WHEN lp.status = 'pagado'
       THEN 'pagado'

  WHEN c.cutoff_day <= EXTRACT(DAY FROM CURRENT_DATE)
       THEN 'pendiente'

  ELSE 'proximo'
END AS latest_status,

      lp.payment_month AS latest_payment_month

   FROM clients c

   LEFT JOIN payments lp
     ON lp.client_id = c.id
    AND lp.payment_month = DATE_TRUNC('month', CURRENT_DATE)

   WHERE c.active = TRUE
     AND (c.name ILIKE $1 OR c.community ILIKE $1 OR c.phone ILIKE $1)
     ${communityFilter}

   ORDER BY c.cutoff_day NULLS LAST, c.name ASC`,
  params,
);
  return send(res, 200, { clients: rows });
}

async function createClient(req, res) {
  const body = await readBody(req);
  if (!hasDatabase) return send(res, 201, await createLocalClient(body));

  const { rows } = await query(
    `INSERT INTO clients (
  name,
  community,
  cutoff_day,
  monthly_fee,
  phone,
  address,
  notes,
  active,
  status,
  suspension_until
)
VALUES (
  $1,$2,$3,$4,$5,$6,$7,TRUE,$8,$9
)
RETURNING *`,
    [
  body.name,
  body.community || "Sin comunidad",
  body.cutoffDay || null,
  body.monthlyFee || null,
  body.phone || "",
  body.address || "",
  body.notes || "",
  body.status || "activo",
  body.suspensionUntil || null,
]
  );
  return send(res, 201, { client: rows[0] });
}

async function updateClient(req, res, id) {
  const body = await readBody(req);
  if (!hasDatabase) {
    const data = await updateLocalClient(id, body);
    return data ? send(res, 200, data) : send(res, 404, { error: "Cliente no encontrado" });
  }

  const { rows } = await query(
    `UPDATE clients SET
   name = $2,
   community = $3,
   cutoff_day = $4,
   monthly_fee = $5,
   phone = $6,
   address = $7,
   notes = $8,
   active = $9,
   status = $10,
   suspension_until = $11,
   updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [
  id,
  body.name,
  body.community || "Sin comunidad",
  body.cutoffDay || null,
  body.monthlyFee || null,
  body.phone || "",
  body.address || "",
  body.notes || "",
  body.active !== false,
  body.status || "activo",
  body.suspensionUntil || null,
],
  );
  return rows[0] ? send(res, 200, { client: rows[0] }) : send(res, 404, { error: "Cliente no encontrado" });
}

async function deleteClient(req, res, id) {
  if (!hasDatabase) return send(res, 200, await deleteLocalClient(id));

  await query("UPDATE clients SET active = FALSE, updated_at = NOW() WHERE id = $1", [id]);
  return send(res, 200, { ok: true });
}

async function getPayments(req, res, url) {
  const paymentMonth = monthStart(url.searchParams.get("month"));
  if (!hasDatabase) return send(res, 200, await getLocalPayments(paymentMonth));

  const { rows } = await query(
    `SELECT
       p.id,
       c.id AS client_id,
       $1::date AS payment_month,
       p.paid_at,
       COALESCE(p.amount, c.monthly_fee) AS amount,
       COALESCE(p.status, 'pendiente') AS status,
       COALESCE(p.method, 'efectivo') AS method,
       COALESCE(p.notes, '') AS notes,
       c.name AS client_name,
       c.community,
       c.cutoff_day
     FROM clients c
     LEFT JOIN payments p
       ON p.client_id = c.id
      AND p.payment_month = $1::date
     WHERE c.active = TRUE
     ORDER BY c.cutoff_day NULLS LAST, c.name ASC`,
    [paymentMonth],
  );
  return send(res, 200, { month: paymentMonth, payments: rows });
}
async function getHistory(req, res, url) {

  const paymentMonth = monthStart(
    url.searchParams.get("month")
  );

  if (!hasDatabase) {

    return send(
      res,
      200,
      {
        month: paymentMonth,
        payments: []
      }
    );
  }

  const { rows } = await query(

  `SELECT

      p.id,

      c.id AS client_id,

      c.name AS client_name,

      c.community,

      c.cutoff_day,

      p.amount,

      p.status,

      p.method,

      p.paid_at,

      p.updated_at

   FROM payments p

   JOIN clients c

     ON c.id = p.client_id

   WHERE

     p.payment_month = $1::date

   AND

     p.status = 'pagado'

   ORDER BY

     p.paid_at DESC,

     c.name ASC

  `,

  [paymentMonth]

  );

  return send(

    res,

    200,

    {

      month: paymentMonth,

      payments: rows

    }

  );

}
async function savePayment(req, res) {
  const body = await readBody(req);
  if (!hasDatabase) return send(res, 200, await saveLocalPayment(body));

  const paidAt = body.status === "pagado" ? (body.paidAt || new Date().toISOString().slice(0, 10)) : null;
  const { rows } = await query(
    `INSERT INTO payments (client_id, payment_month, paid_at, amount, status, method, notes)
     VALUES ($1, $2::date, $3, $4, $5, $6, $7)
     ON CONFLICT (client_id, payment_month) DO UPDATE SET
       paid_at = EXCLUDED.paid_at,
       amount = EXCLUDED.amount,
       status = EXCLUDED.status,
       method = EXCLUDED.method,
       notes = EXCLUDED.notes,
       updated_at = NOW()
     RETURNING *`,
    [
      body.clientId,
      monthStart(body.paymentMonth),
      paidAt,
      body.amount ?? null,
      body.status || "pagado",
      body.method || "efectivo",
      body.notes || "",
    ],
  );
  return send(res, 200, { payment: rows[0] });
}

async function runSeed(req, res) {
  const result = await seedDatabase();
  return send(res, 200, {
    ok: true,
    message: `Seed listo: ${result.clients} clientes, ${result.payments} pagos.`,
    ...result,
  });
}

async function router(req, res) {
  if (req.method === "OPTIONS") {
    res.writeHead(204, corsHeaders());
    return res.end();
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (req.method === "GET" && url.pathname === "/health") return send(res, 200, { ok: true });
    if (req.method === "POST" && url.pathname === "/api/auth/login") return handleLogin(req, res);

    if (!requireAuth(req, res)) return;

    if (req.method === "GET" && url.pathname === "/api/dashboard") return getDashboard(req, res, url);
    if (req.method === "POST" && url.pathname === "/api/admin/seed") return runSeed(req, res);
    if (req.method === "GET" && url.pathname === "/api/clients") return getClients(req, res, url);
    if (req.method === "POST" && url.pathname === "/api/clients") return createClient(req, res);

    const clientMatch = url.pathname.match(/^\/api\/clients\/(\d+)$/);
    if (clientMatch && req.method === "PUT") return updateClient(req, res, clientMatch[1]);
    if (clientMatch && req.method === "DELETE") return deleteClient(req, res, clientMatch[1]);

    if (req.method === "GET" && url.pathname === "/api/payments") return getPayments(req, res, url);
    if (
req.method === "GET"

&&

url.pathname === "/api/history"
)

return getHistory(
req,
res,
url
);
    if (req.method === "POST" && url.pathname === "/api/payments") return savePayment(req, res);

    return send(res, 404, { error: "Ruta no encontrada" });
  } catch (error) {
    console.error(error);
    return send(res, 500, { error: "Error del servidor", details: error.message });
  }
}

await ensureSchema();
http.createServer(router).listen(port, () => {
  console.log(`API lista en puerto ${port}`);
});
