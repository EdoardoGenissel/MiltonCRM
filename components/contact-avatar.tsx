import { cn } from "@/lib/utils"

// Palette de teintes douces, choisie pour rester lisible en clair comme en sombre
// (fond pastel + texte foncé assorti) — la couleur est dérivée du nom, donc stable
// pour une même personne d'un rendu à l'autre (liste, fiche détail...).
const PALETTE = [
  { bg: "#e0f2f1", fg: "#00695c" },
  { bg: "#e3f2fd", fg: "#1565c0" },
  { bg: "#fce4ec", fg: "#ad1457" },
  { bg: "#fff3e0", fg: "#e65100" },
  { bg: "#f3e5f5", fg: "#6a1b9a" },
  { bg: "#e8f5e9", fg: "#2e7d32" },
  { bg: "#fff9c4", fg: "#9e7c00" },
  { bg: "#ede7f6", fg: "#4527a0" },
]

function hashString(value: string): number {
  let h = 0
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) | 0
  return Math.abs(h)
}

function initials(prenom: string, nom: string): string {
  const label = `${prenom.trim().charAt(0)}${nom.trim().charAt(0)}`.toUpperCase()
  return label || "?"
}

const SIZE_CLASSES = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
}

export function ContactAvatar({
  prenom,
  nom,
  size = "md",
  className,
}: {
  prenom: string
  nom: string
  size?: "sm" | "md" | "lg"
  className?: string
}) {
  const color = PALETTE[hashString(`${prenom}${nom}`) % PALETTE.length]

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-semibold",
        SIZE_CLASSES[size],
        className,
      )}
      style={{ backgroundColor: color.bg, color: color.fg }}
    >
      {initials(prenom, nom)}
    </div>
  )
}
