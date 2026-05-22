import express from 'express';
import path from 'path';
import dns from 'dns';

// FORCE IPv4 globally to fix Supabase/Cloud connectivity issues (Node v17+)
if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

// Optimization: We could import the app from server.ts, 
// but often on Vercel it's cleaner to have a dedicated entry point 
// or ensure server.ts is exportable.
// For now, let's just make server.ts export 'app' and import it here.

// Importing directly from server source. Vercel will bundle what it needs.
import app from '../server';

export default app;
