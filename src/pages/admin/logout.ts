import type { APIRoute } from "astro";

import { ADMIN_SESSION_COOKIE, deleteSession } from "../../features/admin/auth";

export const prerender = false;

// POST (no GET como en puedes-ser-mas): un GET se dispara desde cualquier web
// con un <img src="/admin/logout">. El checkOrigin de Astro protege este form.
export const POST: APIRoute = async ({ cookies, redirect }) => {
  // Borra la sesión en la DB: una cookie copiada deja de servir al instante.
  await deleteSession(cookies.get(ADMIN_SESSION_COOKIE)?.value);
  cookies.delete(ADMIN_SESSION_COOKIE, { path: "/admin" });
  return redirect("/admin/login");
};
