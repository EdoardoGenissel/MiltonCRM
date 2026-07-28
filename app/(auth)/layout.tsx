import Image from "next/image"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center">
          <Image src="/logo.png" alt="Milton Immobilier" width={200} height={81} priority className="h-14 w-auto" />
        </div>
        {children}
      </div>
    </div>
  )
}
