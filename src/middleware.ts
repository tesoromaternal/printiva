import { defineMiddleware } from "astro:middleware";

import { ADMIN_SESSION_COOKIE, getAdminConfig, validateSession } from "./features/admin/auth";

// Mismo esquema que puedes-ser-mas: login propio con cookie de sesión.
// /admin/login queda siempre accesible para que entrar nunca quede trabado.
const LOGIN_PATH = "/admin/login";

const isAdminPath = (pathname: string) => pathname === "/admin" || pathname.startsWith("/admin/");
const isAdminApi = (pathname: string) => pathname.startsWith("/admin/api/");

/**
 * Tienda pública: renderizada al pedirla + caché en la CDN de Vercel. Se sirve
 * desde caché 60 s y luego stale-while-revalidate: lo editado en el admin se
 * ve en ~1 minuto sin builds. max-age=0: el navegador no guarda copias viejas.
 * Centralizado acá para que ninguna página nueva quede sin caché por olvido.
 */
const PUBLIC_CACHE = "public, max-age=0, s-maxage=60, stale-while-revalidate=86400";

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  if (!isAdminPath(pathname)) {
    const response = await next();
    const cacheable =
      context.request.method === "GET" &&
      !pathname.startsWith("/api/") &&
      response.status === 200 &&
      !response.headers.has("Cache-Control") &&
      !response.headers.has("Set-Cookie");
    if (cacheable) response.headers.set("Cache-Control", PUBLIC_CACHE);
    return response;
  }

  if (!getAdminConfig()) {
    return new Response("Admin no configurado: faltan ADMIN_USERNAME / ADMIN_PASSWORD_HASH.", { status: 503 });
  }

  const session = await validateSession(context.cookies.get(ADMIN_SESSION_COOKIE)?.value);
  const isLogin = pathname === LOGIN_PATH;

  if (!session && isAdminApi(pathname)) {
    // Las llamadas fetch del panel necesitan un 401, no un redirect a HTML.
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  if (isLogin && session) return context.redirect("/admin");
  if (!isLogin && !session) return context.redirect(LOGIN_PATH);
  if (session) context.locals.admin = session;

  const response = await next();
  // Nada del panel se cachea ni se indexa.
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
});
