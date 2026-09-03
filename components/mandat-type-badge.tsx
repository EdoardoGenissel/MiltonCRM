import { cn } from "@/lib/utils"

// Palette fixe (indépendante du thème clair/sombre, comme success/danger/warning
// dans globals.css) — une couleur par type de mandat, assignée par hash pour
// rester stable même si de nouveaux types apparaissent via les imports.
const PALETTE = [
  { bg: "#dbeafe", fg: "#1d4ed8" }, // bleu
  { bg: "#ede9fe", fg: "#6d28d9" }, // violet
  { bg: "#dcfce7", fg: "#15803d" }, // vert
  { bg: "#ffedd5", fg: "#c2410c" }, // orange
  { bg: "#fce7f3", fg: "#be185d" }, // rose
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
    <span
      className={cn(
        "inline-flex items-center rounded-[8px] px-2 py-0.5 text-xs font-medium",
        className,
      )}
      style={{ backgroundColor: bg, color: fg }}
    >
      {type}
    </span>
  )
}
