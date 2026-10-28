import { triggerApimoSync } from "../../lib/integrations/apimo/trigger-sync"

// Synchro Apimo quotidienne. Une scheduled function Netlify est limitée à ~30 s :
// elle ne fait que déclencher la background function qui porte la synchro (cf.
// apimo-sync-background.mts). 2h UTC : avant le cron JotForm (3h) et avant les
// syncs Cockpit (4h), qui lisent les mandats du CRM.
export default async () => {
  await triggerApimoSync()
}

export const config = {
  schedule: "0 2 * * *",
}
