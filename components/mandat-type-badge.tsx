import { Badge } from "@/components/ui/badge"

// Palette fixe (indépendante du thème clair/sombre, comme success/danger/warning
// dans globals.css) - une couleur par type de mandat, assignée par hash pour
// rester stable même si de nouveaux types apparaissent via les imports.
// Volontairement sans rouge/orange : le badge est purement informationnel (type
// de mandat), il ne doit pas se lire comme un statut négatif.
const PALETTE = [
  { bg: "#dbeafe", fg: "#1d4ed8" }, // bleu
  { bg: "#ede9fe", fg: "#6d28d9" }, // violet
  { bg: "#dcfce7", fg: "#15803d" }, // vert
  { bg: "#ccfbf1", fg: "#0f766e" }, // teal
  { bg: "#e0e7ff", fg: "#4338ca" }, // indigo
  { bg: "#e0f2fe", fg: "#0369a1" }, // cyan
  { bg: "#fef9c3", fg: "#a16207" }, // jaune
  { bg: "#e2e8f0", fg: "#334155" }, // gris
]

function colorFor(value: string) {
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0
  }
  return PALETTE[Math.abs(hash) % PALETTE.length]
}

export function MandatTypeBadge({ type, className }: { type: string; className?: string }) {
  const { bg, fg } = colorFor(type)
  return (
    <Badge className={className} style={{ backgroundColor: bg, color: fg }}>
      {type}
    </Badge>
  )
}
