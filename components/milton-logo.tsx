export function MiltonLogo({ className = "h-[42px] w-auto" }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/logo.png" alt="Milton Immobilier" className={`${className} object-contain`} />
}
