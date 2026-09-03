import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

// À utiliser dans les Server Components / Route Handlers / Server Actions.
// Ne pas mettre en cache l'instance : les cookies changent par requête.
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // Appelé depuis un Server Component : ignoré, le proxy se charge
            // du refresh de session sur ces routes.
          }
        },
      },
    },
  )
}
