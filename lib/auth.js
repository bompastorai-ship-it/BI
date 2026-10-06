import crypto from "node:crypto";
import { cookies } from "next/headers";
import { get, put } from "@vercel/blob";

const STORE = "bi/usuarios.json";
const ADMIN = (process.env.INITIAL_ADMIN_EMAIL || "admin@bompastor.local").trim().toLowerCase();
const SECRET = process.env.SESSION_SECRET;
export const ready = () => Boolean(SECRET && process.env.INITIAL_ADMIN_PASSWORD && process.env.BLOB_READ_WRITE_TOKEN);
export const normalize = s => String(s || "").trim().toLowerCase();
export const hash = (password, salt = crypto.randomBytes(16).toString("hex")) => salt + ":" + crypto.scryptSync(String(password), salt, 64).toString("hex");
export function compare(password, encoded) {
  try {
    const [salt, saved] = encoded.split(":");
    const calculated = Buffer.from(hash(password, salt).split(":")[1], "hex");
    const actual = Buffer.from(saved, "hex");
    return actual.length === calculated.length && crypto.timingSafeEqual(actual, calculated);
  } catch { return false; }
}
const initial = () => [{ id: "owner", name: "Administrador", email: ADMIN, role: "admin", active: true, changePassword: true, password: hash(process.env.INITIAL_ADMIN_PASSWORD || crypto.randomUUID()), createdAt: new Date().toISOString() }];
export async function readUsers() {
  if (!ready()) throw new Error("Configuração do servidor incompleta.");
  const file = await get(STORE, { access: "private", useCache: false });
  if (!file) return initial();
  return await new Response(file.stream).json();
}
export async function writeUsers(users) {
  await put(STORE, JSON.stringify(users), { access: "private", addRandomSuffix: false, allowOverwrite: true, contentType: "application/json" });
}
function encode(data) { return Buffer.from(JSON.stringify(data)).toString("base64url"); }
function sign(data) { return crypto.createHmac("sha256", SECRET).update(data).digest("base64url"); }
export function tokenFor(user) { const payload = encode({ id: user.id, exp: Date.now() + 12 * 60 * 60 * 1000 }); return payload + "." + sign(payload); }
export function cookieOptions() { return { httpOnly:true, secure:process.env.NODE_ENV === "production", sameSite:"lax", path:"/", maxAge:43200 }; }
export async function currentUser() {
  if (!ready()) return null;
  const value = (await cookies()).get("bp_session")?.value;
  if (!value) return null;
  const parts = value.split(".");
  if (parts.length !== 2 || sign(parts[0]).length !== parts[1].length || !crypto.timingSafeEqual(Buffer.from(sign(parts[0])), Buffer.from(parts[1]))) return null;
  let payload;
  try { payload = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8")); } catch { return null; }
  if (payload.exp < Date.now()) return null;
  const users = await readUsers();
  return users.find(u => u.id === payload.id && u.active) || null;
}
export const safeUser = ({ password, ...u }) => u;
export const fail = (message, status = 400) => Response.json({ error: message }, { status });
export async function authenticateAdmin() {
  const user = await currentUser();
  if (!user) return { error: fail("Sessão expirada.", 401) };
  if (user.changePassword) return { error: fail("Troque sua senha antes de continuar.", 403) };
  if (user.role !== "admin") return { error: fail("Acesso restrito.", 403) };
  return { user };
}
