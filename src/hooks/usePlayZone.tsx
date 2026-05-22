import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { 
  PlayEntry, 
  BookingEvent, 
  Member, 
  Invoice, 
  Expense, 
  PlayPlan,
  GSTSlab,
  SocksConfig,
  BusinessProfile,
  ServiceCategory,
  ServiceItem,
  CatalogueCategory,
  CatalogueDesign,
  StaffMember
} from '../types';
import { PLANS } from '../constants';
import { dbWrite, mapFromDB, isOnline, registerSyncStatusCallback, flushOfflineQueue, getApiBase } from '../lib/syncService';
import { getOfflineQueue } from '../lib/offlineQueue';

interface PlayZoneContextType {
  entries: PlayEntry[];
  members: Member[];
  events: BookingEvent[];
  invoices: Invoice[];
  expenses: Expense[];
  walkInV1: any[];
  walkInV2: any[];
  plans: PlayPlan[];
  categories: ServiceCategory[];
  services: ServiceItem[];
  socksConfig: SocksConfig;
  businessProfile: BusinessProfile;
  staff: StaffMember[];
  currentUser: StaffMember | null;
  isAuthenticated: boolean;
  catalogueCategories: CatalogueCategory[];
  catalogueDesigns: CatalogueDesign[];
  socksTypes: any[];
  isAdmin: boolean;
  dbError: string | null;
  isSyncing: boolean;
  addEntry: (entry: Omit<PlayEntry, 'id' | 'startTime' | 'status'>) => void;
  updateEntry: (id: string, updates: Partial<PlayEntry>) => Promise<void>;
  completeEntry: (id: string, overtimeAmount?: number) => void;
  addMember: (member: Omit<Member, 'id'>) => void;
  updateMember: (id: string, updates: Partial<Member>) => void;
  deleteMember: (id: string) => void;
  addEvent: (event: Omit<BookingEvent, 'id'>) => void;
  updateEvent: (id: string, updates: Partial<BookingEvent>) => void;
  deleteEvent: (id: string) => void;
  updateEventStatus: (id: string, status: BookingEvent['status']) => void;
  addInvoice: (invoice: Omit<Invoice, 'id' | 'invoiceNumber'>) => Invoice;
  updateInvoice: (id: string, updates: Partial<Invoice>) => void;
  deleteInvoice: (id: string) => void;
  addExpense: (expense: Omit<Expense, 'id'>) => void;
  updateExpense: (id: string, updates: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;
  addPlan: (plan: PlayPlan) => void;
  updatePlan: (id: string, plan: Partial<PlayPlan>) => void;
  deletePlan: (id: string) => void;
  addCategory: (name: string) => void;
  updateCategory: (id: string, name: string) => void;
  deleteCategory: (id: string) => void;
  addService: (service: Omit<ServiceItem, 'id'>) => void;
  updateService: (id: string, updates: Partial<ServiceItem>) => void;
  deleteService: (id: string) => void;
  updateSocksConfig: (config: SocksConfig) => void;
  addSocksType: (type: any) => Promise<void>;
  updateSocksType: (id: number, updates: any) => Promise<void>;
  deleteSocksType: (id: number) => Promise<void>;
  updateBusinessProfile: (profile: BusinessProfile) => void;
  addStaff: (member: Omit<StaffMember, 'joinedDate'>) => void;
  updateStaff: (id: string, updates: Partial<StaffMember>) => void;
  deleteStaff: (id: string) => void;
  login: (id: string, password?: string) => boolean;
  logout: () => void;
  addCatalogueCategory: (name: string) => void;
  updateCatalogueCategory: (id: string, name: string) => void;
  deleteCatalogueCategory: (id: string) => void;
  addCatalogueDesign: (design: Omit<CatalogueDesign, 'id'>) => void;
  updateCatalogueDesign: (id: string, updates: Partial<CatalogueDesign>) => void;
  deleteCatalogueDesign: (id: string) => void;
  importBulkData: (data: any) => void;
  exportAllData: () => any;
  exportToCSV: (data: any[], fileName: string) => void;
  refreshData: () => Promise<void>;
}

const PlayZoneContext = createContext<PlayZoneContextType | undefined>(undefined);

export function PlayZoneProvider({ children }: { children: React.ReactNode }) {
  // --- STATES & OFFLINE-STALE RECOVERY FROM LOCAL CACHE ---
  const [currentUser, setCurrentUser] = useState<StaffMember | null>(() => {
    try {
      const saved = localStorage.getItem('playzone_user');
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      return (parsed && typeof parsed === 'object' && 'role' in parsed) ? parsed : null;
    } catch {
      return null;
    }
  });

  const getCachedJson = (key: string, fallback: any) => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : fallback;
    } catch {
      return fallback;
    }
  };

  const [entries, setEntries] = useState<PlayEntry[]>(() => 
    getCachedJson('funky_cache_entries', []).map((e: any) => ({
      ...e,
      startTime: e.startTime ? new Date(e.startTime) : new Date(),
      endTime: e.endTime ? new Date(e.endTime) : undefined
    }))
  );

  const [members, setMembers] = useState<Member[]>(() => 
    getCachedJson('funky_cache_members', []).map((m: any) => ({
      ...m,
      createdAt: m.createdAt ? new Date(m.createdAt) : new Date()
    }))
  );

  const [events, setEvents] = useState<BookingEvent[]>(() => 
    getCachedJson('funky_cache_events', []).map((e: any) => ({
      ...e,
      date: e.date ? new Date(e.date) : new Date()
    }))
  );

  const [invoices, setInvoices] = useState<Invoice[]>(() => 
    getCachedJson('funky_cache_invoices', []).map((i: any) => ({
      ...i,
      date: i.date ? new Date(i.date) : new Date()
    }))
  );

  const [expenses, setExpenses] = useState<Expense[]>(() => 
    getCachedJson('funky_cache_expenses', []).map((ex: any) => ({
      ...ex,
      date: ex.date ? new Date(ex.date) : new Date()
    }))
  );

  const [walkInV1, setWalkInV1] = useState<any[]>(() => getCachedJson('funky_cache_walkinv1', []));
  const [walkInV2, setWalkInV2] = useState<any[]>(() => getCachedJson('funky_cache_walkinv2', []));
  const [plans, setPlans] = useState<PlayPlan[]>(() => getCachedJson('funky_cache_plans', PLANS));

  const [categories, setCategories] = useState<ServiceCategory[]>(() => 
    getCachedJson('funky_cache_categories', [
      { id: 'cat1', name: 'Decoration' },
      { id: 'cat2', name: 'Food & Beverage' },
      { id: 'cat3', name: 'Photography' }
    ])
  );

  const [services, setServices] = useState<ServiceItem[]>(() => getCachedJson('funky_cache_services', []));
  
  const [socksConfig, setSocksConfig] = useState<SocksConfig>(() => 
    getCachedJson('funky_cache_socks_config', {
      smallPrice: 40,
      mediumPrice: 50,
      gstSlab: 5
    })
  );

  const [businessProfile, setBusinessProfile] = useState<BusinessProfile>(() => 
    getCachedJson('funky_cache_profile', {
      name: 'FunkyLand',
      subName: 'Indoor Kids Play Area',
      unitName: '(A unit of Sudershan Business Solutions)',
      address: '2nd Floor, Plot 17, Sector-6, Channi Himmat, Jammu, J&K',
      gstNo: '01AF1FS7527R1ZD',
      mobile: '9596913030, 9796220727',
      email: 'funky@funky-land.com',
      logo: '🎡',
      accountingYearStart: '01-04',
      gracePeriodMinutes: 10,
      overtimeRatePerMinute: 2,
    })
  );

  const [catalogueCategories, setCatalogueCategories] = useState<CatalogueCategory[]>(() => 
    getCachedJson('funky_cache_catalogue_categories', [
      { id: 'ccat1', name: 'Birthday Decor' },
      { id: 'ccat2', name: 'Party Themes' }
    ])
  );

  const [catalogueDesigns, setCatalogueDesigns] = useState<CatalogueDesign[]>(() => getCachedJson('funky_cache_catalogue_designs', []));
  const [socksTypes, setSocksTypes] = useState<any[]>(() => getCachedJson('funky_cache_socks_types', []));
  const [staff, setStaff] = useState<StaffMember[]>(() => 
    getCachedJson('funky_cache_staff', [
      { id: 'admin', full_name: 'Administrator', role: 'admin', phone: '9999999999', password: '12345', status: 'active', joinedDate: new Date().toISOString() }
    ])
  );

  const [dbError, setDbError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Authentication Status Helpers
  const isAdmin = currentUser?.role === 'admin';
  const isAuthenticated = !!currentUser;

  // Sync state to local storage caches for instantaneous, offline-ready renders on reload, across all browsers & devices
  useEffect(() => {
    localStorage.setItem('playzone_user', JSON.stringify(currentUser));
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('funky_cache_profile', JSON.stringify(businessProfile));
  }, [businessProfile]);

  useEffect(() => {
    localStorage.setItem('funky_cache_socks_config', JSON.stringify(socksConfig));
  }, [socksConfig]);

  useEffect(() => {
    localStorage.setItem('funky_cache_staff', JSON.stringify(staff));
  }, [staff]);

  useEffect(() => {
    localStorage.setItem('funky_cache_categories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('funky_cache_catalogue_categories', JSON.stringify(catalogueCategories));
  }, [catalogueCategories]);

  useEffect(() => {
    localStorage.setItem('funky_cache_plans', JSON.stringify(plans));
  }, [plans]);

  useEffect(() => {
    localStorage.setItem('funky_cache_members', JSON.stringify(members));
  }, [members]);

  useEffect(() => {
    localStorage.setItem('funky_cache_services', JSON.stringify(services));
  }, [services]);

  useEffect(() => {
    localStorage.setItem('funky_cache_catalogue_designs', JSON.stringify(catalogueDesigns));
  }, [catalogueDesigns]);

  useEffect(() => {
    localStorage.setItem('funky_cache_invoices', JSON.stringify(invoices));
  }, [invoices]);

  useEffect(() => {
    localStorage.setItem('funky_cache_events', JSON.stringify(events));
  }, [events]);

  useEffect(() => {
    localStorage.setItem('funky_cache_expenses', JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem('funky_cache_walkinv1', JSON.stringify(walkInV1));
  }, [walkInV1]);

  useEffect(() => {
    localStorage.setItem('funky_cache_walkinv2', JSON.stringify(walkInV2));
  }, [walkInV2]);

  useEffect(() => {
    localStorage.setItem('funky_cache_socks_types', JSON.stringify(socksTypes));
  }, [socksTypes]);

  useEffect(() => {
    localStorage.setItem('funky_cache_entries', JSON.stringify(entries));
  }, [entries]);

  // --- CORE DATA-FETCH FUNCTION (EXPRESS CLIENT-SYNC API ENDPOINTS) ---
  const fetchData = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setDbError(null);

    const safeFetch = async (endpoint: string, fallback: any) => {
      const url = `${getApiBase()}${endpoint}`;
      try {
        const res = await fetch(url);
        if (!res.ok) {
          console.warn(`[Sync] API Info: ${url} returned response status ${res.status}. Falling back to default.`);
          return fallback;
        }
        const text = await res.text();
        if (!text) return fallback;
        return JSON.parse(text);
      } catch (e) {
        console.error(`[Sync] API Error: Fetch failed or cannot parse JSON for ${url}`, e);
        return fallback;
      }
    };

    try {
      console.log('[API] Fetching fresh sync data from Express database engine...');

      const [
        pProfile, pStaff, pCategories, pPlans, pMembers, pServices, pCatalogue, pBillings, pEvents, pExpenses, pV1, pV2, pSocksTypes, pEntries
      ] = await Promise.all([
        safeFetch('/api/business-profile', null),
        safeFetch('/api/staff', []),
        safeFetch('/api/categories', []),
        safeFetch('/api/plans', []),
        safeFetch('/api/members', []),
        safeFetch('/api/services', []),
        safeFetch('/api/catalogue', []),
        safeFetch('/api/billings', []),
        safeFetch('/api/events', []),
        safeFetch('/api/expenses', []),
        safeFetch('/api/walk-in-v1', []),
        safeFetch('/api/walk-in-v2', []),
        safeFetch('/api/socks-types', []),
        safeFetch('/api/entries', [])
      ]);

      console.log('[API] Data loaded from database successfully');

      // --- ASSEMBLE STATES USING BICOMPATIBLE CONVERTERS ---
      if (pProfile) {
        const prof = mapFromDB('business_profile', pProfile);
        setBusinessProfile(prev => ({ ...prev, ...prof }));
        
        // Populate socks config from business profile if they contain valid values
        const smallPrice = pProfile.socks_small_price !== undefined ? pProfile.socks_small_price : pProfile.socksSmallPrice;
        const mediumPrice = pProfile.socks_medium_price !== undefined ? pProfile.socks_medium_price : pProfile.socksMediumPrice;
        const gstSlab = pProfile.socks_gst_slab !== undefined ? pProfile.socks_gst_slab : pProfile.socksGstSlab;
        
        if (smallPrice !== undefined) {
          setSocksConfig({
            smallPrice: parseFloat(smallPrice) || 40,
            mediumPrice: parseFloat(mediumPrice) || 50,
            gstSlab: (parseInt(gstSlab) || 5) as GSTSlab
          });
        }
      }

      if (pStaff) {
        setStaff(pStaff.map((row: any) => mapFromDB('staff', row)));
      }

      if (pCategories) {
        setCategories(pCategories.filter((c: any) => c.type === 'service').map((c: any) => ({ id: c.id.toString(), name: c.name })));
        setCatalogueCategories(pCategories.filter((c: any) => c.type === 'catalogue').map((c: any) => ({ id: c.id.toString(), name: c.name })));
      }

      if (pPlans) {
        setPlans(pPlans.map((row: any) => mapFromDB('plans', row)));
      }

      if (pMembers) {
        setMembers(pMembers.map((row: any) => mapFromDB('members', row)));
      }

      if (pServices) {
        setServices(pServices.map((row: any) => mapFromDB('services', row)));
      }

      if (pCatalogue) {
        setCatalogueDesigns(pCatalogue.map((row: any) => mapFromDB('catalogue', row)));
      }

      if (pBillings) {
        const mapped = pBillings.map((row: any) => mapFromDB('billings', row));
        mapped.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setInvoices(mapped);
      }

      if (pEvents) {
        setEvents(pEvents.map((row: any) => mapFromDB('events', row)));
      }

      if (pExpenses) {
        setExpenses(pExpenses.map((row: any) => mapFromDB('expenses', row)));
      }

      if (pV1) {
        setWalkInV1(pV1);
      }

      if (pV2) {
        setWalkInV2(pV2);
      }

      if (pSocksTypes) {
        setSocksTypes(pSocksTypes.map((row: any) => mapFromDB('socks_types', row)));
        const small = pSocksTypes.find((s: any) => s.name?.toLowerCase().includes('small'));
        const medium = pSocksTypes.find((s: any) => s.name?.toLowerCase().includes('medium'));
        if (small || medium) {
          setSocksConfig(prev => ({
            smallPrice: small?.price ? parseFloat(small.price) : prev.smallPrice,
            mediumPrice: medium?.price ? parseFloat(medium.price) : prev.mediumPrice,
            gstSlab: (small?.gstSlab || small?.gst_slab) ? (parseInt(small.gstSlab || small?.gst_slab) as GSTSlab) : prev.gstSlab
          }));
        }
      }

      if (pEntries) {
        setEntries(pEntries.map((row: any) => mapFromDB('play_entries', row)));
      }

    } catch (err) {
      console.error('[Sync] Fatal client-side synchronization failure:', err);
      setDbError(`Failsafe Mode Active: ${(err as Error).message}`);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing]);

  // --- AUTOMATIC RECONNECT & OFFLINE-QUEUES FLUSHING SETUP ---
  useEffect(() => {
    // 1. Initialize Supabase Auth Session gracefully
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          console.log('[Auth] Restored active authenticated session:', session.user?.id);
        } else {
          console.log('[Auth] Operating in public client mode using publishable/anon key.');
        }
      } catch (e) {
        console.warn('[Auth] Supabase auth session initialization bypassed:', e);
      } finally {
        fetchData();
      }
    };

    initAuth();

    // 2. Sync Status indicators hooks mapping
    registerSyncStatusCallback((status) => {
      if (status.isSyncing) {
        setIsSyncing(true);
      } else {
        setIsSyncing(false);
        if (status.error) setDbError(status.error);
      }
    });

    // 3. Keep polling the queue occasionally while internet is on
    const interval = setInterval(() => {
      if (isOnline() && getOfflineQueue().length > 0) {
        flushOfflineQueue().then((flushed) => {
          if (flushed) fetchData();
        });
      }
    }, 15000);

    // 4. SUPABASE REALTIME SUBSCRIPTION FOR DYNAMIC TWO-WAY COORDS SYNC
    const channel = supabase
      .channel('public-realtime-activities')
      .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
        console.log('[Realtime] postgres change notification received:', payload);
        const { table, eventType, new: newRow, old: oldRow } = payload;
        
        // Reconcile and merge this realtime database update into React State INSTANTLY
        handleRealtimeEvent(table, eventType, newRow, oldRow);
      })
      .subscribe((status) => {
        console.log('[Realtime] Subscription established with State Status:', status);
      });

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
      registerSyncStatusCallback(null);
    };
  }, []);

  // --- COMPACT REALTIME STATE RESOLVER AND PRE-UPSERT DEDUPLICATOR ---
  const handleRealtimeEvent = (table: string, eventType: string, newRow: any, oldRow: any) => {
    const clientItem = newRow ? mapFromDB(table, newRow) : null;
    const itemId = clientItem?.id || oldRow?.id;
    if (!itemId) return;

    switch (table) {
      case 'play_entries':
        setEntries(prev => {
          if (eventType === 'DELETE') return prev.filter(e => e.id !== itemId);
          const exists = prev.some(e => e.id === itemId);
          if (exists) {
            return prev.map(e => e.id === itemId ? { ...e, ...clientItem } : e);
          }
          return [clientItem, ...prev]; // Push to top for lists
        });
        break;

      case 'members':
        setMembers(prev => {
          if (eventType === 'DELETE') return prev.filter(m => m.id !== itemId);
          const exists = prev.some(m => m.id === itemId);
          if (exists) return prev.map(m => m.id === itemId ? { ...m, ...clientItem } : m);
          return [clientItem, ...prev];
        });
        break;

      case 'events':
        setEvents(prev => {
          if (eventType === 'DELETE') return prev.filter(e => e.id !== itemId);
          const exists = prev.some(e => e.id === itemId);
          if (exists) return prev.map(e => e.id === itemId ? { ...e, ...clientItem } : e);
          return [...prev, clientItem];
        });
        break;

      case 'billings':
        setInvoices(prev => {
          if (eventType === 'DELETE') return prev.filter(inv => inv.id !== itemId);
          const exists = prev.some(inv => inv.id === itemId);
          if (exists) return prev.map(inv => inv.id === itemId ? { ...inv, ...clientItem } : inv);
          return [clientItem, ...prev];
        });
        break;

      case 'expenses':
        setExpenses(prev => {
          if (eventType === 'DELETE') return prev.filter(e => String(e.id) !== String(itemId));
          const exists = prev.some(e => String(e.id) === String(itemId));
          if (exists) return prev.map(e => String(e.id) === String(itemId) ? { ...e, ...clientItem } : e);
          return [clientItem, ...prev];
        });
        break;

      case 'plans':
        setPlans(prev => {
          if (eventType === 'DELETE') return prev.filter(p => p.id !== itemId);
          const exists = prev.some(p => p.id === itemId);
          if (exists) return prev.map(p => p.id === itemId ? { ...p, ...clientItem } : p);
          return [...prev, clientItem];
        });
        break;

      case 'categories':
        if (clientItem) {
          const formattedCat = { id: clientItem.id.toString(), name: clientItem.name };
          if (clientItem.type === 'service') {
            setCategories(prev => {
              if (eventType === 'DELETE') return prev.filter(c => c.id !== itemId.toString());
              const exists = prev.some(c => c.id === itemId.toString());
              if (exists) return prev.map(c => c.id === itemId.toString() ? formattedCat : c);
              return [...prev, formattedCat];
            });
          } else {
            setCatalogueCategories(prev => {
              if (eventType === 'DELETE') return prev.filter(c => c.id !== itemId.toString());
              const exists = prev.some(c => c.id === itemId.toString());
              if (exists) return prev.map(c => c.id === itemId.toString() ? formattedCat : c);
              return [...prev, formattedCat];
            });
          }
        } else if (eventType === 'DELETE') {
          const strId = itemId.toString();
          setCategories(prev => prev.filter(c => c.id !== strId));
          setCatalogueCategories(prev => prev.filter(c => c.id !== strId));
        }
        break;

      case 'services':
        setServices(prev => {
          if (eventType === 'DELETE') return prev.filter(s => String(s.id) !== String(itemId));
          const exists = prev.some(s => String(s.id) === String(itemId));
          if (exists) return prev.map(s => String(s.id) === String(itemId) ? { ...s, ...clientItem } : s);
          return [...prev, clientItem];
        });
        break;

      case 'socks_types':
        setSocksTypes(prev => {
          if (eventType === 'DELETE') return prev.filter(s => String(s.id) !== String(itemId));
          const exists = prev.some(s => String(s.id) === String(itemId));
          if (exists) return prev.map(s => String(s.id) === String(itemId) ? { ...s, ...clientItem } : s);
          return [...prev, clientItem];
        });
        break;

      case 'business_profile':
        if (clientItem) {
          setBusinessProfile(prev => ({ ...prev, ...clientItem }));
        }
        break;

      case 'staff':
        setStaff(prev => {
          if (eventType === 'DELETE') return prev.filter(s => s.id !== itemId);
          const exists = prev.some(s => s.id === itemId);
          if (exists) return prev.map(s => s.id === itemId ? { ...s, ...clientItem } : s);
          return [...prev, clientItem];
        });
        break;

      case 'catalogue':
        setCatalogueDesigns(prev => {
          if (eventType === 'DELETE') return prev.filter(d => String(d.id) !== String(itemId));
          const exists = prev.some(d => String(d.id) === String(itemId));
          if (exists) return prev.map(d => String(d.id) === String(itemId) ? { ...d, ...clientItem } : d);
          return [...prev, clientItem];
        });
        break;
    }
  };

  // --- CRUD ACTIONS WITH OPTIMISTIC DESIGNS AND REPLAY INTEGRITY ---

  const addEntry = useCallback(async (entry: Omit<PlayEntry, 'id' | 'startTime' | 'status'>) => {
    const id = `ENT-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const newEntry: PlayEntry = {
      ...entry,
      id,
      startTime: new Date(),
      status: 'active',
      staffId: currentUser?.id,
      handledBy: currentUser?.full_name
    };

    // Update state instantly (Optimistic UI)
    setEntries(prev => [newEntry, ...prev]);

    // Push write to Supabase
    await dbWrite('play_entries', 'INSERT', id, newEntry);
    await fetchData();
  }, [currentUser, fetchData]);

  const updateEntry = useCallback(async (id: string, updates: Partial<PlayEntry>) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
    await dbWrite('play_entries', 'UPDATE', id, updates);
    await fetchData();
  }, [fetchData]);

  const completeEntry = useCallback(async (id: string, overtimeAmount: number = 0) => {
    const endTime = new Date();
    
    // Update state instantly and lock entry status
    setEntries(prev => prev.map(e => e.id === id ? { ...e, status: 'completed', endTime, overtimeAmount } : e));

    // Push write to Supabase for synchronized lock
    await dbWrite('play_entries', 'UPDATE', id, { status: 'completed', endTime, overtimeAmount });
    await fetchData();
  }, [fetchData]);

  const addMember = useCallback(async (member: Omit<Member, 'id'>) => {
    const id = `MEM-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const newMember: Member = {
      ...member,
      id,
      createdAt: new Date()
    };

    setMembers(prev => [newMember, ...prev]);
    await dbWrite('members', 'INSERT', id, newMember);
    await fetchData();
  }, [fetchData]);

  const updateMember = useCallback(async (id: string, updates: Partial<Member>) => {
    if (!isAdmin) return;
    setMembers(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
    await dbWrite('members', 'UPDATE', id, updates);
    await fetchData();
  }, [isAdmin, fetchData]);

  const deleteMember = useCallback(async (id: string) => {
    if (!isAdmin) return;
    setMembers(prev => prev.filter(m => m.id !== id));
    await dbWrite('members', 'DELETE', id, null);
    await fetchData();
  }, [isAdmin, fetchData]);

  const addInvoice = useCallback((invoice: Omit<Invoice, 'id' | 'invoiceNumber'>) => {
    // FY sequence generator
    const d = new Date();
    const [startDay, startMonth] = businessProfile.accountingYearStart.split('-').map(Number);
    const m = d.getMonth() + 1;
    const day = d.getDate();
    const year = d.getFullYear();
    let fyStartYear = (m > startMonth || (m === startMonth && day >= startDay)) ? year : year - 1;
    const currentFY = `${fyStartYear}-${(fyStartYear + 1).toString().slice(-2)}`;

    const fyInvoices = invoices.filter(inv => {
      const invDate = new Date(inv.date);
      const invM = invDate.getMonth() + 1;
      const invDay = invDate.getDate();
      const invYear = invDate.getFullYear();
      let invFyStart = (invM > startMonth || (invM === startMonth && invDay >= startDay)) ? invYear : invYear - 1;
      return `${invFyStart}-${(invFyStart + 1).toString().slice(-2)}` === currentFY;
    });

    const nextNum = fyInvoices.length + 1;
    const localId = `INV-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const newInvoice: Invoice = {
      ...invoice,
      id: localId,
      invoiceNumber: `FL/${currentFY}/${nextNum.toString().padStart(4, '0')}`,
      staffId: currentUser?.id
    };

    setInvoices(prev => [newInvoice, ...prev]);

    // Push to database asynchronously
    const recordPayload = {
      customerId: newInvoice.memberId || null,
      customerName: newInvoice.customerName,
      mobileNo: newInvoice.mobileNumber,
      planId: newInvoice.planId,
      socksCounts: newInvoice.socksCounts,
      subtotal: newInvoice.totalBaseAmount,
      totalGst: newInvoice.totalGST,
      payable: newInvoice.totalAmount,
      paymentMode: newInvoice.paymentMode,
      items: newInvoice.items,
      handledBy: currentUser?.id,
      date: newInvoice.date
    };

    dbWrite('billings', 'INSERT', localId, recordPayload).then(() => {
      fetchData();
    });

    return newInvoice;
  }, [invoices, businessProfile, currentUser, fetchData]);

  const deleteInvoice = useCallback(async (id: string) => {
    if (!isAdmin) return;
    setInvoices(prev => prev.filter(inv => inv.id !== id));
    await dbWrite('billings', 'DELETE', id, null);
    await fetchData();
  }, [isAdmin, fetchData]);

  const updateInvoice = useCallback(async (id: string, updates: Partial<Invoice>) => {
    if (!isAdmin) return;
    setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, ...updates } : inv));
    await dbWrite('billings', 'UPDATE', id, updates);
    await fetchData();
  }, [isAdmin, fetchData]);

  const addExpense = useCallback(async (expense: Omit<Expense, 'id'>) => {
    if (!isAdmin) return;
    const tempId = Date.now().toString();
    const newExpense: Expense = {
      ...expense,
      id: tempId
    };

    setExpenses(prev => [newExpense, ...prev]);
    await dbWrite('expenses', 'INSERT', tempId, newExpense);
    await fetchData();
  }, [isAdmin, fetchData]);

  const updateExpense = useCallback(async (id: string, updates: Partial<Expense>) => {
    if (!isAdmin) return;
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
    await dbWrite('expenses', 'UPDATE', id, updates);
    await fetchData();
  }, [isAdmin, fetchData]);

  const deleteExpense = useCallback(async (id: string) => {
    if (!isAdmin) return;
    setExpenses(prev => prev.filter(e => e.id !== id));
    await dbWrite('expenses', 'DELETE', id, null);
    await fetchData();
  }, [isAdmin, fetchData]);

  const addPlan = useCallback(async (plan: PlayPlan) => {
    if (!isAdmin) return;
    setPlans(prev => [...prev, plan]);
    await dbWrite('plans', 'INSERT', plan.id, plan);
    await fetchData();
  }, [isAdmin, fetchData]);

  const updatePlan = useCallback(async (id: string, updates: Partial<PlayPlan>) => {
    if (!isAdmin) return;
    setPlans(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    await dbWrite('plans', 'UPDATE', id, updates);
    await fetchData();
  }, [isAdmin, fetchData]);

  const deletePlan = useCallback(async (id: string) => {
    if (!isAdmin) return;
    setPlans(prev => prev.filter(p => p.id !== id));
    await dbWrite('plans', 'DELETE', id, null);
    await fetchData();
  }, [isAdmin, fetchData]);

  const addCategory = useCallback(async (name: string) => {
    if (!isAdmin) return;
    const id = `CAT-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    const newCat = { id, name };
    setCategories(prev => [...prev, newCat]);
    await dbWrite('categories', 'INSERT', id, { name, type: 'service' });
    await fetchData();
  }, [isAdmin, fetchData]);

  const updateCategory = useCallback(async (id: string, name: string) => {
    if (!isAdmin) return;
    setCategories(prev => prev.map(c => c.id === id ? { ...c, name } : c));
    await dbWrite('categories', 'UPDATE', id, { name });
    await fetchData();
  }, [isAdmin, fetchData]);

  const deleteCategory = useCallback(async (id: string) => {
    if (!isAdmin) return;
    setCategories(prev => prev.filter(c => c.id !== id));
    await dbWrite('categories', 'DELETE', id, null);
    await fetchData();
  }, [isAdmin, fetchData]);

  const addService = useCallback(async (service: Omit<ServiceItem, 'id'>) => {
    if (!isAdmin) return;
    const id = `SRV-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    const newService = { ...service, id };
    setServices(prev => [...prev, newService]);
    await dbWrite('services', 'INSERT', id, newService);
    await fetchData();
  }, [isAdmin, fetchData]);

  const updateService = useCallback(async (id: string, updates: Partial<ServiceItem>) => {
    if (!isAdmin) return;
    setServices(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    await dbWrite('services', 'UPDATE', id, updates);
    await fetchData();
  }, [isAdmin, fetchData]);

  const deleteService = useCallback(async (id: string) => {
    if (!isAdmin) return;
    setServices(prev => prev.filter(s => s.id !== id));
    await dbWrite('services', 'DELETE', id, null);
    await fetchData();
  }, [isAdmin, fetchData]);

  const updateSocksConfig = useCallback(async (config: SocksConfig) => {
    if (!isAdmin) return;
    setSocksConfig(config);
    await dbWrite('business_profile', 'UPDATE', 1, {
      socksSmallPrice: config.smallPrice,
      socksMediumPrice: config.mediumPrice,
      socksGstSlab: config.gstSlab
    });
    await fetchData();
  }, [isAdmin, fetchData]);

  const updateBusinessProfile = useCallback(async (profile: BusinessProfile) => {
    if (!isAdmin) return;
    setBusinessProfile(profile);
    await dbWrite('business_profile', 'UPDATE', 1, profile);
    await fetchData();
  }, [isAdmin, fetchData]);

  const addStaff = useCallback(async (member: Omit<StaffMember, 'joinedDate'>) => {
    if (!isAdmin) return;
    const newStaff: StaffMember = {
      ...member,
      joinedDate: new Date()
    };
    setStaff(prev => [...prev, newStaff]);
    await dbWrite('staff', 'INSERT', member.id, member);
    await fetchData();
  }, [isAdmin, fetchData]);

  const updateStaff = useCallback(async (id: string, updates: Partial<StaffMember>) => {
    if (!isAdmin) return;
    setStaff(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    await dbWrite('staff', 'UPDATE', id, updates);
    await fetchData();
  }, [isAdmin, fetchData]);

  const deleteStaff = useCallback(async (id: string) => {
    if (!isAdmin) return;
    setStaff(prev => prev.filter(s => s.id !== id));
    await dbWrite('staff', 'DELETE', id, null);
    await fetchData();
  }, [isAdmin, fetchData]);

  const login = useCallback((id: string, password?: string) => {
    const found = staff.find(s => s && s.id && s.id.toLowerCase() === id.toLowerCase() && s.password === password && s.status === 'active');
    if (found) {
      setCurrentUser(found);
      localStorage.setItem('playzone_token', 'true');
      return true;
    }
    // Hardcoded safety administrator bypass backstop
    if (id.toLowerCase() === 'admin' && password === '12345') {
       const defaultAdmin: StaffMember = { id: 'admin', full_name: 'Administrator', role: 'admin', phone: '9999999999', password: '12345', status: 'active', joinedDate: new Date().toISOString() };
       setCurrentUser(defaultAdmin);
       localStorage.setItem('playzone_token', 'true');
       return true;
    }
    return false;
  }, [staff]);

  const logout = useCallback(() => {
    setCurrentUser(null);
    localStorage.removeItem('playzone_token');
    localStorage.removeItem('playzone_user');
  }, []);

  const addCatalogueCategory = useCallback(async (name: string) => {
    if (!isAdmin) return;
    const id = `CCAT-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    setCatalogueCategories(prev => [...prev, { id, name }]);
    await dbWrite('categories', 'INSERT', id, { name, type: 'catalogue' });
    await fetchData();
  }, [isAdmin, fetchData]);

  const updateCatalogueCategory = useCallback(async (id: string, name: string) => {
    if (!isAdmin) return;
    setCatalogueCategories(prev => prev.map(c => c.id === id ? { ...c, name } : c));
    await dbWrite('categories', 'UPDATE', id, { name });
    await fetchData();
  }, [isAdmin, fetchData]);

  const deleteCatalogueCategory = useCallback(async (id: string) => {
    if (!isAdmin) return;
    setCatalogueCategories(prev => prev.filter(c => c.id !== id));
    await dbWrite('categories', 'DELETE', id, null);
    await fetchData();
  }, [isAdmin, fetchData]);

  const addCatalogueDesign = useCallback(async (design: Omit<CatalogueDesign, 'id'>) => {
    if (!isAdmin) return;
    const id = `DSGN-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    const newDesign = { ...design, id };
    setCatalogueDesigns(prev => [...prev, newDesign]);
    await dbWrite('catalogue', 'INSERT', id, design);
    await fetchData();
  }, [isAdmin, fetchData]);

  const updateCatalogueDesign = useCallback(async (id: string, updates: Partial<CatalogueDesign>) => {
    if (!isAdmin) return;
    setCatalogueDesigns(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
    await dbWrite('catalogue', 'UPDATE', id, updates);
    await fetchData();
  }, [isAdmin, fetchData]);

  const deleteCatalogueDesign = useCallback(async (id: string) => {
    if (!isAdmin) return;
    setCatalogueDesigns(prev => prev.filter(d => d.id !== id));
    await dbWrite('catalogue', 'DELETE', id, null);
    await fetchData();
  }, [isAdmin, fetchData]);

  const addSocksType = useCallback(async (type: any) => {
    const tempId = Date.now();
    setSocksTypes(prev => [...prev, { ...type, id: tempId }]);
    await dbWrite('socks_types', 'INSERT', tempId, type);
    await fetchData();
  }, [fetchData]);

  const updateSocksType = useCallback(async (id: number, updates: any) => {
    setSocksTypes(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    await dbWrite('socks_types', 'UPDATE', id, updates);
    await fetchData();
  }, [fetchData]);

  const deleteSocksType = useCallback(async (id: number) => {
    setSocksTypes(prev => prev.filter(s => s.id !== id));
    const res = await dbWrite('socks_types', 'DELETE', id, null);
    if (res.success) {
      alert('Socks type deleted successfully!');
      await fetchData();
    } else {
      alert(`Deletion failed: ${res.error}`);
    }
  }, [fetchData]);

  const importBulkData = useCallback((data: any) => {
    if (!isAdmin) return;
    if (data.entries) setEntries(data.entries.map((e: any) => ({ ...e, startTime: new Date(e.startTime), endTime: e.endTime ? new Date(e.endTime) : undefined })));
    if (data.members) setMembers(data.members.map((m: any) => ({ ...m, createdAt: new Date(m.createdAt || m.startDate || Date.now()) })));
    if (data.events) setEvents(data.events.map((e: any) => ({ ...e, date: new Date(e.date) })));
    if (data.invoices) setInvoices(data.invoices.map((i: any) => ({ ...i, date: new Date(i.date) })));
    if (data.expenses) setExpenses(data.expenses.map((ex: any) => ({ ...ex, date: new Date(ex.date) })));
    if (data.plans) setPlans(data.plans.map((p: any) => ({
      ...p,
      title: p.title || p.name,
      validationTimeMin: p.validationTimeMin || p.durationMinutes || 60,
      validationDays: p.validationDays || p.validityDays || 0
    })));
    if (data.categories) setCategories(data.categories);
    if (data.services) setServices(data.services);
  }, [isAdmin]);

  const exportToCSV = useCallback((data: any[], fileName: string) => {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]);
    const csvContent = [headers.join(','), ...data.map(row => headers.map(f => `"${String(row[f] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${fileName}.csv`;
    link.click();
  }, []);

  const value = useMemo(() => ({
    entries, members, events, invoices, expenses, walkInV1, walkInV2, plans, categories, services, socksConfig, businessProfile, staff, currentUser, isAdmin, catalogueCategories, catalogueDesigns, socksTypes, isAuthenticated, dbError, isSyncing,
    addEntry, updateEntry, completeEntry, addMember, updateMember, deleteMember,
    addEvent: async (event: Omit<BookingEvent, 'id'>) => {
      const id = `EVT-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      const newEvent: BookingEvent = {
        ...event,
        id,
        selectedServices: event.selectedServices || [],
        balance: event.grandTotal - event.advancePaid,
        balance_amount: event.grandTotal - event.advancePaid
      } as any;
      setEvents(prev => [...prev, newEvent]);
      await dbWrite('events', 'INSERT', id, newEvent);
      await fetchData();
    },
    updateEvent: async (id: string, updates: Partial<BookingEvent>) => {
      setEvents(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
      await dbWrite('events', 'UPDATE', id, updates);
      await fetchData();
    },
    deleteEvent: async (id: string) => {
      setEvents(prev => prev.filter(e => e.id !== id));
      await dbWrite('events', 'DELETE', id, null);
      await fetchData();
    },
    updateEventStatus: async (id: string, status: BookingEvent['status']) => {
      setEvents(prev => prev.map(e => e.id === id ? { ...e, status } : e));
      await dbWrite('events', 'UPDATE', id, { status });
      await fetchData();
    },
    addInvoice,
    updateInvoice,
    deleteInvoice,
    addExpense,
    deleteExpense,
    updateExpense,
    addPlan,
    updatePlan,
    deletePlan,
    addCategory,
    updateCategory,
    deleteCategory,
    addService,
    updateService,
    deleteService,
    updateSocksConfig,
    updateBusinessProfile,
    addStaff,
    updateStaff,
    deleteStaff,
    login,
    logout,
    addCatalogueCategory,
    updateCatalogueCategory,
    deleteCatalogueCategory,
    addCatalogueDesign,
    updateCatalogueDesign,
    deleteCatalogueDesign,
    addSocksType,
    updateSocksType,
    deleteSocksType,
    importBulkData,
    exportAllData: () => ({ entries, members, events, invoices, expenses, plans, categories, services, exportDate: new Date().toISOString() }),
    exportToCSV,
    refreshData: fetchData
  }), [
    entries, members, events, invoices, expenses, walkInV1, walkInV2, plans, categories, services, socksConfig, businessProfile, staff, currentUser, isAdmin, isAuthenticated, catalogueCategories, catalogueDesigns, socksTypes, dbError, isSyncing, fetchData, addEntry, updateEntry, completeEntry, addMember, updateMember, deleteMember, addInvoice, updateInvoice, deleteInvoice, addExpense, deleteExpense, updateExpense, addPlan, updatePlan, deletePlan, addCategory, updateCategory, deleteCategory, addService, updateService, deleteService, updateSocksConfig, updateBusinessProfile, addStaff, updateStaff, deleteStaff, login, logout, addCatalogueCategory, updateCatalogueCategory, deleteCatalogueCategory, addCatalogueDesign, updateCatalogueDesign, deleteCatalogueDesign, addSocksType, updateSocksType, deleteSocksType, importBulkData, exportToCSV
  ]);

  return <PlayZoneContext.Provider value={value}>{children}</PlayZoneContext.Provider>;
}

export function usePlayZone() {
  const context = useContext(PlayZoneContext);
  if (context === undefined) throw new Error('usePlayZone must be used within a PlayZoneProvider');
  return context;
}
