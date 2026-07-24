"use client"

import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

// Ligne de tableau entièrement cliquable (ex. liste des mandats → fiche bien).
// Les cellules contenant elles-mêmes un lien (ex. propriétaire → fiche contact)
// doivent stopper la propagation du clic pour ne pas déclencher aussi la
// navigation de la ligne — cf. leur `onClick={(e) => e.stopPropagation()}`.
export function ClickableRow({
  href,
  className,
  children,
}: {
  href: string
  className?: string
  children: React.ReactNode
}) {
  const router = useRouter()

  // Un `onClick` ne peut pas être posé sur les cellules elles-mêmes (Server
  // Components — les gestionnaires d'événements ne traversent pas la frontière
  // server/client, cf. https://nextjs.org/docs/messages/event-handlers-in-server-component-children).
  // On détecte donc ici, côté client, si le clic vient d'un lien imbriqué (ex.
  // propriétaire → fiche contact) pour ne pas déclencher aussi la navigation
  // de la ligne.
  function handleClick(e: React.MouseEvent<HTMLTableRowElement>) {
    if ((e.target as HTMLElement).closest("a")) return
    router.push(href)
  }

  return (
    <tr onClick={handleClick} className={cn("cursor-pointer", className)}>
      {children}
    </tr>
  )
}
