import express from 'express';
import path from 'path';
import dns from 'dns';
import { db, pool } from './src/db/index';
import * as schema from './src/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import multer from 'multer';
import * as XLSX from 'xlsx';
import dotenv from 'dotenv';

dotenv.config();

// Log buffer for debugging
const serverLogs: string[] = [];
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;

function addLog(level: string, ...args: any[]) {
  const msg = `[${new Date().toISOString()}] [${level}] ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ')}`;
  serverLogs.push(msg);
  if (serverLogs.length > 500) serverLogs.shift();
}

console.log = (...args) => { addLog('INFO', ...args); originalLog(...args); };
console.warn = (...args) => { addLog('WARN', ...args); originalWarn(...args); };
console.error = (...args) => { addLog('ERROR', ...args); originalError(...args); };

console.log('[Module] server.ts is loading in database-only mode...');

// FORCE IPv4 globally to fix Supabase/Cloud connectivity issues (Node v17+)
if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

const upload = multer({ storage: multer.memoryStorage() });
const PORT = 3000;
const app = express();
export { app };

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// --- Middleware for API JSON Safety ---
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    const originalSend = res.send.bind(res);
    res.send = (body) => {
      if (typeof body === 'string') {
        const trimmed = body.trim();
        if (trimmed.startsWith('<!doctype') || trimmed.startsWith('<html')) {
          console.warn(`[API Safety] Intercepted HTML response for ${req.path}. Converting to JSON.`);
          return res.status(404).json({ 
            error: 'API Route Not Found', 
            path: req.path,
            message: 'Expected JSON but received HTML.'
          });
        }
      }
      return originalSend(body);
    };
  }
  next();
});

// Helper for cleaning keys from objects for INSERT and UPDATE
function cleanPayload(allowedKeys: string[], body: any): any {
  const result: any = {};
  for (const key of allowedKeys) {
    if (body[key] !== undefined) {
      result[key] = body[key];
    }
  }
  return result;
}

// Global active schema references
console.log('[Server] Database connections initialized. Failsafe setup loading...');

// --- Robust Local JSON Filesystem Fallback Store ---
import fs from 'fs';

const DATA_DIR = path.join(process.cwd(), '.data');

// Ensure data folder exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function getFallbackFile(table: string): string {
  return path.join(DATA_DIR, `${table}.json`);
}

function readFallback(table: string): any[] {
  const filePath = getFallbackFile(table);
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content) || [];
    }
  } catch (e) {
    console.error(`Error reading fallback file for ${table}:`, e);
  }
  return [];
}

function writeFallback(table: string, data: any[]) {
  const filePath = getFallbackFile(table);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error(`Error writing fallback file for ${table}:`, e);
  }
}

const hasDatabaseUrl = !!(process.env.DATABASE_URL && 
                         !process.env.DATABASE_URL.includes('localhost') && 
                         !process.env.DATABASE_URL.includes('127.0.0.1') && 
                         process.env.DATABASE_URL.trim() !== '');

let useFallbackMode = !hasDatabaseUrl;

// Initialize isDbConnected or check on startup
async function checkDbConnection() {
  if (!hasDatabaseUrl) {
    console.warn('[DB Init] DATABASE_URL env is empty or localhost. Activating dynamic local JSON filesystem fallback mode.');
    useFallbackMode = true;
    return;
  }
  try {
    await pool.query('SELECT 1');
    console.log('[DB Init] PostgreSQL connection verified successfully. Running in standard sync mode.');
    useFallbackMode = false;
  } catch (err) {
    console.warn('[DB Init] PostgreSQL connection failed. Activating dynamic local JSON filesystem fallback mode. Details:', (err as Error).message);
    useFallbackMode = true;
  }
}

// Perform connection check immediately
checkDbConnection();

app.get('/api/logs', (req, res) => {
  res.json(serverLogs);
});

app.get('/api/db-status', async (req, res) => {
  try {
    if (useFallbackMode) {
      return res.json({
        connected: false,
        mode: 'cloud-client-sync',
        checking: false,
        error: 'Failsafe Local Storage Mode Active',
        host: 'Local Filesystem'
      });
    }
    await pool.query('SELECT 1');
    res.json({ 
      connected: true,
      mode: 'cloud-client-sync',
      checking: false,
      error: null,
      host: 'supabase.co'
    });
  } catch (err) {
    res.json({ 
      connected: false,
      mode: 'cloud-client-sync',
      checking: false,
      error: (err as Error).message,
      host: 'supabase.co'
    });
  }
});

app.post('/api/db-status/retry', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    useFallbackMode = false;
    res.json({ connected: true, error: null });
  } catch (err) {
    useFallbackMode = true;
    res.json({ connected: false, error: (err as Error).message });
  }
});

// --- API Routes ---

// 1. Business Profile
app.get('/api/business-profile', async (req, res) => {
  try {
    let profile = null;
    if (!useFallbackMode) {
      try {
        const dbProfile = await db.select().from(schema.businessProfile).limit(1);
        if (dbProfile.length > 0) {
          profile = dbProfile[0];
        }
      } catch (err) {
        console.warn('[DB Failsafe] Fetching business-profile failed. Activating fallback.', (err as Error).message);
        useFallbackMode = true;
      }
    }
    if (useFallbackMode || !profile) {
      const fallbackList = readFallback('business_profile');
      profile = fallbackList[0] || {
        id: 1,
        name: "FunkyLand Kids PlayZone",
        subName: "Ultimate Play & Party Zone",
        unitName: "FunkyLand",
        address: "123 Adventure Way, Kids City",
        gstNo: "07AAAAA1111A1Z1",
        mobile: "9876543210",
        email: "play@funkyland.com",
        logo: "https://cdn-icons-png.flaticon.com/512/3081/3081513.png",
        accountingYearStart: "2026-04-01",
        gracePeriodMinutes: 10,
        overtimeRatePerMinute: 5,
        updatedAt: new Date()
      };
      if (fallbackList.length === 0) {
        writeFallback('business_profile', [profile]);
      }
    }
    return res.json(profile);
  } catch (err) {
    console.error('Core Error business-profile GET:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/api/business-profile', async (req, res) => {
  try {
    const fields = [
      'name', 'subName', 'unitName', 'address', 'gstNo', 'mobile',
      'email', 'logo', 'accountingYearStart', 'gracePeriodMinutes',
      'overtimeRatePerMinute', 'updatedAt'
    ];
    const payload = cleanPayload(fields, req.body);
    payload.updatedAt = new Date();

    // Sync to file system first
    const fallbackList = readFallback('business_profile');
    let updatedPayload = payload;
    if (fallbackList.length > 0) {
      fallbackList[0] = { ...fallbackList[0], ...payload };
      updatedPayload = fallbackList[0];
    } else {
      payload.id = 1;
      fallbackList.push(payload);
    }
    writeFallback('business_profile', fallbackList);

    if (!useFallbackMode) {
      try {
        const existing = await db.select().from(schema.businessProfile).limit(1);
        let updated;
        if (existing.length > 0) {
          updated = await db.update(schema.businessProfile)
            .set(payload)
            .where(eq(schema.businessProfile.id, existing[0].id))
            .returning();
        } else {
          updated = await db.insert(schema.businessProfile)
            .values(payload)
            .returning();
        }
        return res.json(updated[0]);
      } catch (err) {
        console.warn('[DB Failsafe] Updating business-profile in database failed. Activating fallback.', (err as Error).message);
        useFallbackMode = true;
      }
    }
    return res.json(updatedPayload);
  } catch (err) {
    console.error('Core Error business-profile POST:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

// 2. Staff
app.get('/api/staff', async (req, res) => {
  try {
    let allStaff = [];
    if (!useFallbackMode) {
      try {
        allStaff = await db.query.staff.findMany();
      } catch (err) {
        console.warn('[DB Failsafe] Fetching staff failed. Activating fallback.', (err as Error).message);
        useFallbackMode = true;
      }
    }
    if (useFallbackMode || allStaff.length === 0) {
      allStaff = readFallback('staff');
      if (allStaff.length === 0) {
        allStaff = [{
          id: 'STF-admin',
          password: 'admin',
          fullName: 'Administrator',
          role: 'Admin',
          phone: '9999999999',
          status: 'Active',
          joinedDate: new Date()
        }];
        writeFallback('staff', allStaff);
      }
    }
    return res.json(allStaff);
  } catch (err) {
    console.error('Core Error staff GET:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/api/staff', async (req, res) => {
  try {
    const fields = ['id', 'password', 'fullName', 'role', 'phone', 'status', 'joinedDate'];
    const body = {
      ...req.body,
      fullName: req.body.fullName || req.body.full_name
    };
    const payload = cleanPayload(fields, body);
    if (!payload.id) {
      payload.id = `STF-${Date.now()}`;
    }
    if (payload.joinedDate) {
      payload.joinedDate = new Date(payload.joinedDate);
    }

    // Backup to fallback file
    const fallbackList = readFallback('staff');
    fallbackList.push(payload);
    writeFallback('staff', fallbackList);

    if (!useFallbackMode) {
      try {
        const staff = await db.insert(schema.staff).values(payload).returning();
        return res.json(staff[0]);
      } catch (err) {
        console.warn('[DB Failsafe] Inserting staff failed. Activating fallback.', (err as Error).message);
        useFallbackMode = true;
      }
    }
    return res.json(payload);
  } catch (err) {
    console.error('Core Error staff POST:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

app.put('/api/staff/:id', async (req, res) => {
  try {
    const fields = ['password', 'fullName', 'role', 'phone', 'status', 'joinedDate'];
    const body = {
      ...req.body,
      fullName: req.body.fullName || req.body.full_name
    };
    const payload = cleanPayload(fields, body);
    if (payload.joinedDate) {
      payload.joinedDate = new Date(payload.joinedDate);
    }

    // Save fallback
    const fallbackList = readFallback('staff');
    const index = fallbackList.findIndex(item => String(item.id) === String(req.params.id));
    let updatedPayload = { id: req.params.id, ...payload };
    if (index !== -1) {
      fallbackList[index] = { ...fallbackList[index], ...payload };
      updatedPayload = fallbackList[index];
    } else {
      fallbackList.push(updatedPayload);
    }
    writeFallback('staff', fallbackList);

    if (!useFallbackMode) {
      try {
        const updated = await db.update(schema.staff)
          .set(payload)
          .where(eq(schema.staff.id, req.params.id))
          .returning();
        return res.json(updated[0]);
      } catch (err) {
        console.warn('[DB Failsafe] Updating staff failed. Activating fallback.', (err as Error).message);
        useFallbackMode = true;
      }
    }
    return res.json(updatedPayload);
  } catch (err) {
    console.error('Core Error staff PUT:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

app.delete('/api/staff/:id', async (req, res) => {
  try {
    const fallbackList = readFallback('staff').filter(item => String(item.id) !== String(req.params.id));
    writeFallback('staff', fallbackList);

    if (!useFallbackMode) {
      try {
        await db.delete(schema.staff).where(eq(schema.staff.id, req.params.id));
      } catch (err) {
        console.warn('[DB Failsafe] Deleting staff failed. Activating fallback.', (err as Error).message);
        useFallbackMode = true;
      }
    }
    return res.json({ success: true });
  } catch (err) {
    console.error('Core Error staff DELETE:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

// 3. Categories
app.get('/api/categories', async (req, res) => {
  try {
    let allCategories = [];
    if (!useFallbackMode) {
      try {
        allCategories = await db.select().from(schema.categories);
      } catch (err) {
        console.warn('[DB Failsafe] Fetching categories failed. Activating fallback.', (err as Error).message);
        useFallbackMode = true;
      }
    }
    if (useFallbackMode || allCategories.length === 0) {
      allCategories = readFallback('categories');
      if (allCategories.length === 0) {
        allCategories = [
          { id: 1, name: "Play Zone Entry", type: "service" },
          { id: 2, name: "Socks", type: "service" },
          { id: 3, name: "Snacks", type: "service" },
          { id: 4, name: "Birthday Theme", type: "catalogue" },
          { id: 5, name: "Party Package", type: "catalogue" }
        ];
        writeFallback('categories', allCategories);
      }
    }
    return res.json(allCategories);
  } catch (err) {
    console.error('Core Error categories GET:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/api/categories', async (req, res) => {
  try {
    const fields = ['name', 'type'];
    const payload = cleanPayload(fields, req.body);

    const fallbackList = readFallback('categories');
    const newId = fallbackList.length > 0 ? Math.max(...fallbackList.map(c => parseInt(c.id) || 0)) + 1 : 1;
    const finalPayload = { id: newId, ...payload };
    fallbackList.push(finalPayload);
    writeFallback('categories', fallbackList);

    if (!useFallbackMode) {
      try {
        const category = await db.insert(schema.categories).values(payload).returning();
        return res.json(category[0]);
      } catch (err) {
        console.warn('[DB Failsafe] Inserting category failed. Activating fallback.', (err as Error).message);
        useFallbackMode = true;
      }
    }
    return res.json(finalPayload);
  } catch (err) {
    console.error('Core Error categories POST:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

app.put('/api/categories/:id', async (req, res) => {
  try {
    const fields = ['name', 'type'];
    const payload = cleanPayload(fields, req.body);

    const fallbackList = readFallback('categories');
    const index = fallbackList.findIndex(item => String(item.id) === String(req.params.id));
    let updatedPayload = { id: parseInt(req.params.id), ...payload };
    if (index !== -1) {
      fallbackList[index] = { ...fallbackList[index], ...payload };
      updatedPayload = fallbackList[index];
    } else {
      fallbackList.push(updatedPayload);
    }
    writeFallback('categories', fallbackList);

    if (!useFallbackMode) {
      try {
        const updated = await db.update(schema.categories)
          .set(payload)
          .where(eq(schema.categories.id, parseInt(req.params.id)))
          .returning();
        return res.json(updated[0]);
      } catch (err) {
        console.warn('[DB Failsafe] Updating category failed. Activating fallback.', (err as Error).message);
        useFallbackMode = true;
      }
    }
    return res.json(updatedPayload);
  } catch (err) {
    console.error('Core Error categories PUT:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

app.delete('/api/categories/:id', async (req, res) => {
  try {
    const fallbackList = readFallback('categories').filter(item => String(item.id) !== String(req.params.id));
    writeFallback('categories', fallbackList);

    if (!useFallbackMode) {
      try {
        await db.delete(schema.categories).where(eq(schema.categories.id, parseInt(req.params.id)));
      } catch (err) {
        console.warn('[DB Failsafe] Deleting category failed. Activating fallback.', (err as Error).message);
        useFallbackMode = true;
      }
    }
    return res.json({ success: true });
  } catch (err) {
    console.error('Core Error categories DELETE:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

// 4. Plans
app.get('/api/plans', async (req, res) => {
  try {
    let allPlans = [];
    if (!useFallbackMode) {
      try {
        allPlans = await db.select().from(schema.plans);
      } catch (err) {
        console.warn('[DB Failsafe] Fetching plans failed. Activating fallback.', (err as Error).message);
        useFallbackMode = true;
      }
    }
    if (useFallbackMode || allPlans.length === 0) {
      allPlans = readFallback('plans');
      if (allPlans.length === 0) {
        allPlans = [
          { id: "p1", title: "1 Hour Play", price: "200", type: "hourly", validationDays: 1, validationTimeMin: 60, description: "1 Hour play zone entry", gstSlab: 18, createdAt: new Date() },
          { id: "p2", title: "2 Hours Play", price: "350", type: "hourly", validationDays: 1, validationTimeMin: 120, description: "2 Hours play zone entry", gstSlab: 18, createdAt: new Date() },
          { id: "p3", title: "Full Day Play", price: "600", type: "full_day", validationDays: 1, validationTimeMin: 480, description: "Unlimited play zone entry for a full day", gstSlab: 18, createdAt: new Date() },
          { id: "p4", title: "Monthly Pass", price: "3000", type: "membership", validationDays: 30, validationTimeMin: 1800, description: "30 Days membership with access to PlayZone", gstSlab: 18, createdAt: new Date() }
        ];
        writeFallback('plans', allPlans);
      }
    }
    return res.json(allPlans);
  } catch (err) {
    console.error('Core Error plans GET:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/api/plans', async (req, res) => {
  try {
    const fields = ['id', 'title', 'price', 'type', 'validationDays', 'validationTimeMin', 'description', 'gstSlab', 'createdAt'];
    const payload = cleanPayload(fields, req.body);
    if (payload.createdAt) payload.createdAt = new Date(payload.createdAt);
    if (!payload.id) {
      payload.id = `PLN-${Date.now()}`;
    }

    const fallbackList = readFallback('plans');
    fallbackList.push(payload);
    writeFallback('plans', fallbackList);

    if (!useFallbackMode) {
      try {
        const plan = await db.insert(schema.plans).values(payload).returning();
        return res.json(plan[0]);
      } catch (err) {
        console.warn('[DB Failsafe] Inserting plan failed. Activating fallback.', (err as Error).message);
        useFallbackMode = true;
      }
    }
    return res.json(payload);
  } catch (err) {
    console.error('Core Error plans POST:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

app.put('/api/plans/:id', async (req, res) => {
  try {
    const fields = ['title', 'price', 'type', 'validationDays', 'validationTimeMin', 'description', 'gstSlab', 'createdAt'];
    const payload = cleanPayload(fields, req.body);
    if (payload.createdAt) payload.createdAt = new Date(payload.createdAt);

    const fallbackList = readFallback('plans');
    const index = fallbackList.findIndex(item => String(item.id) === String(req.params.id));
    let updatedPayload = { id: req.params.id, ...payload };
    if (index !== -1) {
      fallbackList[index] = { ...fallbackList[index], ...payload };
      updatedPayload = fallbackList[index];
    } else {
      fallbackList.push(updatedPayload);
    }
    writeFallback('plans', fallbackList);

    if (!useFallbackMode) {
      try {
        const updated = await db.update(schema.plans)
          .set(payload)
          .where(eq(schema.plans.id, req.params.id))
          .returning();
        return res.json(updated[0]);
      } catch (err) {
        console.warn('[DB Failsafe] Updating plan failed. Activating fallback.', (err as Error).message);
        useFallbackMode = true;
      }
    }
    return res.json(updatedPayload);
  } catch (err) {
    console.error('Core Error plans PUT:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

app.delete('/api/plans/:id', async (req, res) => {
  try {
    const fallbackList = readFallback('plans').filter(item => String(item.id) !== String(req.params.id));
    writeFallback('plans', fallbackList);

    if (!useFallbackMode) {
      try {
        await db.delete(schema.plans).where(eq(schema.plans.id, req.params.id));
      } catch (err) {
        console.warn('[DB Failsafe] Deleting plan failed. Activating fallback.', (err as Error).message);
        useFallbackMode = true;
      }
    }
    return res.json({ success: true });
  } catch (err) {
    console.error('Core Error plans DELETE:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

// 5. Members
app.get('/api/members', async (req, res) => {
  try {
    let allMembers = [];
    if (!useFallbackMode) {
      try {
        allMembers = await db.select().from(schema.members);
      } catch (err) {
        console.warn('[DB Failsafe] Fetching members failed. Activating fallback.', (err as Error).message);
        useFallbackMode = true;
      }
    }
    if (useFallbackMode) {
      allMembers = readFallback('members');
    }
    return res.json(allMembers);
  } catch (err) {
    console.error('Core Error members GET:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/api/members', async (req, res) => {
  try {
    const fields = ['id', 'parentName', 'mobileNumber', 'childName', 'childAge', 'planId', 'medicalNotes', 'createdAt'];
    const payload = cleanPayload(fields, req.body);
    if (payload.createdAt) payload.createdAt = new Date(payload.createdAt);
    if (!payload.id) payload.id = `MEM-${Date.now()}`;

    const fallbackList = readFallback('members');
    fallbackList.push(payload);
    writeFallback('members', fallbackList);

    if (!useFallbackMode) {
      try {
        const member = await db.insert(schema.members).values(payload).returning();
        return res.json(member[0]);
      } catch (err) {
        console.warn('[DB Failsafe] Inserting member failed. Activating fallback.', (err as Error).message);
        useFallbackMode = true;
      }
    }
    return res.json(payload);
  } catch (err) {
    console.error('Core Error members POST:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

app.put('/api/members/:id', async (req, res) => {
  try {
    const fields = ['parentName', 'mobileNumber', 'childName', 'childAge', 'planId', 'medicalNotes', 'createdAt'];
    const payload = cleanPayload(fields, req.body);
    if (payload.createdAt) payload.createdAt = new Date(payload.createdAt);

    const fallbackList = readFallback('members');
    const index = fallbackList.findIndex(item => String(item.id) === String(req.params.id));
    let updatedPayload = { id: req.params.id, ...payload };
    if (index !== -1) {
      fallbackList[index] = { ...fallbackList[index], ...payload };
      updatedPayload = fallbackList[index];
    } else {
      fallbackList.push(updatedPayload);
    }
    writeFallback('members', fallbackList);

    if (!useFallbackMode) {
      try {
        const updated = await db.update(schema.members)
          .set(payload)
          .where(eq(schema.members.id, req.params.id))
          .returning();
        return res.json(updated[0]);
      } catch (err) {
        console.warn('[DB Failsafe] Updating member failed. Activating fallback.', (err as Error).message);
        useFallbackMode = true;
      }
    }
    return res.json(updatedPayload);
  } catch (err) {
    console.error('Core Error members PUT:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

app.delete('/api/members/:id', async (req, res) => {
  try {
    const fallbackList = readFallback('members').filter(item => String(item.id) !== String(req.params.id));
    writeFallback('members', fallbackList);

    if (!useFallbackMode) {
      try {
        await db.delete(schema.members).where(eq(schema.members.id, req.params.id));
      } catch (err) {
        console.warn('[DB Failsafe] Deleting member failed. Activating fallback.', (err as Error).message);
        useFallbackMode = true;
      }
    }
    return res.json({ success: true });
  } catch (err) {
    console.error('Core Error members DELETE:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

// 6. Services
app.get('/api/services', async (req, res) => {
  try {
    let allServices = [];
    if (!useFallbackMode) {
      try {
        allServices = await db.select().from(schema.services);
      } catch (err) {
        console.warn('[DB Failsafe] Fetching services failed. Activating fallback.', (err as Error).message);
        useFallbackMode = true;
      }
    }
    if (useFallbackMode || allServices.length === 0) {
      allServices = readFallback('services');
      if (allServices.length === 0) {
        allServices = [
          { id: 1, categoryId: 1, name: "Play Zone Extra Hour", price: "100", gstSlab: 18 },
          { id: 2, categoryId: 2, name: "Regular Socks", price: "40", gstSlab: 5 },
          { id: 3, categoryId: 2, name: "Premium Grip Socks", price: "60", gstSlab: 5 }
        ];
        writeFallback('services', allServices);
      }
    }
    return res.json(allServices);
  } catch (err) {
    console.error('Core Error services GET:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/api/services', async (req, res) => {
  try {
    const fields = ['categoryId', 'name', 'price', 'gstSlab'];
    const payload = cleanPayload(fields, req.body);

    const fallbackList = readFallback('services');
    const newId = fallbackList.length > 0 ? Math.max(...fallbackList.map(s => parseInt(s.id) || 0)) + 1 : 1;
    const finalPayload = { id: newId, ...payload };
    fallbackList.push(finalPayload);
    writeFallback('services', fallbackList);

    if (!useFallbackMode) {
      try {
        const service = await db.insert(schema.services).values(payload).returning();
        return res.json(service[0]);
      } catch (err) {
        console.warn('[DB Failsafe] Inserting service failed. Activating fallback.', (err as Error).message);
        useFallbackMode = true;
      }
    }
    return res.json(finalPayload);
  } catch (err) {
    console.error('Core Error services POST:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

app.put('/api/services/:id', async (req, res) => {
  try {
    const fields = ['categoryId', 'name', 'price', 'gstSlab'];
    const payload = cleanPayload(fields, req.body);

    const fallbackList = readFallback('services');
    const index = fallbackList.findIndex(item => String(item.id) === String(req.params.id));
    let updatedPayload = { id: parseInt(req.params.id), ...payload };
    if (index !== -1) {
      fallbackList[index] = { ...fallbackList[index], ...payload };
      updatedPayload = fallbackList[index];
    } else {
      fallbackList.push(updatedPayload);
    }
    writeFallback('services', fallbackList);

    if (!useFallbackMode) {
      try {
        const updated = await db.update(schema.services)
          .set(payload)
          .where(eq(schema.services.id, parseInt(req.params.id)))
          .returning();
        return res.json(updated[0]);
      } catch (err) {
        console.warn('[DB Failsafe] Updating service failed. Activating fallback.', (err as Error).message);
        useFallbackMode = true;
      }
    }
    return res.json(updatedPayload);
  } catch (err) {
    console.error('Core Error services PUT:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

app.delete('/api/services/:id', async (req, res) => {
  try {
    const fallbackList = readFallback('services').filter(item => String(item.id) !== String(req.params.id));
    writeFallback('services', fallbackList);

    if (!useFallbackMode) {
      try {
        await db.delete(schema.services).where(eq(schema.services.id, parseInt(req.params.id)));
      } catch (err) {
        console.warn('[DB Failsafe] Deleting service failed. Activating fallback.', (err as Error).message);
        useFallbackMode = true;
      }
    }
    return res.json({ success: true });
  } catch (err) {
    console.error('Core Error services DELETE:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

// 7. Catalogue
app.get('/api/catalogue', async (req, res) => {
  try {
    let allCatalogue = [];
    if (!useFallbackMode) {
      try {
        allCatalogue = await db.select().from(schema.catalogue);
      } catch (err) {
        console.warn('[DB Failsafe] Fetching catalogue failed. Activating fallback.', (err as Error).message);
        useFallbackMode = true;
      }
    }
    if (useFallbackMode || allCatalogue.length === 0) {
      allCatalogue = readFallback('catalogue');
      if (allCatalogue.length === 0) {
        allCatalogue = [
          { id: 1, designName: "Adventure Land Theme", categoryId: 4, imageUrl: "https://images.unsplash.com/photo-1531058020387-3be344559be6?w=600", estimatePrice: "5000", description: "Jungle themes and ropes setups" },
          { id: 2, designName: "Frozen Winter Dream Theme", categoryId: 4, imageUrl: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=600", estimatePrice: "8000", description: "Blue light, castle patterns, cozy setups" }
        ];
        writeFallback('catalogue', allCatalogue);
      }
    }
    return res.json(allCatalogue);
  } catch (err) {
    console.error('Core Error catalogue GET:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/api/catalogue', async (req, res) => {
  try {
    const fields = ['designName', 'categoryId', 'imageUrl', 'estimatePrice', 'description'];
    const body = {
      ...req.body,
      designName: req.body.designName || req.body.name // Map frontend name design
    };
    const payload = cleanPayload(fields, body);

    const fallbackList = readFallback('catalogue');
    const newId = fallbackList.length > 0 ? Math.max(...fallbackList.map(c => parseInt(c.id) || 0)) + 1 : 1;
    const finalPayload = { id: newId, ...payload };
    fallbackList.push(finalPayload);
    writeFallback('catalogue', fallbackList);

    if (!useFallbackMode) {
      try {
        const catalogue = await db.insert(schema.catalogue).values(payload).returning();
        return res.json(catalogue[0]);
      } catch (err) {
        console.warn('[DB Failsafe] Inserting catalogue failed. Activating fallback.', (err as Error).message);
        useFallbackMode = true;
      }
    }
    return res.json(finalPayload);
  } catch (err) {
    console.error('Error inserting catalogue:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

app.put('/api/catalogue/:id', async (req, res) => {
  try {
    const fields = ['designName', 'categoryId', 'imageUrl', 'estimatePrice', 'description'];
    const body = {
      ...req.body,
      designName: req.body.designName || req.body.name // Map frontend name design
    };
    const payload = cleanPayload(fields, body);

    const fallbackList = readFallback('catalogue');
    const index = fallbackList.findIndex(item => String(item.id) === String(req.params.id));
    let updatedPayload = { id: parseInt(req.params.id), ...payload };
    if (index !== -1) {
      fallbackList[index] = { ...fallbackList[index], ...payload };
      updatedPayload = fallbackList[index];
    } else {
      fallbackList.push(updatedPayload);
    }
    writeFallback('catalogue', fallbackList);

    if (!useFallbackMode) {
      try {
        const updated = await db.update(schema.catalogue)
          .set(payload)
          .where(eq(schema.catalogue.id, parseInt(req.params.id)))
          .returning();
        return res.json(updated[0]);
      } catch (err) {
        console.warn('[DB Failsafe] Updating catalogue failed. Activating fallback.', (err as Error).message);
        useFallbackMode = true;
      }
    }
    return res.json(updatedPayload);
  } catch (err) {
    console.error('Error updating catalogue:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

app.delete('/api/catalogue/:id', async (req, res) => {
  try {
    const fallbackList = readFallback('catalogue').filter(item => String(item.id) !== String(req.params.id));
    writeFallback('catalogue', fallbackList);

    if (!useFallbackMode) {
      try {
        await db.delete(schema.catalogue).where(eq(schema.catalogue.id, parseInt(req.params.id)));
      } catch (err) {
        console.warn('[DB Failsafe] Deleting catalogue failed. Activating fallback.', (err as Error).message);
        useFallbackMode = true;
      }
    }
    return res.json({ success: true });
  } catch (err) {
    console.error('Error deleting catalogue:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

// 8. Play Entries
app.get('/api/entries', async (req, res) => {
  try {
    let allEntries = [];
    if (!useFallbackMode) {
      try {
        allEntries = await db.select().from(schema.playEntries);
      } catch (err) {
        console.warn('[DB Failsafe] Fetching play entries failed. Activating fallback.', (err as Error).message);
        useFallbackMode = true;
      }
    }
    if (useFallbackMode) {
      allEntries = readFallback('play_entries');
    }
    return res.json(allEntries);
  } catch (err) {
    console.error('Core Error entries GET:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/api/entries', async (req, res) => {
  try {
    const fields = [
      'id', 'childName', 'parentName', 'mobileNumber', 'startTime', 'endTime',
      'planId', 'planName', 'amount', 'status', 'memberId', 'personCount',
      'socksCounts', 'invoiceId', 'overtimeAmount', 'staffId', 'handledBy', 'createdAt'
    ];
    const payload = cleanPayload(fields, req.body);
    if (!payload.id) payload.id = `ENT-${Date.now()}`;
    if (payload.startTime) payload.startTime = new Date(payload.startTime);
    if (payload.endTime) payload.endTime = new Date(payload.endTime);
    if (payload.createdAt) payload.createdAt = new Date(payload.createdAt);

    const fallbackList = readFallback('play_entries');
    fallbackList.push(payload);
    writeFallback('play_entries', fallbackList);

    if (!useFallbackMode) {
      try {
        const entry = await db.insert(schema.playEntries).values(payload).returning();
        return res.json(entry[0]);
      } catch (err) {
        console.warn('[DB Failsafe] Inserting play entry failed. Activating fallback.', (err as Error).message);
        useFallbackMode = true;
      }
    }
    return res.json(payload);
  } catch (err) {
    console.error('Core Error entries POST:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

app.put('/api/entries/:id', async (req, res) => {
  try {
    const fields = [
      'childName', 'parentName', 'mobileNumber', 'startTime', 'endTime',
      'planId', 'planName', 'amount', 'status', 'memberId', 'personCount',
      'socksCounts', 'invoiceId', 'overtimeAmount', 'staffId', 'handledBy', 'createdAt'
    ];
    const payload = cleanPayload(fields, req.body);
    if (payload.startTime) payload.startTime = new Date(payload.startTime);
    if (payload.endTime) payload.endTime = new Date(payload.endTime);
    if (payload.createdAt) payload.createdAt = new Date(payload.createdAt);

    const fallbackList = readFallback('play_entries');
    const index = fallbackList.findIndex(item => String(item.id) === String(req.params.id));
    let updatedPayload = { id: req.params.id, ...payload };
    if (index !== -1) {
      fallbackList[index] = { ...fallbackList[index], ...payload };
      updatedPayload = fallbackList[index];
    } else {
      fallbackList.push(updatedPayload);
    }
    writeFallback('play_entries', fallbackList);

    if (!useFallbackMode) {
      try {
        const updated = await db.update(schema.playEntries)
          .set(payload)
          .where(eq(schema.playEntries.id, req.params.id))
          .returning();
        return res.json(updated[0]);
      } catch (err) {
        console.warn('[DB Failsafe] Updating play entry failed. Activating fallback.', (err as Error).message);
        useFallbackMode = true;
      }
    }
    return res.json(updatedPayload);
  } catch (err) {
    console.error('Core Error entries PUT:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

app.delete('/api/entries/:id', async (req, res) => {
  try {
    const fallbackList = readFallback('play_entries').filter(item => String(item.id) !== String(req.params.id));
    writeFallback('play_entries', fallbackList);

    if (!useFallbackMode) {
      try {
        await db.delete(schema.playEntries).where(eq(schema.playEntries.id, req.params.id));
      } catch (err) {
        console.warn('[DB Failsafe] Deleting play entry failed. Activating fallback.', (err as Error).message);
        useFallbackMode = true;
      }
    }
    return res.json({ success: true });
  } catch (err) {
    console.error('Core Error entries DELETE:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

// 9. Billings
app.get('/api/billings', async (req, res) => {
  try {
    let allBillings = [];
    if (!useFallbackMode) {
      try {
        allBillings = await db.select().from(schema.billings);
      } catch (err) {
        console.warn('[DB Failsafe] Fetching billings failed. Activating fallback.', (err as Error).message);
        useFallbackMode = true;
      }
    }
    if (useFallbackMode) {
      allBillings = readFallback('billings');
    }
    return res.json(allBillings);
  } catch (err) {
    console.error('Core Error billings GET:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/api/billings', async (req, res) => {
  try {
    const fields = [
      'customerId', 'customerName', 'handledBy', 'mobileNo', 'planId', 'durationMin',
      'personCount', 'socksCounts', 'items', 'subtotal', 'totalGst', 'payable', 'paymentMode', 'createdAt'
    ];
    const payload = cleanPayload(fields, req.body);
    if (payload.createdAt) payload.createdAt = new Date(payload.createdAt);

    // Save fallback
    const fallbackList = readFallback('billings');
    const newId = fallbackList.length > 0 ? Math.max(...fallbackList.map(b => parseInt(b.id) || 0)) + 1 : 1;
    const finalPayload = { id: newId, ...payload };
    fallbackList.push(finalPayload);
    writeFallback('billings', fallbackList);

    if (!useFallbackMode) {
      try {
        const billing = await db.insert(schema.billings).values(payload).returning();
        return res.json(billing[0]);
      } catch (err) {
        console.warn('[DB Failsafe] Inserting billing failed. Activating fallback.', (err as Error).message);
        useFallbackMode = true;
      }
    }
    return res.json(finalPayload);
  } catch (err) {
    console.error('Core Error billings POST:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

app.put('/api/billings/:id', async (req, res) => {
  try {
    const fields = [
      'customerId', 'customerName', 'handledBy', 'mobileNo', 'planId', 'durationMin',
      'personCount', 'socksCounts', 'items', 'subtotal', 'totalGst', 'payable', 'paymentMode', 'createdAt'
    ];
    const payload = cleanPayload(fields, req.body);
    if (payload.createdAt) payload.createdAt = new Date(payload.createdAt);

    const fallbackList = readFallback('billings');
    const index = fallbackList.findIndex(item => String(item.id) === String(req.params.id));
    let updatedPayload = { id: parseInt(req.params.id), ...payload };
    if (index !== -1) {
      fallbackList[index] = { ...fallbackList[index], ...payload };
      updatedPayload = fallbackList[index];
    } else {
      fallbackList.push(updatedPayload);
    }
    writeFallback('billings', fallbackList);

    if (!useFallbackMode) {
      try {
        const updated = await db.update(schema.billings)
          .set(payload)
          .where(eq(schema.billings.id, parseInt(req.params.id)))
          .returning();
        return res.json(updated[0]);
      } catch (err) {
        console.warn('[DB Failsafe] Updating billing failed. Activating fallback.', (err as Error).message);
        useFallbackMode = true;
      }
    }
    return res.json(updatedPayload);
  } catch (err) {
    console.error('Core Error billings PUT:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

app.delete('/api/billings/:id', async (req, res) => {
  try {
    const fallbackList = readFallback('billings').filter(item => String(item.id) !== String(req.params.id));
    writeFallback('billings', fallbackList);

    if (!useFallbackMode) {
      try {
        await db.delete(schema.billings).where(eq(schema.billings.id, parseInt(req.params.id)));
      } catch (err) {
        console.warn('[DB Failsafe] Deleting billing failed. Activating fallback.', (err as Error).message);
        useFallbackMode = true;
      }
    }
    return res.json({ success: true });
  } catch (err) {
    console.error('Core Error billings DELETE:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

// 10. Events
app.get('/api/events', async (req, res) => {
  try {
    let allEvents = [];
    if (!useFallbackMode) {
      try {
        allEvents = await db.select().from(schema.events);
      } catch (err) {
        console.warn('[DB Failsafe] Fetching events failed. Activating fallback.', (err as Error).message);
        useFallbackMode = true;
      }
    }
    if (useFallbackMode) {
      allEvents = readFallback('events');
    }
    return res.json(allEvents);
  } catch (err) {
    console.error('Core Error events GET:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/api/events', async (req, res) => {
  try {
    const fields = [
      'id', 'categoryId', 'customerId', 'customerName', 'mobileNumber',
      'bookingCharges', 'grandTotal', 'gstPercent', 'advanceAmount',
      'paymentMode', 'paymentStatus', 'bookingDate', 'notes', 'createdAt'
    ];
    const payload = cleanPayload(fields, req.body);
    if (!payload.id) payload.id = `EVT-${Date.now()}`;
    if (payload.createdAt) payload.createdAt = new Date(payload.createdAt);

    const fallbackList = readFallback('events');
    fallbackList.push(payload);
    writeFallback('events', fallbackList);

    if (!useFallbackMode) {
      try {
        const event = await db.insert(schema.events).values(payload).returning();
        return res.json(event[0]);
      } catch (err) {
        console.warn('[DB Failsafe] Inserting event failed. Activating fallback.', (err as Error).message);
        useFallbackMode = true;
      }
    }
    return res.json(payload);
  } catch (err) {
    console.error('Core Error events POST:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

app.put('/api/events/:id', async (req, res) => {
  try {
    const fields = [
      'categoryId', 'customerId', 'customerName', 'mobileNumber',
      'bookingCharges', 'grandTotal', 'gstPercent', 'advanceAmount',
      'paymentMode', 'paymentStatus', 'bookingDate', 'notes', 'createdAt'
    ];
    const payload = cleanPayload(fields, req.body);
    if (payload.createdAt) payload.createdAt = new Date(payload.createdAt);

    const fallbackList = readFallback('events');
    const index = fallbackList.findIndex(item => String(item.id) === String(req.params.id));
    let updatedPayload = { id: req.params.id, ...payload };
    if (index !== -1) {
      fallbackList[index] = { ...fallbackList[index], ...payload };
      updatedPayload = fallbackList[index];
    } else {
      fallbackList.push(updatedPayload);
    }
    writeFallback('events', fallbackList);

    if (!useFallbackMode) {
      try {
        const updated = await db.update(schema.events)
          .set(payload)
          .where(eq(schema.events.id, req.params.id))
          .returning();
        return res.json(updated[0]);
      } catch (err) {
        console.warn('[DB Failsafe] Updating event failed. Activating fallback.', (err as Error).message);
        useFallbackMode = true;
      }
    }
    return res.json(updatedPayload);
  } catch (err) {
    console.error('Core Error events PUT:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

app.delete('/api/events/:id', async (req, res) => {
  try {
    const fallbackList = readFallback('events').filter(item => String(item.id) !== String(req.params.id));
    writeFallback('events', fallbackList);

    if (!useFallbackMode) {
      try {
        await db.delete(schema.events).where(eq(schema.events.id, req.params.id));
      } catch (err) {
        console.warn('[DB Failsafe] Deleting event failed. Activating fallback.', (err as Error).message);
        useFallbackMode = true;
      }
    }
    return res.json({ success: true });
  } catch (err) {
    console.error('Core Error events DELETE:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

// 11. Expenses
app.get('/api/expenses', async (req, res) => {
  try {
    let allExpenses = [];
    if (!useFallbackMode) {
      try {
        allExpenses = await db.select().from(schema.expenses);
      } catch (err) {
        console.warn('[DB Failsafe] Fetching expenses failed. Activating fallback.', (err as Error).message);
        useFallbackMode = true;
      }
    }
    if (useFallbackMode) {
      allExpenses = readFallback('expenses');
    }
    return res.json(allExpenses);
  } catch (err) {
    console.error('Core Error expenses GET:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/api/expenses', async (req, res) => {
  try {
    const fields = ['categoryId', 'amount', 'description', 'vendorName', 'date', 'createdAt'];
    const payload = cleanPayload(fields, req.body);
    if (payload.date) payload.date = new Date(payload.date);
    if (payload.createdAt) payload.createdAt = new Date(payload.createdAt);

    const fallbackList = readFallback('expenses');
    const newId = fallbackList.length > 0 ? Math.max(...fallbackList.map(e => parseInt(e.id) || 0)) + 1 : 1;
    const finalPayload = { id: newId, ...payload };
    fallbackList.push(finalPayload);
    writeFallback('expenses', fallbackList);

    if (!useFallbackMode) {
      try {
        const expense = await db.insert(schema.expenses).values(payload).returning();
        return res.json(expense[0]);
      } catch (err) {
        console.warn('[DB Failsafe] Inserting expense failed. Activating fallback.', (err as Error).message);
        useFallbackMode = true;
      }
    }
    return res.json(finalPayload);
  } catch (err) {
    console.error('Core Error expenses POST:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

app.put('/api/expenses/:id', async (req, res) => {
  try {
    const fields = ['categoryId', 'amount', 'description', 'vendorName', 'date', 'createdAt'];
    const payload = cleanPayload(fields, req.body);
    if (payload.date) payload.date = new Date(payload.date);
    if (payload.createdAt) payload.createdAt = new Date(payload.createdAt);

    const fallbackList = readFallback('expenses');
    const index = fallbackList.findIndex(item => String(item.id) === String(req.params.id));
    let updatedPayload = { id: parseInt(req.params.id), ...payload };
    if (index !== -1) {
      fallbackList[index] = { ...fallbackList[index], ...payload };
      updatedPayload = fallbackList[index];
    } else {
      fallbackList.push(updatedPayload);
    }
    writeFallback('expenses', fallbackList);

    if (!useFallbackMode) {
      try {
        const updated = await db.update(schema.expenses)
          .set(payload)
          .where(eq(schema.expenses.id, parseInt(req.params.id)))
          .returning();
        return res.json(updated[0]);
      } catch (err) {
        console.warn('[DB Failsafe] Updating expense failed. Activating fallback.', (err as Error).message);
        useFallbackMode = true;
      }
    }
    return res.json(updatedPayload);
  } catch (err) {
    console.error('Core Error expenses PUT:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

app.delete('/api/expenses/:id', async (req, res) => {
  try {
    const fallbackList = readFallback('expenses').filter(item => String(item.id) !== String(req.params.id));
    writeFallback('expenses', fallbackList);

    if (!useFallbackMode) {
      try {
        await db.delete(schema.expenses).where(eq(schema.expenses.id, parseInt(req.params.id)));
      } catch (err) {
        console.warn('[DB Failsafe] Deleting expense failed. Activating fallback.', (err as Error).message);
        useFallbackMode = true;
      }
    }
    return res.json({ success: true });
  } catch (err) {
    console.error('Core Error expenses DELETE:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

// 12. Walk-in legacy data V1 & V2
app.get('/api/walk-in-v1', async (req, res) => {
  try {
    let data = [];
    if (!useFallbackMode) {
      try {
        data = await db.select().from(schema.walkInCustomers);
      } catch (err) {
        console.warn('[DB Failsafe] Fetching walk-in-v1 failed. Activating fallback.', (err as Error).message);
        useFallbackMode = true;
      }
    }
    if (useFallbackMode) {
      data = readFallback('walk_in_customers');
    }
    return res.json(data);
  } catch (err) {
    console.error('Core Error walk-in-v1 GET:', err);
    res.json([]);
  }
});

app.get('/api/walk-in-v2', async (req, res) => {
  try {
    let data = [];
    if (!useFallbackMode) {
      try {
        data = await db.select().from(schema.walkInMembers);
      } catch (err) {
        console.warn('[DB Failsafe] Fetching walk-in-v2 failed. Activating fallback.', (err as Error).message);
        useFallbackMode = true;
      }
    }
    if (useFallbackMode) {
      data = readFallback('walk_in_members');
    }
    return res.json(data);
  } catch (err) {
    console.error('Core Error walk-in-v2 GET:', err);
    res.json([]);
  }
});

// 13. Dynamic Inventory (Socks Types)
app.get('/api/socks-types', async (req, res) => {
  try {
    let types = [];
    if (!useFallbackMode) {
      try {
        types = await db.select().from(schema.socksTypes);
      } catch (err) {
        console.warn('[DB Failsafe] Fetching socks-types failed. Activating fallback.', (err as Error).message);
        useFallbackMode = true;
      }
    }
    if (useFallbackMode || types.length === 0) {
      types = readFallback('socks_types');
      if (types.length === 0) {
        types = [
          { id: 1, name: "Small Socks", price: "40", gstSlab: 5 },
          { id: 2, name: "Medium Socks", price: "50", gstSlab: 5 }
        ];
        writeFallback('socks_types', types);
      }
    }
    return res.json(types);
  } catch (err) {
    console.error('Core Error socks-types GET:', err);
    res.json([]);
  }
});

app.post('/api/socks-types', async (req, res) => {
  try {
    const fields = ['name', 'price', 'gstSlab'];
    const payload = cleanPayload(fields, req.body);

    const fallbackList = readFallback('socks_types');
    const newId = fallbackList.length > 0 ? Math.max(...fallbackList.map(t => parseInt(t.id) || 0)) + 1 : 1;
    const finalPayload = { id: newId, ...payload };
    fallbackList.push(finalPayload);
    writeFallback('socks_types', fallbackList);

    if (!useFallbackMode) {
      try {
        const type = await db.insert(schema.socksTypes).values(payload).returning();
        return res.json(type[0]);
      } catch (err) {
        console.warn('[DB Failsafe] Inserting socks-type failed. Activating fallback.', (err as Error).message);
        useFallbackMode = true;
      }
    }
    return res.json(finalPayload);
  } catch (err) {
    console.error('Core Error socks-types POST:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

app.put('/api/socks-types/:id', async (req, res) => {
  try {
    const fields = ['name', 'price', 'gstSlab'];
    const payload = cleanPayload(fields, req.body);

    const fallbackList = readFallback('socks_types');
    const index = fallbackList.findIndex(item => String(item.id) === String(req.params.id));
    let updatedPayload = { id: parseInt(req.params.id), ...payload };
    if (index !== -1) {
      fallbackList[index] = { ...fallbackList[index], ...payload };
      updatedPayload = fallbackList[index];
    } else {
      fallbackList.push(updatedPayload);
    }
    writeFallback('socks_types', fallbackList);

    if (!useFallbackMode) {
      try {
        const updated = await db.update(schema.socksTypes)
          .set(payload)
          .where(eq(schema.socksTypes.id, parseInt(req.params.id)))
          .returning();
        return res.json(updated[0]);
      } catch (err) {
        console.warn('[DB Failsafe] Updating socks-type failed. Activating fallback.', (err as Error).message);
        useFallbackMode = true;
      }
    }
    return res.json(updatedPayload);
  } catch (err) {
    console.error('Core Error socks-types PUT:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

app.delete('/api/socks-types/:id', async (req, res) => {
  try {
    const fallbackList = readFallback('socks_types').filter(item => String(item.id) !== String(req.params.id));
    writeFallback('socks_types', fallbackList);

    if (!useFallbackMode) {
      try {
        await db.delete(schema.socksTypes).where(eq(schema.socksTypes.id, parseInt(req.params.id)));
      } catch (err) {
        console.warn('[DB Failsafe] Deleting socks-type failed. Activating fallback.', (err as Error).message);
        useFallbackMode = true;
      }
    }
    return res.json({ success: true });
  } catch (err) {
    console.error('Core Error socks-types DELETE:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

// 14. System Settings
app.get('/api/system-settings/:key', async (req, res) => {
  try {
    let setting = null;
    if (!useFallbackMode) {
      try {
        const dbSetting = await db.select().from(schema.systemSettings)
          .where(eq(schema.systemSettings.key, req.params.key))
          .limit(1);
        if (dbSetting.length > 0) {
          setting = dbSetting[0].value;
        }
      } catch (err) {
        console.warn('[DB Failsafe] Fetching system settings failed. Activating fallback.', (err as Error).message);
        useFallbackMode = true;
      }
    }
    if (useFallbackMode || !setting) {
      const fallbackList = readFallback('system_settings');
      const found = fallbackList.find(item => item.key === req.params.key);
      setting = found ? found.value : null;
    }
    return res.json(setting);
  } catch (err) {
    console.error('Core Error system-settings GET:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/api/system-settings/:key', async (req, res) => {
  try {
    const fallbackList = readFallback('system_settings');
    const index = fallbackList.findIndex(item => item.key === req.params.key);
    if (index !== -1) {
      fallbackList[index].value = req.body;
      fallbackList[index].updatedAt = new Date();
    } else {
      fallbackList.push({ key: req.params.key, value: req.body, updatedAt: new Date() });
    }
    writeFallback('system_settings', fallbackList);

    if (!useFallbackMode) {
      try {
        const existing = await db.select().from(schema.systemSettings)
          .where(eq(schema.systemSettings.key, req.params.key))
          .limit(1);
        if (existing.length > 0) {
          const updated = await db.update(schema.systemSettings)
            .set({ value: req.body, updatedAt: new Date() })
            .where(eq(schema.systemSettings.key, req.params.key))
            .returning();
          return res.json(updated[0].value);
        } else {
          const created = await db.insert(schema.systemSettings)
            .values({ key: req.params.key, value: req.body })
            .returning();
          return res.json(created[0].value);
        }
      } catch (err) {
        console.warn('[DB Failsafe] Updating system settings failed. Activating fallback.', (err as Error).message);
        useFallbackMode = true;
      }
    }
    return res.json(req.body);
  } catch (err) {
    console.error('Core Error system-settings POST:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

// Raw query execute backup route
app.post('/api/sql-query', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: 'Query is required' });
    if (useFallbackMode) {
      return res.json({ rows: [], command: 'FALLBACK_QUERY', rowCount: 0 });
    }
    const result = await db.execute(sql.raw(query));
    return res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// 15. Import Data payloads
app.post('/api/import-json/:type', async (req, res) => {
  const { type } = req.params;
  const data = req.body;

  if (!Array.isArray(data)) {
    return res.status(400).json({ error: 'Data must be an array of objects' });
  }

  if (data.length === 0) {
    return res.json({ success: true, count: 0 });
  }

  try {
    if (type === 'members') {
      const cleanData = data.map(item => ({
        id: String(item.id || item.cid || `MEM-${Math.random().toString(36).substr(2, 9).toUpperCase()}`),
        parentName: String(item.parentName || item.parent || ''),
        mobileNumber: String(item.mobileNumber || item.phoneNumber || item.phone || item.mno || ''),
        childName: item.childName ? String(item.childName) : null,
        childAge: item.childAge ? parseInt(String(item.childAge)) : null,
        planId: item.planId ? String(item.planId) : null,
        createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
      }));

      // Append fallback
      const fallbackList = readFallback('members');
      fallbackList.push(...cleanData);
      writeFallback('members', fallbackList);

      if (!useFallbackMode) {
        try {
          const results = await db.insert(schema.members).values(cleanData).returning();
          return res.json({ success: true, count: results.length });
        } catch (err) {
          console.warn('[DB Failsafe] Importing members failed. Fallback committed.', (err as Error).message);
          useFallbackMode = true;
        }
      }
      return res.json({ success: true, count: cleanData.length });
    } else if (type === 'accounting') {
      const cleanData = data.map(item => ({
        id: Math.floor(Math.random() * 1000000),
        categoryId: item.categoryId ? parseInt(String(item.categoryId)) : null,
        amount: String(item.amount || 0),
        description: item.description ? String(item.description) : null,
        createdAt: item.date ? new Date(item.date) : new Date(),
      }));

      const fallbackList = readFallback('expenses');
      fallbackList.push(...cleanData);
      writeFallback('expenses', fallbackList);

      if (!useFallbackMode) {
        try {
          const results = await db.insert(schema.expenses).values(cleanData.map(({id, ...rest}) => rest)).returning();
          return res.json({ success: true, count: results.length });
        } catch (err) {
          console.warn('[DB Failsafe] Importing expenses failed. Fallback committed.', (err as Error).message);
          useFallbackMode = true;
        }
      }
      return res.json({ success: true, count: cleanData.length });
    } else if (type === 'walk_in') {
      const cleanData = data.map(item => ({
        id: Math.floor(Math.random() * 1000000),
        cid: item.cid ? String(item.cid) : null,
        billNo: item.billno || item.billNo ? String(item.billno || item.billNo) : null,
        mode: item.mode ? String(item.mode) : null,
        discount: String(item.discount || 0),
        payableAmount: String(item.paybleamount || item.payableAmount || 0),
        noOfPerson: parseInt(String(item.noofperson || item.noOfPerson || 1)),
        subTotal: String(item.subtotal || item.subTotal || 0),
        grandTotal: String(item.grandtotal || item.grandTotal || 0),
        planAmount: String(item.planamount || item.planAmount || 0),
        socksPrice: String(item.shokesprice || item.socksPrice || 0),
        extraAmount: String(item.extraamount || item.extraAmount || 0),
        insDate: item.insdate || item.insDate ? new Date(item.insdate || item.insDate) : new Date(),
      }));

      const fallbackList = readFallback('walk_in_customers');
      fallbackList.push(...cleanData);
      writeFallback('walk_in_customers', fallbackList);

      if (!useFallbackMode) {
        try {
          const results = await db.insert(schema.walkInCustomers).values(cleanData.map(({id, ...rest}) => rest)).returning();
          return res.json({ success: true, count: results.length });
        } catch (err) {
          console.warn('[DB Failsafe] Importing walk_in failed. Fallback committed.', (err as Error).message);
          useFallbackMode = true;
        }
      }
      return res.json({ success: true, count: cleanData.length });
    } else if (type === 'walk_in_v2') {
      const cleanData = data.map(item => ({
        id: Math.floor(Math.random() * 1000000),
        memberId: item.memberid || item.memberId ? String(item.memberid || item.memberId) : null,
        gender: item.gender ? String(item.gender) : null,
        mno: item.mno ? String(item.mno) : null,
        age: item.age ? String(item.age) : null,
        date: item.date ? String(item.date) : null,
        status: item.status ? String(item.status) : null,
        name: item.name ? String(item.name) : null,
        planId: item.planid || item.planId ? String(item.planid || item.planId) : null,
        validationDate: item.validationdate || item.validationDate ? String(item.validationdate || item.validationDate) : null,
        socksPrice: String(item.shokesprice || item.socksPrice || 0),
      }));

      const fallbackList = readFallback('walk_in_members');
      fallbackList.push(...cleanData);
      writeFallback('walk_in_members', fallbackList);

      if (!useFallbackMode) {
        try {
          const results = await db.insert(schema.walkInMembers).values(cleanData.map(({id, ...rest}) => rest)).returning();
          return res.json({ success: true, count: results.length });
        } catch (err) {
          console.warn('[DB Failsafe] Importing walk_in_v2 failed. Fallback committed.', (err as Error).message);
          useFallbackMode = true;
        }
      }
      return res.json({ success: true, count: cleanData.length });
    }
    res.status(400).json({ error: 'Invalid import type' });
  } catch (err) {
    console.error('Import Error:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

// File parser import
app.post('/api/import/:type', upload.single('file'), async (req, res) => {
  const { type } = req.params;
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (type === 'members') {
      const results = await db.insert(schema.members).values(data as any).returning();
      return res.json({ success: true, count: results.length });
    } else if (type === 'accounting') {
      const results = await db.insert(schema.expenses).values(data as any).returning();
      return res.json({ success: true, count: results.length });
    } else if (type === 'walk_in') {
      const results = await db.insert(schema.walkInCustomers).values(data as any).returning();
      return res.json({ success: true, count: results.length });
    } else if (type === 'walk_in_v2') {
      const results = await db.insert(schema.walkInMembers).values(data as any).returning();
      return res.json({ success: true, count: results.length });
    }
    res.status(400).json({ error: 'Invalid import type' });
  } catch (err) {
    console.error('File Upload Import failed:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

// Configure Vite/Listen only in non-serverless environments
(async () => {
  if (process.env.NODE_ENV !== 'production' && process.env.VERCEL !== '1') {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.error('[Server] Failed to initialize Vite:', e);
    }
  } else if (process.env.VERCEL !== '1') {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  if (process.env.VERCEL !== '1') {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
    });
  }

  // Global error handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('[Express Global Error Handler]:', err);
    if (req.path.startsWith('/api/')) {
      return res.status(500).json({ 
        error: 'Internal Server Error', 
        message: err.message || 'An unexpected error occurred',
        path: req.path
      });
    }
    res.status(500).send('A server error occurred. Please try again later.');
  });
})();

export default app;
