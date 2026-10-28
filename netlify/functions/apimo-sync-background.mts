import { syncApimo } from "../../lib/integrations/apimo/sync"

// Synchro Apimo → CRM (prospects, biens, mandats), en remplacement des imports
// manuels des exports Excel - cf. lib/integrations/apimo/sync.ts.
//
// Background function (suffixe "-background") : jusqu'à 15 min d'exécution, là
// où une route Next.js sur Netlify est coupée au bout de quelques dizaines de
// secondes - une synchro complète (~4 800 recherches, ~830 biens) les dépasse.
// Netlify répond 202 tout de suite à l'appelant, le résultat est tracé dans
// SyncRun/ImportLog (page Imports).
//
// Appelée par le cron (apimo-sync-cron.mts) et par le bouton "Synchroniser
// maintenant" (app/api/apimo/sync/route.ts), toutes deux avec
// `Authorization: Bearer $CRON_SECRET` - l'URL d'une function étant publique.
export default async (request: Request) => {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    console.warn("[apimo-sync] requête rejetée : secret manquant ou incorrect")
    return
  }

  console.log("[apimo-sync] démarrage")
  const { prospects, biens } = await syncApimo()
  console.log(
    `[apimo-sync] terminé - prospects: ${prospects.status} (${prospects.recordsUpserted} fiche(s)), ` +
      `biens: ${biens.status} (${biens.recordsUpserted} fiche(s))` +
      [prospects.error, biens.error]
        .filter(Boolean)
        .map((e) => ` - ${e}`)
        .join(""),
  )
}
