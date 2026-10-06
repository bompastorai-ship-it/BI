import { cookies } from "next/headers";
import { ready, readUsers, writeUsers, compare, normalize, tokenFor, cookieOptions, currentUser, safeUser, fail, hash } from "../../../lib/auth";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  if (!ready()) return fail("Configure as variáveis do projeto na Vercel.", 503);
  try { const user = await currentUser(); return Response.json({ user: user ? safeUser(user) : null, embedUrl: user && !user.changePassword ? (process.env.POWERBI_EMBED_URL || "") : "" }); }
  catch { return fail("Erro ao consultar usuários.", 503); }
}
export async function POST(req) {
  if (!ready()) return fail("Servidor não configurado.", 503);
  try {
    const body = await req.json();
    const action = String(body.action || "");
    if (action === "logout") { (await cookies()).delete("bp_session"); return Response.json({ ok:true }); }
    if (action === "login") {
      const users = await readUsers();
      const user = users.find(x => x.email === normalize(body.email) && x.active);
      if (!user || !compare(body.password || "", user.password)) return fail("Usuário ou senha inválidos.", 401);
      (await cookies()).set("bp_session", tokenFor(user), cookieOptions());
      return Response.json({ user: safeUser(user) });
    }
    if (action === "change-password") {
      const user = await currentUser();
      if (!user) return fail("Faça login novamente.", 401);
      if (!compare(body.oldPassword || "", user.password)) return fail("Senha atual incorreta.");
      if (typeof body.newPassword !== "string" || body.newPassword.length === 0) return fail("Informe a nova senha.");
      const users = await readUsers();
      const idx = users.findIndex(x => x.id === user.id);
      if (idx < 0) return fail("Usuário não encontrado.", 404);
      users[idx] = { ...users[idx], password: hash(body.newPassword), changePassword:false };
      await writeUsers(users);
      return Response.json({ ok:true });
    }
    return fail("Ação inválida.");
  } catch { return fail("Não foi possível concluir a solicitação.", 500); }
}
