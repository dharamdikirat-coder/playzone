
import React, { useMemo, useState } from 'react';
import { usePlayZone } from '../hooks/usePlayZone';
import { getApiBase } from '../lib/syncService';
import { 
  Users, 
  Wallet, 
  Calendar as CalendarIcon, 
  Zap,
  TrendingUp,
  Clock,
  ArrowUpRight,
  Receipt as ReceiptIcon,
  PieChart,
  Footprints,
  X,
  FileText,
  Download,
  Clipboard,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatCurrency, cn } from '../lib/utils';
import { Link, useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Cell } from 'recharts';
import ThermalReceipt from '../components/ThermalReceipt';
import PasteImportModal from '../components/PasteImportModal';
import { Invoice } from '../types';

const SLIDES = [
  {
    title: "Summer Play Pass",
    subtitle: "Unlimited Fun All Summer",
    color: "from-orange-400 to-rose-400",
    icon: "☀️"
  },
  {
    title: "Birthday Bonanza",
    subtitle: "Book now for special discounts",
    color: "from-purple-500 to-indigo-500",
    icon: "🎂"
  },
  {
    title: "New Member Rewards",
    subtitle: "Earn points on every visit",
    color: "from-emerald-400 to-teal-500",
    icon: "⭐️"
  }
];

export default function DashboardPage() {
  const { entries, events, invoices, exportToCSV, categories, isAdmin, dbError, refreshData, isSyncing } = usePlayZone();
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [presetFilter, setPresetFilter] = useState<'custom' | 'today' | 'week' | 'month' | 'fy'>('today');
  const navigate = useNavigate();

  const applyPreset = (preset: string) => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    switch (preset) {
      case 'today':
        setDateRange({ from: start.toISOString().split('T')[0], to: end.toISOString().split('T')[0] });
        break;
      case 'week':
        const day = now.getDay() || 7;
        const monday = new Date(now);
        monday.setHours(0,0,0,0);
        monday.setDate(now.getDate() - day + 1);
        setDateRange({ from: monday.toISOString().split('T')[0], to: end.toISOString().split('T')[0] });
        break;
      case 'month':
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        setDateRange({ from: firstDay.toISOString().split('T')[0], to: end.toISOString().split('T')[0] });
        break;
      case 'fy':
        const fyStartYear = now.getMonth() < 3 ? now.getFullYear() - 1 : now.getFullYear();
        const fyStart = new Date(fyStartYear, 3, 1);
        setDateRange({ from: fyStart.toISOString().split('T')[0], to: end.toISOString().split('T')[0] });
        break;
      case 'fy-25-26':
        setDateRange({ from: '2025-04-01', to: '2026-03-31' });
        break;
      case 'fy-26-27':
        setDateRange({ from: '2026-04-01', to: '2027-03-31' });
        break;
      default:
        break;
    }
  };

  React.useEffect(() => {
    if (presetFilter !== 'custom') {
      applyPreset(presetFilter);
    }
  }, [presetFilter]);

  const filteredInvoices = useMemo(() => {
    return (invoices || []).filter(inv => {
      const invDate = new Date(inv.date);
      return (!dateRange.from || invDate >= new Date(dateRange.from)) &&
             (!dateRange.to || invDate <= new Date(dateRange.to));
    });
  }, [invoices, dateRange]);

  const filteredRevenue = filteredInvoices.reduce((sum, i) => sum + i.totalAmount, 0);

  const handleImport = (type: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const formData = new FormData();
      formData.append('file', file);
      try {
        const res = await fetch(`${getApiBase()}/api/import/${type}`, {
          method: 'POST',
          body: formData
        });
        const result = await res.json();
        if (result.success) {
          alert(`Successfully imported ${result.count} records!`);
          refreshData(); // Refresh to show new data
        } else {
          alert('Import failed: ' + result.error);
        }
      } catch (err) {
        alert('Import failed. Please check your connection.');
      }
    };
    input.click();
  };

  const handlePrintDashboard = () => {
    window.print();
  };

  const activeEntries = entries.filter(e => e.status === 'active');
  
  const today = new Date().toDateString();

  const filteredSocks = useMemo(() => {
    return entries
      .filter(e => {
        const d = e.startTime instanceof Date ? e.startTime : new Date(e.startTime);
        return (!dateRange.from || d >= new Date(dateRange.from)) &&
               (!dateRange.to || d <= new Date(dateRange.to));
      })
      .reduce((acc, curr) => ({
        small: acc.small + (curr.smallSocksCount || 0),
        medium: acc.medium + (curr.mediumSocksCount || 0)
      }), { small: 0, medium: 0 });
  }, [entries, dateRange]);

  // Chart data for last 7 days
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dayStr = d.toDateString();
    const dayInvoices = invoices.filter(inv => new Date(inv.date).toDateString() === dayStr);
    return {
      name: d.toLocaleDateString([], { weekday: 'short' }),
      revenue: dayInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0),
    };
  });

  // Monthly breakdown
  const monthlyData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = new Date().getFullYear();
    return months.map((month, index) => {
      const monthInvoices = invoices.filter(inv => {
        const d = new Date(inv.date);
        return d.getMonth() === index && d.getFullYear() === currentYear;
      });
      return {
        name: month,
        revenue: monthInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0)
      };
    }).slice(0, new Date().getMonth() + 1);
  }, [invoices]);

  const billTypeData = useMemo(() => {
    return [
      { name: 'Walking', value: invoices.filter(i => i.type === 'walking').reduce((sum, i) => sum + i.totalAmount, 0) },
      { name: 'Members', value: invoices.filter(i => i.type === 'member').reduce((sum, i) => sum + i.totalAmount, 0) },
      { name: 'Events', value: invoices.filter(i => i.type === 'event').reduce((sum, i) => sum + i.totalAmount, 0) },
    ].filter(i => i.value > 0);
  }, [invoices]);

  const stats = [
    { 
      label: 'Live Kids', 
      value: activeEntries.length.toString(), 
      icon: Users, 
      color: 'bg-accent',
      trend: '+12% from avg'
    },
    ...(isAdmin ? [
      { 
        label: presetFilter === 'today' ? 'Today Revenue' : 'Range Revenue', 
        value: formatCurrency(filteredRevenue), 
        icon: Wallet, 
        color: 'bg-primary',
        trend: `${filteredInvoices.length} check-ins`
      }
    ] : []),
    { 
      label: 'Socks Sold', 
      value: (filteredSocks.small + filteredSocks.medium).toString(), 
      icon: Footprints, 
      color: 'bg-amber-500',
      trend: `S: ${filteredSocks.small} / M: ${filteredSocks.medium}`
    },
    { 
      label: 'Events Today', 
      value: events.filter(e => new Date(e.date).toDateString() === today).length.toString(), 
      icon: CalendarIcon, 
      color: 'bg-secondary',
      trend: 'Upcoming'
    },
  ];

  const [isTroubleshootingOpen, setIsTroubleshootingOpen] = useState(false);

  const lastInvoice = (invoices && invoices.length > 0) ? invoices[0] : null;

  const [currentSlide, setCurrentSlide] = useState(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % SLIDES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-10 pb-10">
      {/* Database Connection Status Section */}
      <div className="mx-4 md:mx-0 flex items-center justify-between p-4 bg-white border border-slate-100 rounded-3xl shadow-sm mb-6">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-3 h-3 rounded-full animate-pulse",
            !dbError ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
          )} />
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Cloud Sync Status</p>
            <p className="text-xs font-bold text-slate-700 mt-1">
              {!dbError ? "Connected to Supabase Cloud" : "Running in Offline/Local Mode"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!dbError ? (
            <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 italic">
              All devices synchronized
            </span>
          ) : (
            <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-100 italic">
              Data saved locally
            </span>
          )}
          <button 
            onClick={() => alert(!dbError 
              ? "Great! Your app is connected to Supabase. Data added on any device will be visible everywhere." 
              : "Wait! Your app is using temporary local storage. To sync across devices, please add your DATABASE_URL in settings.")}
            className="p-2 text-slate-300 hover:text-primary transition-colors"
            title="Cloud Sync Info"
          >
            <Zap size={14} />
          </button>
        </div>
      </div>

      {dbError && (
        <div className={cn(
          "mx-4 md:mx-0 border-2 rounded-2xl p-4 flex items-center gap-4 shadow-sm animate-pulse",
          dbError.includes('waking up') 
            ? "bg-blue-50 border-blue-100 text-blue-800" 
            : "bg-amber-50 border-amber-100 text-amber-800"
        )}>
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center text-xl",
            dbError.includes('waking up') ? "bg-blue-100" : "bg-amber-100"
          )}>
            {dbError.includes('waking up') ? "🚀" : "⚠️"}
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-sm uppercase tracking-wider">
              {dbError.includes('waking up') ? "Cloud Server Starting" : "Database Connection Issue"}
            </h3>
            <p className="text-xs opacity-80">{dbError}</p>
          </div>
          <div className="flex gap-2">
            {!dbError.includes('waking up') && (
              <button 
                onClick={() => setIsTroubleshootingOpen(true)}
                className="px-4 py-2 bg-white border border-amber-200 hover:bg-amber-100 rounded-lg text-xs font-bold transition-colors"
                id="troubleshoot-btn"
              >
                How to Fix?
              </button>
            )}
            <button 
              onClick={() => {
                if (dbError.includes('waking up')) {
                  refreshData();
                } else {
                  window.location.reload();
                }
              }}
              className={cn(
                "px-4 py-2 text-white rounded-lg text-xs font-bold transition-colors shadow-sm",
                dbError.includes('waking up') ? "bg-blue-600 hover:bg-blue-700" : "bg-amber-600 hover:bg-amber-700"
              )}
              id="db-retry-btn"
            >
              {dbError.includes('waking up') ? (isSyncing ? 'Checking...' : 'Refresh Status') : 'Retry Connection'}
            </button>
          </div>
        </div>
      )}

      {/* Troubleshooting Modal */}
      <AnimatePresence>
        {isTroubleshootingOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsTroubleshootingOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden"
            >
              <div className="p-8 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-black text-slate-800 italic">Troubleshoot Database 🛠️</h3>
                  <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Fix Sync & Connection Issues</p>
                </div>
                <button onClick={() => setIsTroubleshootingOpen(false)} className="p-3 hover:bg-slate-200 rounded-2xl transition-all">
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar space-y-8">
                <div className="space-y-4">
                  <h4 className="font-black text-lg text-primary flex items-center gap-2">
                    <Zap size={20} /> Most Likely Fix: Use the Pooler
                  </h4>
                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                    <p className="text-sm text-slate-600 leading-relaxed mb-4">
                      Supabase direct connections (Port 5432) are often blocked. You should use the <strong>Transaction Pooler</strong> instead.
                    </p>
                    <ol className="list-decimal list-inside space-y-2 text-xs font-bold text-slate-500 uppercase tracking-tight">
                      <li>Log in to Supabase Dashboard</li>
                      <li>Go to <strong>Settings → Database → Connection String</strong></li>
                      <li>Switch Mode to <strong>"Transaction"</strong></li>
                      <li>Copy the URI (it will have port <strong>6543</strong>)</li>
                      <li>Update your <code>DATABASE_URL</code> secret in AI Studio</li>
                    </ol>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-black text-lg text-slate-800">Special Characters</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      If your password contains <strong># @ : /</strong>, the connection will fail. You must URL-encode them:
                    </p>
                    <div className="bg-slate-900 p-4 rounded-2xl font-mono text-[10px] text-emerald-400">
                      # → %23<br />
                      @ → %40<br />
                      : → %3A
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h4 className="font-black text-lg text-slate-800">IPv6 vs IPv4</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      If you see <code>ECONNREFUSED</code> with a long ID (IPv6), try adding <code>?sslmode=require</code> to your URL or check Supabase's IPv4 add-on.
                    </p>
                    <p className="text-[10px] text-amber-600 font-black italic"> We've added a manual fix to the app to force IPv4! </p>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
                <button 
                  onClick={() => setIsTroubleshootingOpen(false)}
                  className="px-12 py-4 bg-slate-800 text-white font-black rounded-2xl hover:bg-slate-900 transition-all uppercase tracking-widest text-xs"
                >
                  Got it, I'll Check
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight italic">Operations Hub 🎡</h1>
          <p className="text-slate-500 font-medium italic">Monitoring Funky Land Kids Zone • <span className="text-primary font-bold">Main Branch</span></p>
        </div>
        <div className="flex flex-wrap items-center gap-3 no-print">
          <div className="flex items-center gap-2 p-1 bg-white border border-slate-100 rounded-2xl shadow-sm">
             <select 
               value={presetFilter}
               onChange={e => setPresetFilter(e.target.value as any)}
               className="px-4 py-2 bg-transparent text-xs font-black text-primary uppercase tracking-widest outline-none appearance-none cursor-pointer"
             >
               <option value="today">Today</option>
               <option value="week">Week</option>
               <option value="month">Month</option>
               <option value="fy">FY (Current)</option>
               <option value="fy-25-26">FY 25-26</option>
               <option value="fy-26-27">FY 26-27</option>
             </select>
          </div>
          {isAdmin && (
            <div className="flex gap-2">
              <button 
                onClick={() => handleImport('members')}
                className="flex items-center gap-2 px-6 py-5 bg-white border-2 border-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-50 transition-all shadow-sm group"
                title="Import Members Data"
              >
                <Download size={20} className="text-slate-400 group-hover:text-emerald-500 transition-colors" />
                <span className="text-xs uppercase tracking-widest">Members</span>
              </button>
              <button 
                onClick={() => handleImport('walk_in')}
                className="flex items-center gap-2 px-6 py-5 bg-white border-2 border-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-50 transition-all shadow-sm group"
                title="Import Walk-in Data (V1)"
              >
                <Download size={20} className="text-slate-400 group-hover:text-emerald-500 transition-colors" />
                <span className="text-xs uppercase tracking-widest">V1</span>
              </button>
              <button 
                onClick={() => handleImport('walk_in_v2')}
                className="flex items-center gap-2 px-6 py-5 bg-white border-2 border-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-50 transition-all shadow-sm group"
                title="Import Walk-in Data (V2)"
              >
                <Download size={20} className="text-slate-400 group-hover:text-emerald-500 transition-colors" />
                <span className="text-xs uppercase tracking-widest">V2</span>
              </button>
              <button 
                onClick={() => handleImport('accounting')}
                className="flex items-center gap-2 px-6 py-5 bg-white border-2 border-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-50 transition-all shadow-sm group"
                title="Import Expense Data"
              >
                <Download size={20} className="text-slate-400 group-hover:text-amber-500 transition-colors" />
                <span className="text-xs uppercase tracking-widest">Expenses</span>
              </button>
              <button 
                onClick={() => setIsPasteModalOpen(true)}
                className="flex items-center gap-2 px-6 py-5 bg-white border-2 border-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-50 transition-all shadow-sm group"
                title="Paste Data from Clipboard"
              >
                <Clipboard size={20} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
                <span className="text-xs uppercase tracking-widest">Paste</span>
              </button>
            </div>
          )}
          <button 
            onClick={() => navigate('/billing')}
            className="flex items-center gap-2 sm:gap-3 px-4 sm:px-8 py-4 sm:py-5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-black rounded-2xl sm:rounded-3xl shadow-[0_20px_40px_-10px_rgba(79,70,229,0.3)] hover:scale-105 active:scale-95 transition-all text-xs sm:text-sm uppercase tracking-[0.1em] group"
          >
            <div className="p-2 bg-white/20 rounded-xl group-hover:rotate-12 transition-transform">
              <Zap size={20} fill="currentColor" />
            </div>
            Quick POS Terminal
          </button>
          
          <button 
            onClick={handlePrintDashboard}
            className="hidden sm:inline-flex items-center gap-2 px-6 py-5 bg-white border-2 border-slate-100 text-slate-400 font-black rounded-2xl hover:text-blue-500 transition-all shadow-sm"
            title="Print Summary"
          >
            <FileText size={22} />
          </button>

          {lastInvoice && (
            <button 
              onClick={() => setSelectedInvoice(lastInvoice)}
              className="hidden lg:inline-flex items-center gap-3 px-6 py-5 bg-white border-2 border-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-50 transition-all shadow-sm group"
              title="Print Last Receipt"
            >
              <ReceiptIcon size={20} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
              <span className="text-xs uppercase tracking-widest">Recent Bill</span>
            </button>
          )}
        </div>
      </header>

      {/* Featured Slider */}
      <div className="relative h-48 sm:h-56 md:h-64 w-full rounded-[3rem] overflow-hidden shadow-2xl shadow-slate-200">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className={cn(
              "absolute inset-0 bg-gradient-to-br p-8 md:p-12 flex items-center justify-between",
              SLIDES[currentSlide].color
            )}
          >
             <div className="space-y-4 max-w-lg z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black text-white uppercase tracking-widest">
                   {SLIDES[currentSlide].icon} Featured Promotion
                </div>
                <div>
                   <h2 className="text-xl sm:text-3xl md:text-5xl font-black text-white italic tracking-tight leading-tight">{SLIDES[currentSlide].title}</h2>
                   <p className="text-white/80 font-bold italic text-[10px] sm:text-xs md:text-lg mt-1">{SLIDES[currentSlide].subtitle}</p>
                </div>
             </div>
             
             <div className="absolute right-0 bottom-0 opacity-20 pointer-events-none translate-x-10 translate-y-10">
                <span className="text-[15rem] leading-none select-none">{SLIDES[currentSlide].icon}</span>
             </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Quick Actions Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Link 
          to="/billing" 
          className="group bg-white p-10 rounded-[3rem] border-2 border-transparent hover:border-primary/20 shadow-xl shadow-slate-200/50 transition-all flex items-center gap-8 relative overflow-hidden active:scale-[0.98]"
        >
          <div className="w-24 h-24 rounded-[2rem] gradient-primary flex items-center justify-center text-5xl shadow-2xl shadow-primary/30 group-hover:rotate-12 transition-transform duration-500">
            🎡
          </div>
          <div className="flex-1">
            <h2 className="text-3xl font-black text-slate-800 tracking-tight mb-1">Add Customer</h2>
            <p className="text-slate-400 font-black italic uppercase tracking-widest text-sm">New Session Registration</p>
          </div>
          <motion.div
            animate={{ x: [0, 5, 0] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            <ArrowUpRight size={40} className="text-slate-200 group-hover:text-primary transition-colors" />
          </motion.div>
          {/* Decorative element */}
          <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-primary/5 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
        </Link>

        {lastInvoice ? (
          <button 
            onClick={() => setSelectedInvoice(lastInvoice)}
            className="group bg-slate-900 p-10 rounded-[3rem] shadow-2xl transition-all flex items-center gap-8 relative overflow-hidden text-left active:scale-[0.98]"
          >
            <div className="w-24 h-24 rounded-[2rem] bg-white/10 flex items-center justify-center text-white shadow-inner group-hover:rotate-[-12deg] transition-transform duration-500">
              <ReceiptIcon size={48} />
            </div>
            <div className="flex-1">
              <h2 className="text-3xl font-black text-white tracking-tight mb-1">Print Bill</h2>
              <p className="text-slate-400 font-black italic uppercase tracking-widest text-sm">Re-print Latest Transaction</p>
              <p className="text-emerald-400 font-mono text-xs mt-2 font-bold uppercase">{lastInvoice.invoiceNumber} • {formatCurrency(lastInvoice.totalAmount)}</p>
            </div>
            <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-white/5 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
          </button>
        ) : (
           <div className="bg-slate-50 border-4 border-dashed border-slate-100 p-10 rounded-[3rem] flex items-center justify-center text-center">
              <p className="text-slate-300 font-black italic uppercase tracking-widest">No recent transactions</p>
           </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden"
          >
            <div className={`w-12 h-12 ${stat.color} rounded-2xl flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-1">{stat.label}</p>
              <h3 className="text-2xl font-black text-slate-800">{stat.value}</h3>
              <p className="text-[10px] font-black text-slate-400 mt-2 flex items-center gap-1 uppercase tracking-tight">
                <ArrowUpRight size={12} className="text-emerald-500" /> {stat.trend}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Charts Section */}
        <div className="lg:col-span-2 space-y-6">
          {isAdmin && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                  <TrendingUp className="text-primary" /> Weekly Revenue
                </h2>
                <div className="h-[250px] w-full min-h-[250px] min-w-0">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <AreaChart data={last7Days}>
                      <defs>
                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#FF6F61" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#FF6F61" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 10, fontWeight: 700}} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 10, fontWeight: 700}} dx={-10} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', background: '#1E293B', color: '#fff' }}
                        itemStyle={{ color: '#FF6F61', fontWeight: 900 }}
                      />
                      <Area type="monotone" dataKey="revenue" stroke="#FF6F61" strokeWidth={4} fillOpacity={1} fill="url(#colorRev)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                  <TrendingUp className="text-blue-500" /> Monthly Trends
                </h2>
                <div className="h-[250px] w-full min-h-[250px] min-w-0">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 10, fontWeight: 700}} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 10, fontWeight: 700}} dx={-10} />
                      <Tooltip 
                        cursor={{fill: '#F8FAFC', radius: 10}}
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', background: '#1E293B', color: '#fff' }}
                      />
                      <Bar dataKey="revenue" fill="#5C5CFE" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
              <Clock className="text-accent" /> Live Zones
            </h2>
            <Link to="/tracking" className="text-secondary font-black hover:underline text-sm uppercase tracking-widest">Monitor All</Link>
          </div>
          
          <div className="grid gap-4">
            {activeEntries.slice(0, 4).length > 0 ? (
              activeEntries.slice(0, 4).map((entry) => {
                if (!entry || !entry.id) return null;
                return (
                  <div key={entry.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition-all group">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-3xl shadow-inner">
                        {['🎡', '🎮', '🧩', '🎨', '🎠'][Math.floor(Math.random() * 5)]}
                      </div>
                      <div>
                        <h4 className="font-black text-slate-800 text-lg">{entry.childName}</h4>
                        <p className="text-sm text-slate-400 font-bold uppercase tracking-tight">Plan: {entry.planName}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent text-white text-[10px] font-black uppercase tracking-widest">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> LIVE
                      </span>
                      <p className="text-slate-400 text-[10px] font-bold mt-2 uppercase">In: {entry.startTime instanceof Date ? entry.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="bg-slate-50 border-2 border-dashed border-slate-200 p-12 rounded-[2.5rem] text-center">
                <p className="text-slate-400 font-black italic">The zone is quiet... 😴</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Events & Quick Insights */}
        <div className="space-y-8">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
              <CalendarIcon className="text-secondary" /> Event Feed
            </h2>
            <div className="space-y-4">
              {events.slice(0, 3).length > 0 ? (
                events.slice(0, 3).map((event) => {
                  if (!event || !event.id) return null;
                  return (
                    <div key={event.id} className="bg-slate-50 p-5 rounded-3xl border border-slate-100 transition-all hover:bg-white hover:border-secondary/20 hover:shadow-lg group">
                      <div className="flex items-center justify-between mb-3">
                        <span className="px-3 py-1 rounded-full bg-secondary/10 text-secondary text-[10px] font-black uppercase tracking-widest">
                          {new Date(event.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </span>
                        <span className={cn(
                          "text-[10px] font-black uppercase tracking-widest",
                          event.status === 'confirmed' ? "text-emerald-500" : "text-amber-500"
                        )}>
                          {event.status}
                        </span>
                      </div>
                      <h4 className="font-black text-slate-800 mb-1 group-hover:text-secondary transition-colors">{event.customerName}'s {categories.find(c => c && c.id === event.category)?.name || 'Event'}</h4>
                      <p className="text-xs text-slate-500 font-medium">{event.kidsCount} Kids • {event.timeSlot}</p>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                  <p className="text-slate-400 text-sm font-bold italic">No events booked.</p>
                </div>
              )}
            </div>
            <Link to="/calendar" className="mt-6 block text-center py-3 bg-slate-50 text-slate-500 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-slate-100 transition-all">
              Manage Calendar
            </Link>
          </div>

          {isAdmin && (
            <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl overflow-hidden relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-secondary to-accent" />
              <h2 className="text-lg font-black text-white mb-6 flex items-center gap-2">
                <PieChart size={20} className="text-accent" /> Revenue Source
              </h2>
              <div className="h-[200px] w-full relative min-h-[200px] min-w-0">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <BarChart data={billTypeData} layout="vertical">
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 10, fontWeight: 700}} width={60} />
                    <Tooltip 
                      cursor={{fill: 'transparent'}}
                      contentStyle={{ borderRadius: '16px', border: 'none', background: '#1E293B', color: '#fff' }}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {billTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={['#FF6F61', '#5C5CFE', '#FFB800'][index % 3]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-slate-400 font-medium leading-relaxed italic border-l-2 border-slate-700 pl-4 py-1 mt-4">
                Real-time breakdown of your income streams based on customer type.
              </p>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {selectedInvoice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedInvoice(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white rounded-[3rem] shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between no-print">
                <h3 className="text-xl font-black text-slate-800 italic">Bill Preview</h3>
                <button 
                  onClick={() => setSelectedInvoice(null)}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-all"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <ThermalReceipt invoice={selectedInvoice} />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <PasteImportModal 
        isOpen={isPasteModalOpen}
        onClose={() => setIsPasteModalOpen(false)}
        onSuccess={refreshData}
      />
    </div>
  );
}
