import crypto from "node:crypto";
import { authenticateAdmin, readUsers, writeUsers, hash, normalize, safeUser, fail } from "../../../lib/auth";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  try { const { error } = await authenticateAdmin(); if (error) return error; return Response.json({ users:(await readUsers()).map(safeUser) }); }
  catch { return fail("Falha ao carregar usuários.", 503); }
}
export async function POST(req) {
  try {
    const { error, user } = await authenticateAdmin(); if (error) return error;
    const body = await req.json(); const users = await readUsers();
    const action = body.action || "create";
    if (action === "create") {
      const email = normalize(body.email), name = String(body.name || "").trim(), password = String(body.password || "");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || name.length < 2) return fail("Informe nome e e-mail válidos.");
      if (password.length < 12 || password.length > 128) return fail("A senha provisória deve ter entre 12 e 128 caracteres.");
      if (users.some(u => u.email === email)) return fail("Esse e-mail já está cadastrado.");
      users.push({ id:crypto.randomUUID(), name, email, password:hash(password), role:body.role === "admin" ? "admin" : "user", active:true, changePassword:true, createdAt:new Date().toISOString() });
    } else if (action === "toggle") {
      const target = users.find(u => u.id === body.id); if (!target) return fail("Usuário não encontrado.", 404);
      if (target.id === user.id || target.id === "owner") return fail("Não é permitido desativar esta conta.");
      target.active = !target.active;
    } else if (action === "reset") {
      const target = users.find(u => u.id === body.id); if (!target) return fail("Usuário não encontrado.", 404);
      const password = String(body.password || ""); if (password.length < 12 || password.length > 128) return fail("A senha provisória deve ter entre 12 e 128 caracteres.");
      target.password = hash(password); target.changePassword = true;
    } else return fail("Ação inválida.");
    await writeUsers(users);
    return Response.json({ users: users.map(safeUser) });
  } catch { return fail("Não foi possível salvar. Tente novamente.", 500); }
}
