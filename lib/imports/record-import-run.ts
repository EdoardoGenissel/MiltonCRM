import { prisma } from "@/lib/db/prisma"
import type { Source } from "@/lib/generated/prisma/enums"

export type ImportKindGroup =
  "contacts" | "biens_mandats" | "impayes" | "incidents" | "loyers_appeles"

// Écrit le SyncRun (partagé avec Cockpit, cf. schema.prisma) et, si l'import a
// réussi, l'ImportLog associé (créé/mis à jour, propre au CRM) - centralisé ici
// pour que les 4 runners d'import (prospects/Septéo contacts, biens Apimo/Septéo)
// n'aient pas à dupliquer ce calcul.
export async function recordImportRun(params: {
  source: Source
  kind: ImportKindGroup
  fileName: string
  status: "success" | "error"
  recordsUpserted: number
  duplicatesFound: number
  error?: string
}) {
  const syncRun = await prisma.syncRun.create({
    data: {
      source: params.source,
      status: params.status,
      finishedAt: new Date(),
      recordsUpserted: params.recordsUpserted,
      duplicatesFound: params.duplicatesFound,
      fileName: params.fileName,
      error: params.error,
    },
  })

  if (params.status === "success") {
    await prisma.importLog.create({
      data: {
        syncRunId: syncRun.id,
        source: params.source,
        kind: params.kind,
        fileName: params.fileName,
        created: params.recordsUpserted - params.duplicatesFound,
        updated: params.duplicatesFound,
        total: params.recordsUpserted,
      },
    })
  }

  return syncRun
}
