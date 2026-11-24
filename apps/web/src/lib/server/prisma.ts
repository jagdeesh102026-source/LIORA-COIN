/**
 * LIORA COIN — Server-Only Prisma Client & PostgreSQL Connection Pool
 * Phase 2B: Real PostgreSQL Persistence Integration
 *
 * Implements:
 * - Server-only execution boundary (strictly prohibits client-side import).
 * - Connection pool reuse across hot reloads in development.
 * - Safe error handling without credential disclosure.
 * - Least-privilege PostgreSQL connection via @prisma/adapter-pg.
 */

if (typeof window !== 'undefined' && (typeof process === 'undefined' || !process.versions?.node)) {
  throw new Error('CRITICAL SECURITY VIOLATION: Prisma Client can only be loaded in server-side execution contexts.');
}

import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

function getDatabaseUrl(): string {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  // Safe fallback loading for scripts / test runners that have not yet injected .env
  try {
    const fs = require('fs');
    const path = require('path');
    const candidatePaths = [
      path.resolve(process.cwd(), '.env'),
      path.resolve(__dirname, '../../../../..', '.env'),
      path.resolve(__dirname, '../../..', '.env.local'),
    ];
    for (const envPath of candidatePaths) {
      if (fs.existsSync(/* turbopackIgnore: true */ envPath)) {
        const content = fs.readFileSync(/* turbopackIgnore: true */ envPath, 'utf8');
        for (const line of content.split(/\r?\n/)) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#')) {
            const idx = trimmed.indexOf('=');
            if (idx !== -1) {
              const key = trimmed.slice(0, idx).trim();
              let val = trimmed.slice(idx + 1).trim();
              if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                val = val.slice(1, -1);
              }
              if (key === 'DATABASE_URL' && val) {
                process.env.DATABASE_URL = val;
                return val;
              }
            }
          }
        }
      }
    }
  } catch {
    // Ignore error
  }

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL environment variable is not defined.');
  }
  return url;
}

const globalForPrisma = globalThis as unknown as {
  prismaPool?: Pool;
  prismaClient?: PrismaClient;
};

export const pool =
  globalForPrisma.prismaPool ??
  new Pool({
    connectionString: getDatabaseUrl(),
    max: process.env.NODE_ENV === 'production' ? 20 : 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prismaClient ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prismaPool = pool;
  globalForPrisma.prismaClient = prisma;
}

export default prisma;

