import Image from "next/image"

export function MiltonLogo({ className }: { className?: string }) {
  return (
    <Image
      src="/logo.png"
      alt="Milton Immobilier"
      width={200}
      height={81}
      priority
      className={className ?? "h-9 w-auto"}
    />
  )
}
