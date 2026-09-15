import "dotenv/config"
import { defineConfig } from "prisma/config"

// La CLI Prisma (migrate, studio, db pull) utilise la connexion directe
// (non poolée, port 5432) - le pooler pgbouncer de Supabase (DATABASE_URL) ne
// supporte pas correctement les migrations DDL. Le runtime applicatif
// (lib/db/prisma.ts) utilise lui DATABASE_URL (poolé) via le driver adapter
// @prisma/adapter-pg. Base partagée avec Cockpit (cf. AGENTS.md).
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DIRECT_URL,
  },
})
