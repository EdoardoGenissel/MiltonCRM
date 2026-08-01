import "dotenv/config"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../lib/generated/prisma/client"
import { Pole, Source } from "../lib/generated/prisma/enums"

// Seed de développement : données plausibles pour travailler sur les vues et les
// requêtes Prisma avant que les vraies intégrations (Pennylane, Apimo, SEPTEO...)
// soient branchées. Volontairement cohérent avec `lib/data.ts` (mêmes ordres de
// grandeur) mais PAS une reconstruction exacte des mêmes chiffres — les répartitions
// par pôle/commercial sont approximées là où la source mock ne les détaille pas
// (ex. incidents, lots gérés par ancienneté). Ne jamais lancer contre un
// environnement de production.
//
// Usage : `npx prisma db seed` (ou automatiquement après `prisma migrate dev`,
// cf. prisma.config.ts).

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

const MONTHS = [
  new Date(Date.UTC(2026, 0, 1)),
  new Date(Date.UTC(2026, 1, 1)),
  new Date(Date.UTC(2026, 2, 1)),
  new Date(Date.UTC(2026, 3, 1)),
  new Date(Date.UTC(2026, 4, 1)),
  new Date(Date.UTC(2026, 5, 1)), // juin 2026 = mois clos courant, cf. lib/data.ts
]

const TRANSACTION_COMMERCIAUX = [
  { id: "cmt-claire-dubois", name: "Claire Dubois" },
  { id: "cmt-marc-lefevre", name: "Marc Lefèvre" },
  { id: "cmt-sophie-nguyen", name: "Sophie Nguyen" },
]

const GESTION_COMMERCIAUX = [
  { id: "cmg-julien-petit", name: "Julien Petit" },
  { id: "cmg-amandine-roy", name: "Amandine Roy" },
]

function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

function randomDayIn(month: Date): Date {
  const day = 1 + Math.floor(Math.random() * 27)
  return new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), day))
}

async function seedFactCa() {
  // CA total mensuel (k€), identique à hist.values de "ca-mensuel" dans lib/data.ts.
  const totalCaKEur = [62, 57, 68, 65, 71, 75.8]
  // Répartition par pôle constante (poids de juin, cf. "ca-pole" dans lib/data.ts) —
  // simplification : la vraie répartition varie sans doute mois par mois, on
  // affinera une fois Pennylane branché.
  const poleWeights: [Pole, number][] = [
    [Pole.TRANSACTION, 0.28],
    [Pole.GESTION_LOCATIVE, 0.35],
    [Pole.LOCATION_DEV, 0.25],
    [Pole.ESTIMATION, 0.12],
  ]

  await prisma.factCa.deleteMany({})
  await prisma.factCa.createMany({
    data: MONTHS.flatMap((periodMonth, i) =>
      poleWeights.map(([pole, weight]) => ({
        periodMonth,
        pole,
        amountEur: Math.round(totalCaKEur[i] * 1000 * weight),
        source: Source.PENNYLANE,
      }))
    ),
  })
}

async function seedFactContrat() {
  // Mandats signés par mois (Transaction), cf. hist "mandats" dans lib/data.ts.
  const mandatsParMois = [24, 19, 26, 22, 25, 20]
  // Baux signés par mois (Gestion locative), cf. hist "baux" dans lib/data.ts.
  const bauxParMois = [36, 29, 34, 38, 33, 34]

  await prisma.factContrat.deleteMany({})

  const rows: {
    type: string
    pole: Pole
    commercialId: string
    commercialName: string
    signedAt: Date
    source: Source
  }[] = []

  MONTHS.forEach((month, i) => {
    for (let j = 0; j < mandatsParMois[i]; j++) {
      const commercial = TRANSACTION_COMMERCIAUX[j % TRANSACTION_COMMERCIAUX.length]
      rows.push({
        type: j % 3 === 0 ? "mandat_exclusif" : "mandat_simple",
        pole: Pole.TRANSACTION,
        commercialId: commercial.id,
        commercialName: commercial.name,
        signedAt: randomDayIn(month),
        source: Source.APIMO,
      })
    }
    for (let j = 0; j < bauxParMois[i]; j++) {
      const commercial = GESTION_COMMERCIAUX[j % GESTION_COMMERCIAUX.length]
      rows.push({
        type: j % 6 === 0 ? "bail_pro" : "bail_habitation",
        pole: Pole.GESTION_LOCATIVE,
        commercialId: commercial.id,
        commercialName: commercial.name,
        signedAt: randomDayIn(month),
        source: Source.SEPTEO,
      })
    }
  })

  await prisma.factContrat.createMany({ data: rows })
}

async function seedFactPipeline() {
  // 8 dernières semaines de pipeline commercial (RDV, estimations, visites), pour
  // avoir de quoi développer les vues Transaction / Gestion locative commerciale
  // (Phase 2/3 de PLAN.md) avant que Notion/Apimo soient branchés.
  await prisma.factPipeline.deleteMany({})

  const metrics = ["rdv", "estimation", "visite"]
  const rows: {
    pole: Pole
    commercialId: string
    commercialName: string
    metric: string
    period: Date
    periodType: string
    value: number
    source: Source
  }[] = []

  for (let week = 0; week < 8; week++) {
    const period = daysAgo(week * 7)
    period.setHours(0, 0, 0, 0)

    for (const commercial of TRANSACTION_COMMERCIAUX) {
      for (const metric of metrics) {
        rows.push({
          pole: Pole.TRANSACTION,
          commercialId: commercial.id,
          commercialName: commercial.name,
          metric,
          period,
          periodType: "hebdo",
          value: 3 + Math.floor(Math.random() * 6),
          source: Source.NOTION,
        })
      }
    }
    for (const commercial of GESTION_COMMERCIAUX) {
      for (const metric of metrics) {
        rows.push({
          pole: Pole.GESTION_LOCATIVE,
          commercialId: commercial.id,
          commercialName: commercial.name,
          metric,
          period,
          periodType: "hebdo",
          value: 2 + Math.floor(Math.random() * 5),
          source: Source.APIMO,
        })
      }
    }
  }

  await prisma.factPipeline.createMany({ data: rows })
}

async function seedFactImpaye() {
  // Taux d'impayés mensuel (%), cf. hist "impayes" dans lib/data.ts. Le montant
  // suppose une base de loyers appelés d'environ 380 000 €/mois — hypothèse à
  // corriger dès que SEPTEO donne le vrai chiffre.
  const tauxParMois = [3.6, 3.3, 3.9, 4.5, 4.4, 4.2]
  const loyersAppelesEstimes = 380_000

  await prisma.factImpaye.deleteMany({})
  await prisma.factImpaye.createMany({
    data: MONTHS.map((periodMonth, i) => ({
      periodMonth,
      ratePct: tauxParMois[i],
      amountEur: Math.round((tauxParMois[i] / 100) * loyersAppelesEstimes),
    })),
  })
}

async function seedFactIncident() {
  // 43 incidents actuellement ouverts (cf. "incidents" dans lib/data.ts), avec des
  // ancienetés variées pour pouvoir tester le seuil `absolute-days` (> 30j / > 60j),
  // + un historique d'incidents déjà clôturés pour la vraisemblance des requêtes.
  await prisma.factIncident.deleteMany({})

  const ouverts = Array.from({ length: 43 }, (_, i) => ({
    openedAt: daysAgo(Math.floor((i / 43) * 90)), // étale les ancienetés de 0 à 90j
    closedAt: null,
    pole: Pole.GESTION_LOCATIVE,
  }))

  const cloturesHistoriques = Array.from({ length: 60 }, (_, i) => {
    const openedAt = daysAgo(30 + i * 3)
    const closedAt = new Date(openedAt)
    closedAt.setDate(closedAt.getDate() + 5 + Math.floor(Math.random() * 15))
    return { openedAt, closedAt, pole: Pole.GESTION_LOCATIVE }
  })

  await prisma.factIncident.createMany({ data: [...ouverts, ...cloturesHistoriques] })
}

async function seedFactAppel() {
  // Front office (Ringover) — stretch v1, quelques semaines de données pour ne pas
  // partir de zéro si la vue est scaffoldée en avance de phase.
  await prisma.factAppel.deleteMany({})
  await prisma.factAppel.createMany({
    data: Array.from({ length: 8 }, (_, week) => {
      const periodWeek = daysAgo(week * 7)
      periodWeek.setHours(0, 0, 0, 0)
      const entrants = 120 + Math.floor(Math.random() * 40)
      const manques = Math.floor(entrants * (0.12 + Math.random() * 0.08))
      const traites = Math.floor(manques * (0.6 + Math.random() * 0.3))
      return { periodWeek, entrants, manques, traites }
    }),
  })
}

async function seedObjectifs() {
  // Objectifs mensuels saisis par les managers, cf. `boxes` de lib/data.ts.
  await prisma.objectif.deleteMany({})
  await prisma.objectif.createMany({
    data: MONTHS.map((period) => ({
      kpiId: "ca-mensuel",
      pole: null,
      commercialId: null,
      period,
      value: 72_000,
    })),
  })
  await prisma.objectif.create({
    data: { kpiId: "ca-annuel", period: MONTHS[MONTHS.length - 1], value: 635_000 },
  })
  await prisma.objectif.createMany({
    data: MONTHS.map((period) => ({
      kpiId: "mandats",
      pole: Pole.TRANSACTION,
      period,
      value: 25,
    })),
  })
  await prisma.objectif.createMany({
    data: MONTHS.map((period) => ({
      kpiId: "baux",
      pole: Pole.GESTION_LOCATIVE,
      period,
      value: 30,
    })),
  })
  // Objectifs pipeline hebdo (RDV/estimations/visites), pôles Transaction et Gestion
  // locative — un seul enregistrement "objectif courant" suffit, cf.
  // `lib/kpis/*.ts` qui interroge par kpiId+pole en prenant le plus récent plutôt
  // qu'une correspondance exacte de période (les objectifs changent rarement).
  await prisma.objectif.createMany({
    data: [
      { kpiId: "rdv-prospects", pole: Pole.TRANSACTION, period: MONTHS[MONTHS.length - 1], value: 22 },
      { kpiId: "estimations", pole: Pole.TRANSACTION, period: MONTHS[MONTHS.length - 1], value: 10 },
      { kpiId: "visites", pole: Pole.TRANSACTION, period: MONTHS[MONTHS.length - 1], value: 18 },
      { kpiId: "rdv-prospects-gl", pole: Pole.GESTION_LOCATIVE, period: MONTHS[MONTHS.length - 1], value: 14 },
      { kpiId: "estimations-gl", pole: Pole.GESTION_LOCATIVE, period: MONTHS[MONTHS.length - 1], value: 7 },
      { kpiId: "visites-gl", pole: Pole.GESTION_LOCATIVE, period: MONTHS[MONTHS.length - 1], value: 13 },
    ],
  })
}

async function seedAdminProfile() {
  // Le compte Supabase Auth (Johan, rôle CEO) doit exister avant qu'on puisse créer
  // la ligne Profile correspondante (Profile.id référence auth.users.id). Tant que
  // le projet Supabase n'est pas créé et le compte pas encore créé manuellement,
  // ce bloc est un no-op explicite plutôt qu'une erreur.
  const userId = process.env.SEED_ADMIN_USER_ID
  const email = process.env.SEED_ADMIN_EMAIL
  const fullName = process.env.SEED_ADMIN_FULL_NAME

  if (!userId || !email || !fullName) {
    console.log(
      "⏭  SEED_ADMIN_USER_ID / SEED_ADMIN_EMAIL / SEED_ADMIN_FULL_NAME absents — " +
        "profil admin non seedé (créez d'abord le compte dans Supabase Auth, cf. AGENTS.md §8)."
    )
    return
  }

  await prisma.profile.upsert({
    where: { id: userId },
    update: { email, fullName, role: "CEO" },
    create: { id: userId, email, fullName, role: "CEO" },
  })
  console.log(`✔ Profil CEO seedé pour ${email}`)
}

async function main() {
  await seedFactCa()
  await seedFactContrat()
  await seedFactPipeline()
  await seedFactImpaye()
  await seedFactIncident()
  await seedFactAppel()
  await seedObjectifs()
  await seedAdminProfile()
  console.log("✔ Seed terminé.")
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
