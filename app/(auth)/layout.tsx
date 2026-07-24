export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <MiltonLogo />
          <span className="text-[15px] font-semibold tracking-tight text-foreground">
            Milton CRM
          </span>
        </div>
        {children}
      </div>
    </div>
  )
}

function MiltonLogo() {
  return (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-9 w-9">
      <defs>
        <linearGradient id="miltonG" x1="4" y1="6" x2="36" y2="34" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00a19a" />
          <stop offset="1" stopColor="#8cc63f" />
        </linearGradient>
      </defs>
      <path
        d="M8 4h24a4 4 0 0 1 4 4v18a4 4 0 0 1-4 4H18l-7 6v-6H8a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4Z"
        fill="url(#miltonG)"
      />
      <path
        d="M12 25V13l8 8 8-8v12"
        stroke="#fff"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )
}
