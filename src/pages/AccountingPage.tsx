import React, { useState, useMemo } from 'react';
import { usePlayZone } from '../hooks/usePlayZone';
import { 
  Receipt, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  TrendingUp, 
  Download,
  Filter,
  PieChart,
  BarChart3,
  Calendar,
  IndianRupee,
  Plus,
  Search,
  FileText,
  MessageCircle,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatCurrency, cn, formatWhatsAppLink } from '../lib/utils';
import { Invoice, InvoiceItem } from '../types';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart as RePieChart, 
  Pie, 
  Cell,
  LineChart,
  Line
} from 'recharts';

export default function AccountingPage() {
  const { invoices, expenses, addExpense, updateExpense, deleteExpense, updateInvoice, deleteInvoice, exportToCSV, isAdmin, plans, socksTypes } = usePlayZone();
  const [activeTab, setActiveTab ] = useState<'invoices' | 'expenses'>('invoices');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [presetFilter, setPresetFilter] = useState<'custom' | 'today' | 'week' | 'month' | 'fy'>('month');
  const [expenseForm, setExpenseForm] = useState({
    category: '',
    amount: '',
    description: '',
    vendorName: ''
  });

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
      const matchesDate = (!dateRange.from || invDate >= new Date(dateRange.from)) &&
                          (!dateRange.to || invDate <= new Date(dateRange.to));
      const matchesSearch = (inv.invoiceNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (inv.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (inv.mobileNumber || '').includes(searchTerm);
      return matchesDate && matchesSearch;
    });
  }, [invoices, searchTerm, dateRange]);

  const filteredExpenses = useMemo(() => {
    return (expenses || []).filter(ex => {
      const exDate = new Date(ex.date);
      const matchesDate = (!dateRange.from || exDate >= new Date(dateRange.from)) &&
                          (!dateRange.to || exDate <= new Date(dateRange.to));
      const matchesSearch = ex.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            ex.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (ex.vendorName && ex.vendorName.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesDate && matchesSearch;
    });
  }, [expenses, searchTerm, dateRange]);

  const totals = useMemo(() => {
    const revenue = filteredInvoices.reduce((sum, i) => sum + i.totalAmount, 0);
    const gst = filteredInvoices.reduce((sum, i) => sum + i.totalGST, 0);
    const base = filteredInvoices.reduce((sum, i) => sum + i.totalBaseAmount, 0);
    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    
    return {
      revenue,
      gst,
      base,
      expenses: totalExpenses,
      net: revenue - totalExpenses
    };
  }, [invoices, expenses]);

  const pieData = [
    { name: 'Play Services', value: totals.base, color: '#FF6F61' },
    { name: 'GST', value: totals.gst, color: '#00CEC9' },
  ];

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingExpense) {
      updateExpense(editingExpense.id, {
        category: expenseForm.category,
        amount: parseFloat(expenseForm.amount),
        description: expenseForm.description,
        vendorName: expenseForm.vendorName
      });
      setEditingExpense(null);
    } else {
      addExpense({
        category: expenseForm.category,
        amount: parseFloat(expenseForm.amount),
        description: expenseForm.description,
        vendorName: expenseForm.vendorName,
        date: new Date()
      });
    }
    setIsAddingExpense(false);
    setExpenseForm({ category: '', amount: '', description: '', vendorName: '' });
  };

  const handleUpdateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInvoice) return;
    
    // Recalculate totals based on items
    const subtotal = editingInvoice.items.reduce((sum, it) => sum + (it.baseAmount || 0), 0);
    const totalGst = editingInvoice.items.reduce((sum, it) => sum + ((it.baseAmount || 0) * (it.gstSlab || 0) / 100), 0);
    const payable = subtotal + totalGst;

    await updateInvoice(editingInvoice.id, {
      customerName: editingInvoice.customerName,
      mobileNo: editingInvoice.mobileNumber,
      paymentMode: editingInvoice.paymentMode,
      planId: editingInvoice.planId,
      personCount: editingInvoice.personCount,
      items: editingInvoice.items,
      subtotal: subtotal,
      totalGst: totalGst,
      payable: payable
    });
    setEditingInvoice(null);
  };

  const handleDeleteInvoice = async (id: string) => {
    if (confirm('Are you sure you want to delete this bill? This action cannot be undone. ⚠️')) {
      await deleteInvoice(id);
    }
  };

  const handleExportGSTR1 = () => {
    const dataToExport = invoices.map(inv => ({
      CustomerName: inv.customerName,
      InvoiceNumber: inv.invoiceNumber,
      InvoiceDate: new Date(inv.date).toLocaleDateString(),
      BaseAmount: inv.totalBaseAmount,
      GSTAmount: inv.totalGST,
      TotalAmount: inv.totalAmount,
      GST_Slab: inv.items[0]?.gstSlab || 18
    }));
    exportToCSV(dataToExport, 'FunkyLand_GSTR1');
  };

  const handlePrintAccounting = () => {
    window.print();
  };

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight italic">Financials 📊</h1>
          <p className="text-slate-500 font-medium">Accounting & GST insights</p>
        </div>
        <div className="flex items-center gap-3 no-print">
          <button 
            onClick={handlePrintAccounting}
            className="p-4 bg-white border border-slate-100 text-slate-400 rounded-2xl shadow-sm hover:text-primary transition-all"
            title="Print Summary"
          >
            <FileText size={20} />
          </button>
          {isAdmin && (
            <>
              <button 
                onClick={handleExportGSTR1}
                className="flex items-center gap-2 px-6 py-4 bg-white border border-slate-100 text-slate-600 font-black rounded-2xl shadow-sm hover:bg-slate-50 transition-all font-xs"
              >
                <Download size={20} />
                Excel
              </button>
              <button 
                onClick={() => setIsAddingExpense(true)}
                className="flex items-center gap-2 px-6 py-4 bg-slate-900 text-white font-black rounded-2xl shadow-xl hover:scale-105 transition-all font-xs"
              >
                <Plus size={20} />
                Expense
              </button>
            </>
          )}
        </div>
      </header>

      {/* Filters Section */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] mb-2">
          <Filter size={14} /> Date Filtering
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Quick Select</label>
            <select 
              value={presetFilter}
              onChange={e => setPresetFilter(e.target.value as any)}
              className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent focus:border-primary/20 rounded-2xl outline-none font-bold text-primary transition-all appearance-none"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="fy">Financial Year (Current)</option>
              <option value="fy-25-26">FY 2025-2026</option>
              <option value="fy-26-27">FY 2026-2027</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">From Date</label>
            <input 
              type="date"
              value={dateRange.from}
              onChange={e => {
                setDateRange({ ...dateRange, from: e.target.value });
                setPresetFilter('custom');
              }}
              className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent focus:border-primary/20 rounded-2xl outline-none font-bold uppercase transition-all"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">To Date</label>
            <input 
              type="date"
              value={dateRange.to}
              onChange={e => {
                setDateRange({ ...dateRange, to: e.target.value });
                setPresetFilter('custom');
              }}
              className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent focus:border-primary/20 rounded-2xl outline-none font-bold uppercase transition-all"
            />
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Revenue', value: totals.revenue, icon: ArrowUpRight, color: 'text-emerald-500', bg: 'bg-emerald-50' },
          { label: 'Total Expenses', value: totals.expenses, icon: ArrowDownLeft, color: 'text-red-500', bg: 'bg-red-50' },
          { label: 'GST Collected', value: totals.gst, icon: Receipt, color: 'text-cyan-500', bg: 'bg-cyan-50' },
          { label: 'Net Profit', value: totals.net, icon: TrendingUp, color: 'text-primary', bg: 'bg-primary/10' },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden"
          >
            <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color} w-fit mb-4`}>
              <stat.icon size={24} />
            </div>
            <p className="text-slate-400 font-black text-xs uppercase tracking-widest mb-1">{stat.label}</p>
            <h3 className={cn("text-2xl font-black", stat.color)}>{formatCurrency(stat.value)}</h3>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Tabs */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex p-1 bg-slate-100 rounded-2xl w-fit">
              <button 
                onClick={() => setActiveTab('invoices')}
                className={cn(
                  "px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all",
                  activeTab === 'invoices' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                Invoices
              </button>
              <button 
                onClick={() => setActiveTab('expenses')}
                className={cn(
                  "px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all",
                  activeTab === 'expenses' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                Expenses
              </button>
            </div>
            <div className="relative group">
               <div className="absolute left-3 top-1/2 -translate-y-1/2 p-1.5 bg-primary/10 text-primary rounded-lg group-focus-within:bg-primary group-focus-within:text-white transition-all">
                <Search size={14} />
               </div>
               <input 
                 type="text"
                 placeholder="Search entries..."
                 value={searchTerm}
                 onChange={e => setSearchTerm(e.target.value)}
                 className="pl-12 pr-28 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all w-full md:w-80 shadow-sm"
               />
               <button 
                type="button"
                onClick={() => setSearchTerm(searchTerm)}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-slate-900 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-md active:scale-95"
               >
                 Search
               </button>
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              {activeTab === 'invoices' ? (
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Inv No</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Amount</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredInvoices.length > 0 ? filteredInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-8 py-5 font-black text-slate-800 text-sm italic">{inv.invoiceNumber}</td>
                        <td className="px-8 py-5 font-bold text-slate-600 text-sm">{inv.customerName}</td>
                        <td className="px-8 py-5 text-slate-400 text-sm font-medium">{new Date(inv.date).toLocaleDateString()}</td>
                        <td className="px-8 py-5 font-black text-slate-800 text-right">{formatCurrency(inv.totalAmount)}</td>
                        <td className="px-8 py-5 text-right no-print">
                          <div className="flex items-center justify-end gap-2">
                             <button 
                              onClick={() => setEditingInvoice(inv as any)}
                              className="p-2 text-slate-300 hover:text-primary transition-all"
                              title="Edit Bill"
                            >
                              <FileText size={16} />
                            </button>
                            <button 
                              onClick={() => handleDeleteInvoice(inv.id)}
                              className="p-2 text-slate-300 hover:text-red-500 transition-all"
                              title="Delete Bill"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={4} className="px-8 py-20 text-center text-slate-400 italic font-medium">No invoices found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Category</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredExpenses.length > 0 ? filteredExpenses.map((ex) => (
                      <tr key={ex.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-8 py-5">
                          <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-tight">
                            {ex.category}
                          </span>
                        </td>
                        <td className="px-8 py-5 font-bold text-slate-600 text-sm">{ex.description}</td>
                        <td className="px-8 py-5 text-slate-400 text-sm font-medium">{new Date(ex.date).toLocaleDateString()}</td>
                        <td className="px-8 py-5 text-right font-black">
                          <div className="flex items-center justify-end gap-3">
                            <span className="text-red-500">{formatCurrency(ex.amount)}</span>
                            {isAdmin && (
                              <>
                                <button 
                                  onClick={() => {
                                    setEditingExpense(ex);
                                    setExpenseForm({
                                      category: ex.category,
                                      amount: ex.amount.toString(),
                                      description: ex.description,
                                      vendorName: ex.vendorName || ''
                                    });
                                    setIsAddingExpense(true);
                                  }}
                                  className="p-2 hover:bg-primary/5 text-slate-300 hover:text-primary rounded-lg transition-all"
                                  title="Edit Expense"
                                >
                                  <FileText size={14} />
                                </button>
                                <button 
                                  onClick={() => {
                                    if (confirm('Are you sure you want to delete this expense?')) {
                                      deleteExpense(ex.id);
                                    }
                                  }}
                                  className="p-2 hover:bg-rose-50 text-slate-300 hover:text-rose-500 rounded-lg transition-all"
                                  title="Delete Expense"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={4} className="px-8 py-20 text-center text-slate-400 italic font-medium">No expenses recorded</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <h2 className="text-xl font-black text-slate-800 mb-8 flex items-center gap-2">
              <PieChart className="text-primary" /> Revenue Mix
            </h2>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <RePieChart>
                  <Pie
                    data={pieData}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RePieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-4 pt-6">
              {pieData.map((d, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-sm font-bold text-slate-600">{d.name}</span>
                  </div>
                  <span className="text-sm font-black text-slate-800">{formatCurrency(d.value)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
            <div className="absolute bottom-0 right-0 w-32 h-32 bg-accent/20 blur-[60px]" />
            <h2 className="text-lg font-black mb-6 flex items-center gap-2 italic">
              <Calendar className="text-accent" /> Tax Calendar
            </h2>
            <div className="space-y-4">
              <div className="p-4 bg-slate-800 rounded-2xl space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Next GSTR-1 Deadline</p>
                <div className="flex justify-between items-center">
                  <span className="text-lg font-black">May 11, 2026</span>
                  <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-[10px] font-black rounded-lg">REMINDER</span>
                </div>
              </div>
              <p className="text-xs text-slate-400 font-medium italic opacity-75">
                "Funky Land v2.0 automatically segments GST by slab (5%, 12%, 18%) for easy filing."
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Invoice Modal */}
      <AnimatePresence>
        {editingInvoice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingInvoice(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white rounded-[3rem] shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-slate-800 italic">Edit Bill</h3>
                  <p className="text-[10px] font-black text-primary uppercase tracking-widest">{editingInvoice.invoiceNumber}</p>
                </div>
                <button 
                  onClick={() => setEditingInvoice(null)}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-all"
                >
                  <Plus className="rotate-45" size={24} />
                </button>
              </div>
              <form onSubmit={handleUpdateInvoice} className="p-8 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Customer Name</label>
                    <input 
                      type="text"
                      required
                      value={editingInvoice.customerName}
                      onChange={e => setEditingInvoice({...editingInvoice, customerName: e.target.value})}
                      className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-primary/20 rounded-2xl outline-none font-bold transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Phone Number</label>
                    <input 
                      type="tel"
                      required
                      value={editingInvoice.mobileNumber}
                      onChange={e => setEditingInvoice({...editingInvoice, mobileNumber: e.target.value})}
                      className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-primary/20 rounded-2xl outline-none font-bold transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Payment Mode</label>
                    <select 
                      value={editingInvoice.paymentMode}
                      onChange={e => setEditingInvoice({...editingInvoice, paymentMode: e.target.value as any})}
                      className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-primary/20 rounded-2xl outline-none font-bold transition-all"
                    >
                      <option value="cash">Cash</option>
                      <option value="upi">UPI / QR</option>
                      <option value="card">Card</option>
                    </select>
                  </div>
                </div>

                {/* Edit Items Section */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Bill Items & Charges</h4>
                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest px-1">Auto-Calculating</span>
                  </div>
                  
                  <div className="space-y-3">
                    {/* Plan Selection */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Primary Plan</label>
                      <select 
                        value={editingInvoice.planId || ''}
                        onChange={e => {
                          const selectedPlan = plans.find(p => p.id === e.target.value);
                          if (selectedPlan) {
                            const newItems = editingInvoice.items.map(item => 
                              item.type === 'plan' ? { 
                                ...item, 
                                name: selectedPlan.title, 
                                price: selectedPlan.price,
                                baseAmount: selectedPlan.price * (editingInvoice.personCount || 1)
                              } : item
                            );
                            setEditingInvoice({...editingInvoice, planId: selectedPlan.id, items: newItems});
                          }
                        }}
                        className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl outline-none font-bold"
                      >
                        <option value="">No Plan</option>
                        {plans.map(p => (
                          <option key={p.id} value={p.id}>{p.title} (₹{p.price})</option>
                        ))}
                      </select>
                    </div>

                    {/* Person Count */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">No. of Persons</label>
                      <input 
                        type="number"
                        min="1"
                        value={editingInvoice.personCount || 1}
                        onChange={e => {
                          const count = parseInt(e.target.value) || 1;
                          const newItems = editingInvoice.items.map(item => 
                            item.type === 'plan' ? { ...item, baseAmount: (item.price || 0) * count } : item
                          );
                          setEditingInvoice({...editingInvoice, personCount: count, items: newItems});
                        }}
                        className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl outline-none font-bold"
                      />
                    </div>

                    {/* Socks Items */}
                    {editingInvoice.items.filter(item => item.type === 'socks').map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl">
                        <div className="flex-1">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.name}</p>
                          <p className="text-sm font-bold text-slate-800">₹{item.price} each</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            type="button"
                            onClick={() => {
                              const qty = Math.max(0, (item.quantity || 0) - 1);
                              const newItems = editingInvoice.items.map((it, i) => 
                                (it.type === 'socks' && it.name === item.name) ? { ...it, quantity: qty, baseAmount: (it.price || 0) * qty } : it
                              );
                              setEditingInvoice({...editingInvoice, items: newItems});
                            }}
                            className="w-8 h-8 flex items-center justify-center bg-white rounded-lg border border-slate-100 hover:bg-slate-50 shadow-sm"
                          >
                            -
                          </button>
                          <span className="w-8 text-center font-black">{item.quantity}</span>
                          <button 
                            type="button"
                            onClick={() => {
                              const qty = (item.quantity || 0) + 1;
                              const newItems = editingInvoice.items.map((it, i) => 
                                (it.type === 'socks' && it.name === item.name) ? { ...it, quantity: qty, baseAmount: (it.price || 0) * qty } : it
                              );
                              setEditingInvoice({...editingInvoice, items: newItems});
                            }}
                            className="w-8 h-8 flex items-center justify-center bg-white rounded-lg border border-slate-100 hover:bg-slate-50 shadow-sm"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                    
                    {/* Add Missing Socks Types if any */}
                    <div className="flex flex-wrap gap-2 pt-2">
                      {socksTypes.filter(st => !editingInvoice.items.some(it => it.name === st.name)).map(st => (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => {
                            const price = parseFloat(st.price);
                            const newItem: InvoiceItem = {
                              id: `socks-${st.id}-${Date.now()}`,
                              name: st.name,
                              description: `Socks: ${st.name}`,
                              type: 'socks',
                              price: price,
                              unitPrice: price,
                              quantity: 1,
                              baseAmount: price,
                              amount: price * (1 + (parseInt(st.gstSlab) || 5) / 100),
                              gstSlab: (parseInt(st.gstSlab) || 5) as any
                            };
                            setEditingInvoice({...editingInvoice, items: [...editingInvoice.items, newItem]});
                          }}
                          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                          + {st.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900 p-6 rounded-3xl space-y-3">
                  <div className="flex justify-between items-center text-slate-400">
                    <span className="text-[10px] font-black uppercase">Subtotal</span>
                    <span className="font-bold">₹{editingInvoice.items.reduce((sum, it) => sum + (it.baseAmount || 0), 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400 border-t border-slate-800 pt-3">
                    <span className="text-[10px] font-black uppercase">Total GST</span>
                    <span className="font-bold">₹{editingInvoice.items.reduce((sum, it) => sum + ((it.baseAmount || 0) * (it.gstSlab || 0) / 100), 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-white pt-2">
                    <span className="text-xs font-black uppercase tracking-widest">Payable</span>
                    <span className="text-xl font-black">₹{editingInvoice.items.reduce((sum, it) => {
                      const base = it.baseAmount || 0;
                      const gst = base * (it.gstSlab || 0) / 100;
                      return sum + base + gst;
                    }, 0).toFixed(2)}</span>
                  </div>
                </div>
                
                <button 
                  type="submit"
                  className="w-full py-5 bg-primary text-white font-black rounded-3xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all text-xs uppercase tracking-widest"
                >
                  Confirm & Update Invoice ⚡️
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Expense Modal */}
      <AnimatePresence>
        {isAddingExpense && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddingExpense(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[3rem] shadow-2xl p-8"
            >
              <h2 className="text-2xl font-black text-slate-800 mb-8 flex items-center gap-3 italic">
                {editingExpense ? <FileText className="text-primary" size={28} /> : <Plus className="text-primary" size={28} />} 
                {editingExpense ? 'Edit Expense' : 'New Expense'}
              </h2>

              <form onSubmit={handleAddExpense} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Category</label>
                  <select 
                    required
                    value={expenseForm.category}
                    onChange={e => setExpenseForm({...expenseForm, category: e.target.value})}
                    className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl transition-all outline-none font-medium appearance-none"
                  >
                    <option value="">Select Category</option>
                    <option value="rent">Rent & Electricity</option>
                    <option value="staff">Staff Salary</option>
                    <option value="marketing">Marketing & CRM</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="inventory">Inventory (Toys/Food)</option>
                    <option value="others">Others</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Amount (₹)</label>
                  <input 
                    type="number" required
                    placeholder="0.00"
                    value={expenseForm.amount}
                    onChange={e => setExpenseForm({...expenseForm, amount: e.target.value})}
                    className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl transition-all outline-none font-black text-xl"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Description</label>
                  <textarea 
                    required
                    value={expenseForm.description}
                    onChange={e => setExpenseForm({...expenseForm, description: e.target.value})}
                    className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl transition-all outline-none font-medium h-24 resize-none"
                    placeholder="Details about the expense..."
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setIsAddingExpense(false)}
                    className="flex-1 py-4 bg-slate-100 text-slate-500 font-black rounded-2xl hover:bg-slate-200 transition-all font-xs uppercase tracking-widest"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-[2] py-4 bg-slate-900 text-white font-black text-lg rounded-2xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    Confirm Expense ✅
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
