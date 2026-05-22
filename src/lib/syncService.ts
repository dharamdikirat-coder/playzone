import { supabase } from './supabase';
import { enqueueOperation, getOfflineQueue, dequeueOperation } from './offlineQueue';

// --- BI-DIRECTIONAL SCHEMAS MAPPING ---

// General helper to map keys
const mapKeys = (obj: any, keyMapper: (key: string) => string): any => {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(item => mapKeys(item, keyMapper));
  if (typeof obj === 'object') {
    // Avoid mapping native instances like Date, or simple buffers
    if (obj instanceof Date) return obj;
    const result: any = {};
    for (const key of Object.keys(obj)) {
      result[keyMapper(key)] = obj[key];
    }
    return result;
  }
  return obj;
};

// Conversions
export const camelToSnake = (str: string): string =>
  str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

export const snakeToCamel = (str: string): string =>
  str.replace(/([-_][a-z])/g, group =>
    group.toUpperCase().replace('-', '').replace('_', '')
  );

// Map Javascript Object to Supabase DB Insert/Update Payload
export function mapToDB(table: string, clientObj: any): any {
  if (!clientObj) return null;
  const dbObj = { ...clientObj };

  // Explicit mappings to reconcile model differences
  if (table === 'billings') {
    // Invoices/billings state schema translation
    return {
      id: clientObj.id ? parseInt(clientObj.id) : undefined,
      customer_id: clientObj.memberId || clientObj.customerId || null,
      customer_name: clientObj.customerName || 'Walk-in',
      handled_by: clientObj.staffId || clientObj.handledBy || null,
      mobile_no: clientObj.mobileNumber || clientObj.mobileNo || '',
      plan_id: clientObj.planId || null,
      duration_min: clientObj.durationMin || null,
      person_count: clientObj.personCount || 1,
      socks_counts: clientObj.socksCounts || {},
      items: clientObj.items || [],
      subtotal: clientObj.totalBaseAmount || clientObj.subtotal || 0,
      total_gst: clientObj.totalGST || clientObj.totalGst || 0,
      payable: clientObj.totalAmount || clientObj.payable || 0,
      payment_mode: clientObj.paymentMode || 'cash',
      created_at: clientObj.date ? new Date(clientObj.date).toISOString() : new Date().toISOString()
    };
  }

  if (table === 'events') {
    return {
      id: clientObj.id,
      category_id: clientObj.categoryId || null,
      customer_id: clientObj.customerId || null,
      customer_name: clientObj.customerName,
      phone_number: clientObj.mobileNumber,
      booking_charges: clientObj.bookingCharges || 0,
      grand_total: clientObj.grandTotal || 0,
      gst_percent: clientObj.gstPercentage || 18,
      advance_amount: clientObj.advancePaid || 0,
      payment_mode: clientObj.payMode || 'cash',
      payment_status: clientObj.paymentStatus || 'Pending',
      booking_date: clientObj.date ? new Date(clientObj.date).toISOString().split('T')[0] : null,
      notes: clientObj.notes || '',
      created_at: clientObj.createdAt ? new Date(clientObj.createdAt).toISOString() : new Date().toISOString()
    };
  }

  if (table === 'expenses') {
    return {
      id: clientObj.id ? parseInt(clientObj.id) : undefined,
      category_id: clientObj.categoryId || null,
      amount: clientObj.amount,
      description: clientObj.description || '',
      vendor_name: clientObj.vendorName || '',
      date: clientObj.date ? new Date(clientObj.date).toISOString() : new Date().toISOString()
    };
  }

  if (table === 'catalogue') {
    return {
      id: clientObj.id ? parseInt(clientObj.id) : undefined,
      design_name: clientObj.name,
      category_id: parseInt(clientObj.categoryId),
      image_url: clientObj.imageUrl || '',
      estimate_price: clientObj.price || 0,
      description: clientObj.description || ''
    };
  }

  if (table === 'socks_types') {
    return {
      id: clientObj.id ? parseInt(clientObj.id) : undefined,
      name: clientObj.name || '',
      price: clientObj.price !== undefined ? parseFloat(clientObj.price).toString() : '0',
      gst_slab: parseInt(clientObj.gstSlab || clientObj.gst_slab || 5)
    };
  }

  // Generic Map (keys converted to snake_case)
  const snakeObj: any = {};
  for (const key of Object.keys(dbObj)) {
    const dbKey = camelToSnake(key);
    // Convert Dates to ISO strings for DB compatibility
    if (dbObj[key] instanceof Date) {
      snakeObj[dbKey] = dbObj[key].toISOString();
    } else {
      snakeObj[dbKey] = dbObj[key];
    }
  }
  return snakeObj;
}

// Map DB Row payload back to React CamelCase TypeScript Model
export function mapFromDB(table: string, dbRow: any): any {
  if (!dbRow) return null;

  if (table === 'billings') {
    const id = (dbRow.id ?? dbRow.id)?.toString();
    const dateVal = dbRow.created_at ?? dbRow.createdAt;
    return {
      id,
      invoiceNumber: `FL/${id ? id.padStart(6, '0') : Math.random().toString().slice(-4)}`,
      date: dateVal ? new Date(dateVal) : new Date(),
      customerName: dbRow.customer_name ?? dbRow.customerName ?? 'Walk-in',
      mobileNumber: dbRow.mobile_no ?? dbRow.mobileNo ?? '',
      mobileNo: dbRow.mobile_no ?? dbRow.mobileNo ?? '',
      items: dbRow.items || [],
      totalBaseAmount: parseFloat(dbRow.subtotal ?? dbRow.subtotal ?? 0),
      totalGST: parseFloat(dbRow.total_gst ?? dbRow.totalGst ?? 0),
      totalAmount: parseFloat(dbRow.payable ?? dbRow.payable ?? 0),
      paymentMode: dbRow.payment_mode ?? dbRow.paymentMode ?? 'cash',
      status: 'paid',
      type: 'walking',
      memberId: dbRow.customer_id ?? dbRow.customerId,
      planId: dbRow.plan_id ?? dbRow.planId,
      personCount: dbRow.person_count ?? dbRow.personCount,
      socksCounts: dbRow.socks_counts ?? dbRow.socksCounts ?? {},
      staffId: dbRow.handled_by ?? dbRow.handledBy
    };
  }

  if (table === 'events') {
    const categoryId = dbRow.category_id ?? dbRow.categoryId;
    const bookingDate = dbRow.booking_date ?? dbRow.bookingDate;
    const bookingCharges = dbRow.booking_charges ?? dbRow.bookingCharges;
    const grandTotal = dbRow.grand_total ?? dbRow.grandTotal;
    const gstPercent = dbRow.gst_percent ?? dbRow.gstPercent;
    const advanceAmount = dbRow.advance_amount ?? dbRow.advanceAmount;
    const paymentMode = dbRow.payment_mode ?? dbRow.paymentMode;
    const paymentStatus = dbRow.payment_status ?? dbRow.paymentStatus;
    const phone = dbRow.phone_number ?? dbRow.mobileNumber;

    return {
      id: dbRow.id,
      category: categoryId?.toString() || '',
      categoryId: categoryId,
      customerId: dbRow.customer_id ?? dbRow.customerId,
      customerName: dbRow.customer_name ?? dbRow.customerName,
      mobileNumber: phone || '',
      date: bookingDate ? new Date(bookingDate) : new Date(),
      kidsCount: 0, 
      bookingCharges: parseFloat(bookingCharges || 0),
      grandTotal: parseFloat(grandTotal || 0),
      gstPercentage: gstPercent || 18,
      advancePaid: parseFloat(advanceAmount || 0),
      balance: parseFloat(grandTotal || 0) - parseFloat(advanceAmount || 0),
      payMode: paymentMode || 'cash',
      paymentStatus: paymentStatus || 'Pending',
      status: paymentStatus?.toLowerCase() === 'paid' ? 'confirmed' : 'tentative',
      notes: dbRow.notes || '',
      selectedServices: [] // service link resolution handled later if needed
    };
  }

  if (table === 'expenses') {
    const categoryId = dbRow.category_id ?? dbRow.categoryId;
    const vendorName = dbRow.vendor_name ?? dbRow.vendorName;
    const dateVal = dbRow.date ?? dbRow.created_at ?? dbRow.createdAt;
    return {
      id: dbRow.id?.toString(),
      category: categoryId?.toString() || '',
      categoryId: categoryId,
      amount: parseFloat(dbRow.amount || 0),
      description: dbRow.description || '',
      vendorName: vendorName || '',
      date: dateVal ? new Date(dateVal) : new Date()
    };
  }

  if (table === 'catalogue') {
    const designName = dbRow.design_name ?? dbRow.designName;
    const categoryId = dbRow.category_id ?? dbRow.categoryId;
    const imageUrl = dbRow.image_url ?? dbRow.imageUrl;
    const estimatePrice = dbRow.estimate_price ?? dbRow.estimatePrice;
    return {
      id: dbRow.id?.toString(),
      categoryId: categoryId?.toString() || '',
      name: designName,
      imageUrl: imageUrl,
      description: dbRow.description,
      price: parseFloat(estimatePrice || 0)
    };
  }

  if (table === 'play_entries') {
    const childName = dbRow.child_name ?? dbRow.childName;
    const parentName = dbRow.parent_name ?? dbRow.parentName;
    const mobileNumber = dbRow.mobile_number ?? dbRow.mobileNumber;
    const startTime = dbRow.start_time ?? dbRow.startTime;
    const endTime = dbRow.end_time ?? dbRow.endTime;
    const planId = dbRow.plan_id ?? dbRow.planId;
    const planName = dbRow.plan_name ?? dbRow.planName;
    const memberId = dbRow.member_id ?? dbRow.memberId;
    const personCount = dbRow.person_count ?? dbRow.personCount;
    const socksCounts = dbRow.socks_counts ?? dbRow.socksCounts;
    const invoiceId = dbRow.invoice_id ?? dbRow.invoiceId;
    const overtimeAmount = dbRow.overtime_amount ?? dbRow.overtimeAmount;
    const staffId = dbRow.staff_id ?? dbRow.staffId;
    const handledBy = dbRow.handled_by ?? dbRow.handledBy;

    return {
      id: dbRow.id,
      childName: childName,
      parentName: parentName || '',
      mobileNumber: mobileNumber || '',
      startTime: startTime ? new Date(startTime) : new Date(),
      endTime: endTime ? new Date(endTime) : undefined,
      planId: planId || '',
      planName: planName || '',
      amount: parseFloat(dbRow.amount || 0),
      status: dbRow.status || 'active',
      memberId: memberId || undefined,
      personCount: personCount || 1,
      socksCounts: socksCounts || {},
      invoiceId: invoiceId || undefined,
      overtimeAmount: parseFloat(overtimeAmount || 0),
      staffId: staffId || undefined,
      handledBy: handledBy || undefined
    };
  }

  if (table === 'socks_types') {
    const priceVal = dbRow.price;
    const gstSlab = dbRow.gst_slab ?? dbRow.gstSlab;
    return {
      id: dbRow.id,
      name: dbRow.name || '',
      price: parseFloat(priceVal || 0),
      gstSlab: gstSlab !== undefined ? gstSlab : 5
    };
  }

  // Generic Map (keys converted to camelCase)
  const camelObj: any = {};
  for (const key of Object.keys(dbRow)) {
    const camelKey = snakeToCamel(key);
    let val = dbRow[key];
    // Try to auto-parse timestamps / dates
    if (key.endsWith('_at') || key === 'start_time' || key === 'end_time' || key === 'joined_date' || key === 'insdate') {
      val = dbRow[key] ? new Date(dbRow[key]) : undefined;
    }
    camelObj[camelKey] = val;
    // Dual compatibility for snake_case and camelCase to prevent frontend interface breaks!
    if (camelKey !== key) {
      camelObj[key] = val;
    }
  }
  return camelObj;
}

// --- SYNC SERVICE ---

let syncInProgress = false;
let onSyncStatusChange: ((status: { isSyncing: boolean; pendingCount: number; error: string | null }) => void) | null = null;

export function registerSyncStatusCallback(cb: typeof onSyncStatusChange) {
  onSyncStatusChange = cb;
}

// Trigger status updates manually
function notifyStatus(error: string | null = null) {
  if (onSyncStatusChange) {
    onSyncStatusChange({
      isSyncing: syncInProgress,
      pendingCount: getOfflineQueue().length,
      error
    });
  }
}

// Check internet connection
export function isOnline(): boolean {
  return typeof window !== 'undefined' ? window.navigator.onLine : true;
}

function getTableEndpoint(table: string): string {
  if (table === 'play_entries') return 'entries';
  if (table === 'walk_in_customers') return 'walk-in-v1';
  if (table === 'walk_in_members') return 'walk-in-v2';
  if (table === 'socks_types') return 'socks-types';
  if (table === 'business_profile') return 'business-profile';
  return table; // members, plans, staff, categories, services, catalogue, billings, events, expenses
}

// Direct SQL CRUD helper routing through Express API endpoints for 100% synchronized consistency
export async function dbWrite(
  table: string,
  action: 'INSERT' | 'UPDATE' | 'DELETE',
  recordId: string | number,
  clientObj: any
): Promise<{ success: boolean; data?: any; error?: string }> {
  console.log(`[dbWrite] table=${table} action=${action} recordId=${recordId}`, clientObj);

  const endpoint = getTableEndpoint(table);
  const url = `/api/${endpoint}`;

  try {
    let response: Response;
    if (table === 'business_profile') {
      // business profile updates always POST to /api/business-profile
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientObj)
      });
    } else if (action === 'INSERT') {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientObj)
      });
    } else if (action === 'UPDATE') {
      response = await fetch(`${url}/${recordId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientObj)
      });
    } else { // DELETE
      response = await fetch(`${url}/${recordId}`, {
        method: 'DELETE'
      });
    }

    if (!response.ok) {
      const errText = await response.text();
      let errJson;
      try {
        errJson = JSON.parse(errText);
      } catch (e) {}
      const errMsg = errJson?.error || errJson?.message || errText || 'API request failed';
      console.error(`[dbWrite] API error on ${table}:`, errMsg);
      return { success: false, error: errMsg };
    }

    const resData = await response.json();
    console.log(`[dbWrite] API Success on ${table}:`, resData);

    const mappedData = resData ? mapFromDB(table, resData) : null;
    return { success: true, data: mappedData };
  } catch (err) {
    console.error(`[dbWrite] API Connection error on ${table}:`, err);
    return { success: false, error: (err as Error).message };
  }
}

// Process all offline enqueued mutations in sequence
export async function flushOfflineQueue(): Promise<boolean> {
  return true; // No-op: Express API writes are always immediate and synced
}

// Configure automatic queue-flushing when reconnecting
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('[SyncService] 🌐 Device back ONLINE. Flashing offline queue in 1.5 seconds...');
    setTimeout(() => {
      flushOfflineQueue();
    }, 1500);
  });
}
