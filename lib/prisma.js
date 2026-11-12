import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  })
}

const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}

export default prisma

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL && String(process.env.DATABASE_URL).trim())
}
