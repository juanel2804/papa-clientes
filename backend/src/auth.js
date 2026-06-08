import crypto from "node:crypto";

const textEncoder = new TextEncoder();

function base64Url(input) {
  return Buffer.from(input).toString("base64url");
}

function sign(input) {
  const secret = process.env.JWT_SECRET || "cambia-este-secreto";
  return crypto.createHmac("sha256", secret).update(input).digest("base64url");
}

export function createToken(payload) {
  const header = base64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64Url(JSON.stringify({
    ...payload,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 12,
  }));
  const unsigned = `${header}.${body}`;
  return `${unsigned}.${sign(unsigned)}`;
}

export function verifyToken(token) {
  if (!token || token.split(".").length !== 3) return null;
  const [header, body, signature] = token.split(".");
  const unsigned = `${header}.${body}`;
  const expected = sign(unsigned);
  const a = textEncoder.encode(signature);
  const b = textEncoder.encode(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

export function requireAuth(req, res) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const payload = verifyToken(token);
  if (!payload) {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Sesion invalida o expirada" }));
    return null;
  }
  return payload;
}

export function validateLogin(username, password) {
  const adminUser = process.env.ADMIN_USER || "admin";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
  return username === adminUser && password === adminPassword;
}
