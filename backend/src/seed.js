import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { closeDb, pool, query } from "./db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const schema = await fs.readFile(path.join(__dirname, "schema.sql"), "utf8");
  await query(schema);

  const raw = await fs.readFile(path.join(__dirname, "seed-data.json"), "utf8");
  const data = JSON.parse(raw);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    for (const item of data.clients) {
      await client.query(
        `INSERT INTO clients (name, community, cutoff_day, monthly_fee, phone, address, notes, active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (name_key) DO UPDATE SET
           community = COALESCE(NULLIF(clients.community, ''), EXCLUDED.community),
           cutoff_day = COALESCE(clients.cutoff_day, EXCLUDED.cutoff_day),
           monthly_fee = COALESCE(clients.monthly_fee, EXCLUDED.monthly_fee),
           notes = CASE
             WHEN clients.notes = '' THEN EXCLUDED.notes
             WHEN clients.notes LIKE '%' || EXCLUDED.notes || '%' THEN clients.notes
             ELSE clients.notes || ' | ' || EXCLUDED.notes
           END,
           active = TRUE,
           updated_at = NOW()`,
        [
          item.name,
          item.community || "Sin comunidad",
          item.cutoffDay,
          item.monthlyFee,
          item.phone || "",
          item.address || "",
          item.notes || "",
          item.active !== false,
        ],
      );
    }

    for (const payment of data.payments) {
      await client.query(
        `INSERT INTO payments (client_id, payment_month, paid_at, amount, status, method, notes)
         SELECT id, $2::date, CASE WHEN $4 = 'pagado' THEN CURRENT_DATE ELSE NULL END, $3, $4, $5, $6
         FROM clients
         WHERE LOWER(TRIM(name)) = LOWER(TRIM($1))
         ON CONFLICT (client_id, payment_month) DO UPDATE SET
           amount = COALESCE(EXCLUDED.amount, payments.amount),
           status = EXCLUDED.status,
           method = EXCLUDED.method,
           notes = EXCLUDED.notes,
           updated_at = NOW()`,
        [
          payment.clientName,
          payment.paymentMonth,
          payment.amount,
          payment.status,
          payment.method || "efectivo",
          [payment.notes, payment.source].filter(Boolean).join(" - "),
        ],
      );
    }

    await client.query("COMMIT");
    console.log(`Seed listo: ${data.clients.length} clientes, ${data.payments.length} pagos.`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await closeDb();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
