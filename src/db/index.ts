import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema';
import dotenv from 'dotenv';
import dns from 'dns';

console.log('[Module] src/db/index.ts is loading...');

// FORCE IPv4 globally to fix Supabase/Cloud connectivity issues (Node v17+)
if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

// Configure dotenv immediately at module root
dotenv.config();

const { Pool } = pg;

// Helper to sanitize connection strings with unencoded special characters in password
function sanitizeConnectionUrl(url: string | undefined): string | undefined {
  if (!url || !url.includes('://')) return url;
  
  try {
    // Find the last '@' which separates credentials from the host
    const protocolPart = url.split('://')[0];
    const remaining = url.substring(protocolPart.length + 3);
    const lastAtIndex = remaining.lastIndexOf('@');
    
    if (lastAtIndex === -1) return url;
    
    const credsPart = remaining.substring(0, lastAtIndex);
    const hostPart = remaining.substring(lastAtIndex + 1);
    
    const firstColonIndex = credsPart.indexOf(':');
    if (firstColonIndex === -1) return url;
    
    const username = credsPart.substring(0, firstColonIndex);
    const password = credsPart.substring(firstColonIndex + 1);
    
    // Auto-encode @ and other characters that might break URI parsing
    // But keep already encoded parts as is if possible
    let decodedPassword = password;
    try {
      // Only decode if it looks like it might be encoded (contains %)
      if (password.includes('%')) {
        decodedPassword = decodeURIComponent(password);
      }
    } catch (e) {
      console.warn('[DB Config] Password contains % but is not a valid escape sequence, using as is.');
    }
    const encodedPassword = encodeURIComponent(decodedPassword);
    
    const sanitized = `${protocolPart}://${username}:${encodedPassword}@${hostPart}`;
    return sanitized;
  } catch (e) {
    console.error('[DB Config] Failed to sanitize URL:', e);
    return url;
  }
}

const rawDbUrl = process.env.DATABASE_URL?.trim();
const dbUrl = sanitizeConnectionUrl(rawDbUrl);

if (!rawDbUrl) {
  console.error('\x1b[31m%s\x1b[0m', 'CRITICAL ERROR: DATABASE_URL is not defined in environment variables.');
} else if (rawDbUrl !== dbUrl) {
  console.log('[DB Config] 🛡️ Auto-sanitized DATABASE_URL (encoded password characters).');
}

// Optimized Pool Configuration
const createConfig = () => {
  const connectionString = (dbUrl || '').trim();
  const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
  const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
  
  const config: any = {
    connectionString: connectionString || 'postgres://localhost:5432/postgres',
    ssl: connectionString && !isLocal
      ? { rejectUnauthorized: false } 
      : false,
    max: isProd ? 5 : 2, // Low for serverless to prevent Supabase connection exhaustion (max 5 in production)
    idleTimeoutMillis: 15000,
    connectionTimeoutMillis: 10000, 
    maxUses: 100, // Recycle quickly in serverless
    keepAlive: true, // Keep connection alive but recycled via maxUses
  };

  if (connectionString.includes('supabase.co')) {
    console.log('[DB Config] ⚡ Supabase detected. Using optimized pool settings.');
  }

  return config;
};

// Create the pool once
const poolConfig = createConfig();
export const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('[DB Pool] Unexpected error on idle client:', err.message);
});

export const db = drizzle(pool, { schema });
