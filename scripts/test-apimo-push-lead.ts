import "dotenv/config"

// Test isolé (hors sync automatique) : vérifie que POST /agencies/{agency_id}/leads
// fonctionne bien en écriture avant de brancher le push automatique des estimations
// JotForm dans lib/integrations/jotform/sync.ts (cf. discussion Apimo/Cityscan :
// pas d'API AVM directe, la voie officielle est d'injecter les données dans Apimo).
//
// ATTENTION : ce script crée un vrai lead dans l'Apimo de production (pas de mode
// mock, pas d'endpoint DELETE documenté pour les leads). Le lead créé est identifié
// sans ambiguïté (reference "MILTON-TEST-...", nom "TEST MILTON CRM") pour pouvoir
// être retrouvé et supprimé/ignoré manuellement depuis le dashboard Apimo.
//
// Usage : npx tsx scripts/test-apimo-push-lead.ts

import { apimoGetAbsolute, apimoPost } from "@/lib/integrations/apimo/client"

type CatalogEntry = { id: number; culture: string; name: string; name_plurial: string | null }

async function main() {
  console.log("→ GET /catalogs/lead_type (repérer un type de lead valide)")
  let leadTypes: CatalogEntry[]
  try {
    leadTypes = await apimoGetAbsolute<CatalogEntry[]>("/catalogs/lead_type", { culture: "fr" })
  } catch (err) {
    console.error("✘ Échec de lecture du catalogue lead_type :", err)
    process.exit(1)
  }
  console.log(`← ${leadTypes.length} type(s) de lead disponibles :`, leadTypes)

  if (leadTypes.length === 0) {
    console.error("✘ Aucun type de lead trouvé - impossible de construire un lead valide.")
    process.exit(1)
  }

  // "Estimation" (pas le premier type de la liste, "Contact") : c'est le type
  // qui correspond au cas d'usage (soumission du formulaire JotForm d'estimation).
  const leadType = leadTypes.find((t) => t.name === "Estimation") ?? leadTypes[0]
  const reference = `MILTON-TEST-${Date.now()}`

  const payload = {
    reference,
    type: String(leadType.id),
    lastname: "TEST MILTON CRM",
    firstname: "Ne pas traiter",
    email: "test-milton-crm@example.invalid",
    message: `Lead de test créé par scripts/test-apimo-push-lead.ts le ${new Date().toISOString()} - à supprimer manuellement.`,
    // referral → catalog "referral" (GET /catalogs/referral) : 19 = "Estimation",
    // pas de valeur libre "JotForm" (contrairement à ce qu'on aurait pu supposer).
    referral: "19",
    property_address: "12 rue de Test",
    property_city: "Nice",
    property_zipcode: "06000",
    property_country: "FR",
  }

  console.log(`\n→ POST /agencies/{agency_id}/leads`, payload)

  try {
    const result = await apimoPost<{ id: number; created_at: string; updated_at: string }>(
      "/leads",
      payload
    )
    console.log("\n✔ Lead créé avec succès :", result)
    console.log(
      `\n⚠ Pense à retrouver et supprimer/ignorer ce lead de test dans Apimo ` +
        `(reference "${reference}", id ${result.id}) - aucun endpoint DELETE n'est ` +
        `documenté, la suppression se fait depuis le dashboard Apimo.`
    )
  } catch (err) {
    console.error("\n✘ Échec de création du lead :", err)
    process.exit(1)
  }
}

main()
