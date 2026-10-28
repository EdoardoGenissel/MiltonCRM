// Analyse IA des boîtes contact@ / prospects@ toutes les 15 minutes - même
// principe que jotform-sync-cron.mts : appelle la route avec le CRON_SECRET.
// Chaque passage traite ce qu'il peut dans son budget de temps, le reste est
// repris au suivant (cf. lib/prospects-mail/sync.ts).

export default async () => {
  const baseUrl = process.env.URL
  const cronSecret = process.env.CRON_SECRET

  if (!baseUrl || !cronSecret) {
    throw new Error("URL ou CRON_SECRET manquant dans l'environnement Netlify.")
  }

  const res = await fetch(`${baseUrl}/api/prospects/sync`, {
    headers: { Authorization: `Bearer ${cronSecret}` },
  })

  if (!res.ok) {
    throw new Error(`analyse des mails prospects a échoué (${res.status}): ${await res.text()}`)
  }
}

export const config = {
  schedule: "*/15 * * * *",
}
