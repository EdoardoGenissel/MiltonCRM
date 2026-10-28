import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { EditError, updateEntity } from "./update"
import type { EditableEntity } from "./fields"

const bodySchema = z.object({ values: z.record(z.string(), z.string()) })

// PATCH commun des routes /api/{contacts,biens,mandats}/[id] (bouton
// "Modifier" des drawers).
export function patchHandler(entity: EditableEntity) {
  return async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params
    const parsed = bodySchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: "Requête invalide." }, { status: 400 })
    try {
      await updateEntity(entity, id, parsed.data.values)
      return NextResponse.json({ ok: true })
    } catch (err) {
      if (err instanceof EditError) {
        return NextResponse.json({ error: err.message }, { status: 400 })
      }
      throw err
    }
  }
}
