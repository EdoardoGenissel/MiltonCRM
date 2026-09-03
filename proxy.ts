import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

const PUBLIC_PATHS = ["/login", "/mot-de-passe-oublie", "/reset-password", "/auth/confirm"]

// Routes appelées par des services tiers (webhooks) ou par le cron Vercel — sans
// cookie de session, authentifiées par secret applicatif (vérifié dans la route
// elle-même). Cf. scope.md : pas de rôles différenciés dans le CRM, ce proxy ne
// fait que l'authentification, pas d'autorisation fine.
// `/api/jotform/sync` accepte AUSSI la session Supabase (bouton manuel côté UI) —
// dans ce cas c'est la route elle-même qui revérifie l'utilisateur via
// `createClient().auth.getUser()`, cf. app/api/jotform/sync/route.ts.
const NO_SESSION_PATHS = ["/api/ringover/webhook", "/api/jotform/webhook", "/api/jotform/sync"]

export async function proxy(request: NextRequest) {
  if (NO_SESSION_PATHS.some((path) => request.nextUrl.pathname.startsWith(path))) {
    return NextResponse.next()
  }

  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isPublicPath = PUBLIC_PATHS.some((path) => request.nextUrl.pathname.startsWith(path))

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("next", request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  if (user && request.nextUrl.pathname === "/login") {
    const url = request.nextUrl.clone()
    url.pathname = "/contacts"
    url.search = ""
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
