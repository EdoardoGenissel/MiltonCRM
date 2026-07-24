import { PrismaClient } from "@/lib/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

// DATABASE_URL = connexion poolée Supabase (pgbouncer) — adaptée aux nombreuses
// connexions courtes des routes serverless Next.js. Les migrations utilisent la
// connexion directe (DIRECT_URL) via prisma.config.ts, pas ce fichier.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter })

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}
