import "dotenv/config"

// Synchro Apimo → CRM lancée à la main, hors Netlify (même logique que la
// background function, cf. lib/integrations/apimo/sync.ts). Écrit dans la base
// pointée par DATABASE_URL.
//
// Usage : npx tsx scripts/sync-apimo.ts

import { syncApimo } from "@/lib/integrations/apimo/sync"

async function main() {
  const { prospects, biens } = await syncApimo()
  console.log("Prospects :", prospects)
  console.log("Biens & mandats :", biens)
  if (prospects.status === "error" || biens.status === "error") process.exit(1)
}

main()
