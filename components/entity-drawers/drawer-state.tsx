// État de chargement / erreur commun aux contenus de drawer (contact, bien,
// mandat) alimentés par useFetchJson.
export function DrawerState({ error }: { error?: string | null }) {
  return <p className="text-sm text-muted-foreground">{error ?? "Chargement…"}</p>
}
