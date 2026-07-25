import { randomUUID } from "node:crypto"
import {
  resolveContactByIdentity,
  type IdentityMatchCandidate,
  type IncomingIdentity,
} from "@/lib/contacts/dedupe"

export type PersonToCreate = {
  id: string
  civilite?: string
  prenom: string
  nom: string
  telephone?: string
  email?: string
  commune?: string
  personas: string[]
}

export type PersonInput = IncomingIdentity & {
  civilite?: string
  commune?: string
  persona: string
}

// Résout une personne physique (propriétaire, locataire...) contre les contacts
// déjà en base OU déjà planifiés plus tôt dans le même import (ex. un
// propriétaire possédant plusieurs lots, pas encore en base au moment du 1er
// lot traité), sinon prépare sa création — factorisé pour l'import Septéo
// biens/mandats qui doit résoudre DEUX personnes par ligne (propriétaire ET
// locataire actuel), contrairement à l'import Apimo biens (propriétaire seul).
// `resolve` renvoie `null` sans rien planifier si `nom` est absent (ex. lot
// vacant, pas de locataire actuel).
export class PersonResolver {
  private candidates: IdentityMatchCandidate[]
  private plannedIds = new Set<string>()
  readonly toCreate: PersonToCreate[] = []
  // contacts déjà existants en base à qui ajouter un persona (id -> personas à fusionner)
  readonly idsToTagPersonas = new Map<string, Set<string>>()

  constructor(candidates: IdentityMatchCandidate[]) {
    this.candidates = candidates
  }

  resolve(input: PersonInput): string | null {
    if (!input.nom) return null

    const matchId = resolveContactByIdentity(this.candidates, input)
    if (matchId) {
      if (this.plannedIds.has(matchId)) {
        // Contact pas encore en base (planifié plus tôt dans cet import) —
        // on ajoute directement le persona à la création prévue.
        const planned = this.toCreate.find((p) => p.id === matchId)
        if (planned && !planned.personas.includes(input.persona)) {
          planned.personas.push(input.persona)
        }
      } else {
        const personas = this.idsToTagPersonas.get(matchId) ?? new Set<string>()
        personas.add(input.persona)
        this.idsToTagPersonas.set(matchId, personas)
      }
      return matchId
    }

    const id = randomUUID()
    this.toCreate.push({
      id,
      civilite: input.civilite,
      prenom: input.prenom ?? "",
      nom: input.nom,
      telephone: input.telephone,
      email: input.email,
      commune: input.commune,
      personas: [input.persona],
    })
    this.plannedIds.add(id)
    this.candidates.push({
      id,
      email: input.email ?? null,
      telephone: input.telephone ?? null,
      nom: input.nom,
      prenom: input.prenom ?? "",
    })
    return id
  }
}
