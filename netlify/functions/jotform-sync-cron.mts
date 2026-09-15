// Équivalent Netlify du cron Vercel (cf. vercel.json, désormais sans effet sur
// Netlify) qui déclenchait /api/jotform/sync tous les soirs à 3h. Netlify
// n'exécute pas vercel.json : cette Scheduled Function appelle la même route
// avec le même header `Authorization: Bearer $CRON_SECRET` que la route sait
// déjà vérifier (cf. app/api/jotform/sync/route.ts).

export default async () => {
  const baseUrl = process.env.URL
  const cronSecret = process.env.CRON_SECRET

  if (!baseUrl || !cronSecret) {
    throw new Error("URL ou CRON_SECRET manquant dans l'environnement Netlify.")
  }

  const res = await fetch(`${baseUrl}/api/jotform/sync`, {
    headers: { Authorization: `Bearer ${cronSecret}` },
  })

  if (!res.ok) {
    throw new Error(`jotform sync a échoué (${res.status}): ${await res.text()}`)
  }
}

export const config = {
  schedule: "0 3 * * *",
}
