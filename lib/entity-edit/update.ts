import { prisma } from "@/lib/db/prisma"
import { fromDisplay } from "@/lib/prospects-mail/fields"
import { EDIT_FIELDS, type EditableEntity } from "./fields"

export class EditError extends Error {}

// Convertit les valeurs saisies (texte) selon le registre - les clés inconnues
// sont ignorées, une valeur invalide (ex. "abc" pour un nombre) est refusée.
function toData(entity: EditableEntity, values: Record<string, string>) {
  const main: Record<string, unknown> = {}
  const prospectDetail: Record<string, unknown> = {}
  for (const def of EDIT_FIELDS[entity]) {
    if (!(def.key in values)) continue
    const value = fromDisplay(def.type, values[def.key])
    if (value === undefined) throw new EditError(`Valeur invalide pour « ${def.label} ».`)
    ;(def.onProspectDetail ? prospectDetail : main)[def.key] =
      def.type === "list" && value === null ? [] : value
  }
  return { main, prospectDetail }
}

export async function updateEntity(
  entity: EditableEntity,
  id: string,
  values: Record<string, string>,
) {
  const { main, prospectDetail } = toData(entity, values)

  if (entity === "contact") {
    // Prénom/nom sont NOT NULL en base : vidés = chaîne vide, pas null.
    if ("prenom" in main) main.prenom ??= ""
    if ("nom" in main) main.nom ??= ""
    if (!main.prenom && !main.nom && "prenom" in main && "nom" in main) {
      throw new EditError("Nom ou prénom requis.")
    }
    await prisma.$transaction(async (tx) => {
      await tx.contact.update({ where: { id }, data: main })
      if (Object.keys(prospectDetail).length) {
        await tx.prospectDetail.upsert({
          where: { contactId: id },
          create: { contactId: id, ...prospectDetail },
          update: prospectDetail,
        })
      }
    })
  } else if (entity === "bien") {
    await prisma.bien.update({ where: { id }, data: main })
  } else {
    if ("type" in main && !main.type) throw new EditError("Type de mandat requis.")
    await prisma.mandat.update({ where: { id }, data: main })
  }
}
