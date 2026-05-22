import { supabase } from './supabase';

export interface QueuedOperation {
  id: string; // Unique queue item ID
  table: string; // Supabase table name, e.g., 'play_entries'
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  recordId: string | number; // Primary key in the database
  payload: any;
  timestamp: number;
}

const QUEUE_STORAGE_KEY = 'playzone_offline_queue';

// Get current pending operations
export function getOfflineQueue(): QueuedOperation[] {
  try {
    const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('[OfflineQueue] Failed to parse queue:', e);
    return [];
  }
}

// Persist the queue
export function saveOfflineQueue(queue: QueuedOperation[]) {
  try {
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error('[OfflineQueue] Failed to save queue:', e);
  }
}

// Enqueue a new mutation
export function enqueueOperation(
  table: string,
  action: 'INSERT' | 'UPDATE' | 'DELETE',
  recordId: string | number,
  payload: any
): QueuedOperation {
  const queue = getOfflineQueue();
  
  // Clean up existing operations of the same record to prevent duplicate redundant inserts or sequence errors
  // E.g., if we insert then update, we can keep the recordId chain intact, or just add sequentially
  const newOp: QueuedOperation = {
    id: `OP-${Math.random().toString(36).substring(2, 11).toUpperCase()}`,
    table,
    action,
    recordId,
    payload,
    timestamp: Date.now(),
  };

  // Optimization: If there is already an INSERT queued for this record, and we are updating it, 
  // we can merge the update payload directly into the INSERT payload instead of pushing two operations!
  if (action === 'UPDATE') {
    const insertOpIndex = queue.findIndex(op => op.table === table && op.action === 'INSERT' && op.recordId === recordId);
    if (insertOpIndex !== -1) {
      queue[insertOpIndex].payload = {
        ...queue[insertOpIndex].payload,
        ...payload
      };
      saveOfflineQueue(queue);
      console.log(`[OfflineQueue] Merged UPDATE into existing INSERT for ${table}:${recordId}`);
      return queue[insertOpIndex];
    }
  }

  // Optimization: If we delete a record that was only inserted locally and not synced yet,
  // we can simply remove the local INSERT op and not push any DELETE op to the server!
  if (action === 'DELETE') {
    const insertOpIndex = queue.findIndex(op => op.table === table && op.action === 'INSERT' && op.recordId === recordId);
    if (insertOpIndex !== -1) {
      const filtered = queue.filter((_, idx) => idx !== insertOpIndex);
      saveOfflineQueue(filtered);
      console.log(`[OfflineQueue] Removed local-only record from sync queue: ${table}:${recordId}`);
      return newOp;
    }
  }

  queue.push(newOp);
  saveOfflineQueue(queue);
  console.log(`[OfflineQueue] Enqueued operation ${action} on ${table}:${recordId}`, payload);
  return newOp;
}

// Remove operation from queue
export function dequeueOperation(opId: string) {
  const queue = getOfflineQueue();
  const filtered = queue.filter(op => op.id !== opId);
  saveOfflineQueue(filtered);
}
