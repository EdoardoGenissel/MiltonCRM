// Déclenche la synchro Apimo dans la background function Netlify (cf.
// netlify/functions/apimo-sync-background.mts) plutôt que de l'exécuter dans la
// requête courante, trop longue pour une route Next.js ou une scheduled function
// Netlify (~30 s). Netlify répond 202 dès la prise en charge.
export async function triggerApimoSync(): Promise<void> {
  const baseUrl = process.env.URL
  const cronSecret = process.env.CRON_SECRET
  if (!baseUrl || !cronSecret) {
    throw new Error("URL ou CRON_SECRET manquant dans l'environnement Netlify.")
  }

  const res = await fetch(`${baseUrl}/.netlify/functions/apimo-sync-background`, {
    method: "POST",
    headers: { Authorization: `Bearer ${cronSecret}` },
  })
  if (!res.ok) {
    throw new Error(`Déclenchement de la synchro Apimo refusé (${res.status}).`)
  }
}
