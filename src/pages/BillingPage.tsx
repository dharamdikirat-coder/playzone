
import React, { useState, useMemo } from 'react';
import { usePlayZone } from '../hooks/usePlayZone';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, 
  ArrowLeft, 
  Smartphone, 
  User, 
  Baby, 
  Package, 
  Send,
  Plus,
  Trash2,
  Receipt,
  CreditCard,
  Banknote,
  QrCode,
  Printer,
  RefreshCw,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatCurrency, formatWhatsAppLink, cn } from '../lib/utils';
import { GST_LOGIC } from '../constants';
import { Invoice, InvoiceItem, GSTSlab } from '../types';
import ThermalReceipt from '../components/ThermalReceipt';

export default function BillingPage() {
  const { 
    addEntry, 
    addInvoice, 
    addMember, 
    plans, 
    socksConfig, 
    socksTypes,
    businessProfile, 
    members, 
    staff, 
    invoices, 
    currentUser, 
    services, 
    isAdmin, 
    deleteInvoice, 
    refreshData 
  } = usePlayZone();
  const navigate = useNavigate();
  
  const [handledBy, setHandledBy] = useState(currentUser?.id || staff[0]?.id || '');
  
  const [formData, setFormData] = useState({
    customerId: 'CU' + Math.floor(Math.random() * 90000 + 10000),
    name: '',
    mobileNo: '',
    personCount: 1,
    socksCounts: {} as Record<number, number>,
    planId: plans[0]?.id || '',
    description: '',
    isGstInclusive: true,
    registerAsMember: false,
    discount: 0,
    extraServices: [] as { serviceId: string; quantity: number }[]
  });

  // Auto-populate based on phone number
  React.useEffect(() => {
    if (formData.mobileNo.length === 10) {
      // Prioritize Members
      const memberMatch = members.find(m => m.mobileNumber === formData.mobileNo);
      if (memberMatch) {
        setFormData(prev => ({
          ...prev,
          name: `${memberMatch.parentName} (${memberMatch.childName || 'Child'})`,
          customerId: memberMatch.id
        }));
        return;
      }

      // Then check previous invoices (walking customers)
      const invoiceMatch = invoices.find(inv => inv.mobileNumber === formData.mobileNo);
      if (invoiceMatch) {
        setFormData(prev => ({
          ...prev,
          name: invoiceMatch.customerName,
          // keep existing customerId or update if we find a consistent pattern
        }));
      }
    }
  }, [formData.mobileNo, members, invoices]);

  // Ensure plan is selected when plans load
  React.useEffect(() => {
    if (!formData.planId && plans.length > 0) {
      setFormData(prev => ({ ...prev, planId: plans[0].id }));
    }
  }, [plans, formData.planId]);

  const [memberSearchTerm, setMemberSearchTerm] = useState('');
  const [showMemberResults, setShowMemberResults] = useState(false);

  const searchedMembers = useMemo(() => {
    if (!memberSearchTerm || memberSearchTerm.trim().length === 0) return [];
    return members.filter(m => {
      if (!m) return false;
      const parentName = (m.parentName || '').toLowerCase();
      const childName = (m.childName || '').toLowerCase();
      const mobileNumber = m.mobileNumber || '';
      const id = (m.id || '').toLowerCase();
      const search = (memberSearchTerm || '').toLowerCase();
      return parentName.includes(search) ||
        childName.includes(search) ||
        mobileNumber.includes(memberSearchTerm) ||
        id.includes(search);
    });
  }, [members, memberSearchTerm]);

  const selectMember = (m: any) => {
    setFormData({
      ...formData,
      name: `${m.parentName} (${m.childName || 'Child'})`,
      mobileNo: m.mobileNumber,
      customerId: m.id
    });
    setMemberSearchTerm('');
    setShowMemberResults(false);
  };

  const [paymentMode, setPaymentMode] = useState<'cash' | 'upi' | 'card' | 'split'>('upi');
  const [isSuccess, setIsSuccess] = useState(false);
  const [lastInvoice, setLastInvoice] = useState<any>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  const selectedPlan = useMemo(() => {
    return plans.find(p => p.id === formData.planId) || plans[0];
  }, [formData.planId, plans]);

  const billingCalculations = useMemo(() => {
    if (!selectedPlan) return { totalBase: 0, totalGst: 0, totalAmount: 0, items: [] };

    const items: InvoiceItem[] = [];
    let totalBase = 0;
    let totalGst = 0;

    // 1. Plan Calculation
    let planTotal = selectedPlan.price * formData.personCount;
    let planBase = planTotal;
    let planGst = (planBase * selectedPlan.gstSlab) / 100;
    
    if (formData.isGstInclusive) {
      // If inclusive, price is the total. Derive base.
      planBase = planTotal / (1 + selectedPlan.gstSlab / 100);
      planGst = planTotal - planBase;
    }

    totalBase += planBase;
    totalGst += planGst;

    items.push({
      id: `ITEM-1`,
      description: `Plan: ${selectedPlan.title} (${formData.personCount} Person)`,
      type: 'service',
      quantity: formData.personCount,
      unitPrice: planBase / formData.personCount,
      gstSlab: selectedPlan.gstSlab as GSTSlab,
      amount: planBase + planGst
    });

    // 2. Socks Calculation
    Object.entries(formData.socksCounts).forEach(([typeId, val]) => {
      const count = Number(val);
      if (count <= 0) return;
      const type = socksTypes.find(t => t.id === parseInt(typeId));
      if (!type) return;

      const price = parseFloat(type.price);
      const gstSlab = parseInt(type.gstSlab || '5');

      let base = price * count;
      let gst = (base * gstSlab) / 100;
      
      if (formData.isGstInclusive) {
        const total = price * count;
        base = total / (1 + gstSlab / 100);
        gst = total - base;
      }

      totalBase += base;
      totalGst += gst;
      items.push({
        id: `SOCKS-${type.id}`,
        description: `${type.name} x ${count}`,
        type: 'product',
        quantity: count,
        unitPrice: base / count,
        gstSlab: gstSlab as GSTSlab,
        amount: base + gst
      });
    });

    // 3. Extra Services Calculation
    formData.extraServices.forEach(extra => {
      const service = services.find(s => s.id === extra.serviceId);
      if (service) {
        let base = service.price * extra.quantity;
        let gst = (base * service.gstSlab) / 100;

        if (formData.isGstInclusive) {
          const total = service.price * extra.quantity;
          base = total / (1 + service.gstSlab / 100);
          gst = total - base;
        }

        totalBase += base;
        totalGst += gst;
        items.push({
          id: service.id,
          description: `${service.name} x ${extra.quantity}`,
          type: 'service',
          quantity: extra.quantity,
          unitPrice: base / extra.quantity,
          gstSlab: service.gstSlab,
          amount: base + gst
        });
      }
    });

    return {
      totalBase,
      totalGst,
      totalAmount: Math.max(0, totalBase + totalGst - (formData.discount || 0)),
      discount: formData.discount || 0,
      items
    };
  }, [selectedPlan, formData.personCount, formData.socksCounts, formData.extraServices, formData.isGstInclusive, formData.discount, socksConfig, socksTypes, services]);

  const addExtraService = (serviceId: string) => {
    setFormData(prev => {
      const existing = prev.extraServices.find(s => s.serviceId === serviceId);
      if (existing) {
        return {
          ...prev,
          extraServices: prev.extraServices.map(s => s.serviceId === serviceId ? { ...s, quantity: s.quantity + 1 } : s)
        };
      }
      return {
        ...prev,
        extraServices: [...prev.extraServices, { serviceId, quantity: 1 }]
      };
    });
  };

  const removeExtraService = (serviceId: string) => {
    setFormData(prev => ({
      ...prev,
      extraServices: prev.extraServices.filter(s => s.serviceId !== serviceId)
    }));
  };

  const updateExtraServiceQty = (serviceId: string, qty: number) => {
    if (qty <= 0) return removeExtraService(serviceId);
    setFormData(prev => ({
      ...prev,
      extraServices: prev.extraServices.map(s => s.serviceId === serviceId ? { ...s, quantity: qty } : s)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;

    const invoiceData = {
      customerName: formData.name,
      mobileNumber: formData.mobileNo,
      date: new Date(),
      items: billingCalculations.items,
      totalBaseAmount: billingCalculations.totalBase,
      totalGST: billingCalculations.totalGst,
      totalAmount: billingCalculations.totalAmount,
      discount: billingCalculations.discount,
      paymentMode,
      status: 'paid' as const,
      type: 'walking' as const
    };

    // 1. Create Invoice
    const newInvoice = addInvoice(invoiceData);
    setLastInvoice(newInvoice);

    // 2. Add Entry for tracking
    addEntry({
      childName: formData.name, 
      parentName: formData.name,
      mobileNumber: formData.mobileNo,
      planId: selectedPlan.id,
      planName: selectedPlan.title,
      amount: billingCalculations.totalAmount,
      personCount: formData.personCount,
      socksCounts: formData.socksCounts,
      invoiceId: newInvoice.id,
      memberId: formData.registerAsMember ? formData.customerId : undefined,
      handledBy: handledBy
    });

    // 3. Register as member if requested
    if (formData.registerAsMember) {
      const isAlreadyMember = members.some(m => m.mobileNumber === formData.mobileNo);
      if (!isAlreadyMember) {
        addMember({
          parentName: formData.name,
          childName: formData.name,
          childAge: 5, // Default or prompt? simplified to 5 for now
          mobileNumber: formData.mobileNo,
          planId: selectedPlan.id,
          createdAt: new Date(),
        });
      }
    }
    
    setIsSuccess(true);
  };

  const handleWhatsAppNotify = () => {
    const message = `Welcome to ${businessProfile.name}! 🎡\n\nInv No: INVOICE_PENDING\nCustomer: ${formData.name}\nPlan: ${selectedPlan?.title}\nTotal: ${formatCurrency(billingCalculations.totalAmount)}\n\nHave fun! 🎠`;
    window.open(formatWhatsAppLink(formData.mobileNo, message), '_blank');
  };

  if (isSuccess) {
    return (
      <div className="max-w-6xl mx-auto py-10 space-y-8">
        <div className="flex flex-col items-center justify-center text-center">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center text-white mb-6 shadow-xl shadow-emerald-500/20"
          >
            <CheckCircle2 size={48} />
          </motion.div>
          <h2 className="text-3xl font-black text-slate-800 mb-2">Checkout Complete! 🥳</h2>
          <p className="text-slate-500 font-medium italic mb-2">Session is now active and invoice generated.</p>
          <div className="bg-slate-100 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-500 mb-8">
            Entry Time: {new Date().toLocaleTimeString()}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
            <div className="space-y-4">
              <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl overflow-hidden">
                 <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 border-b pb-4 flex items-center gap-2">
                   <Receipt size={16} className="text-emerald-500" /> Payment Receipt
                 </h4>
                 <ThermalReceipt invoice={lastInvoice} />
              </div>
            </div>
            
            <div className="space-y-4 flex flex-col justify-start">
               <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm mb-4">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Entry Detail</h4>
                  <div className="space-y-2">
                     <div className="flex justify-between">
                        <span className="text-slate-500 text-xs font-bold uppercase">Kid Name</span>
                        <span className="text-slate-800 text-sm font-black italic">{formData.name}</span>
                     </div>
                     <div className="flex justify-between">
                        <span className="text-slate-500 text-xs font-bold uppercase">Plan</span>
                        <span className="text-slate-800 text-sm font-black italic">{selectedPlan?.title}</span>
                     </div>
                     <div className="flex justify-between">
                        <span className="text-slate-500 text-xs font-bold uppercase">Time In</span>
                        <span className="text-emerald-600 text-sm font-black italic">{new Date().toLocaleTimeString()}</span>
                     </div>
                  </div>
               </div>

               <button 
                onClick={() => window.print()}
                className="w-full py-5 bg-white text-slate-800 font-black text-sm rounded-3xl border-2 border-slate-100 hover:bg-slate-50 transition-all flex items-center justify-center gap-3 uppercase tracking-widest shadow-xl shadow-slate-200/40"
              >
                <CheckCircle2 size={20} className="text-emerald-500" />
                Print Confirmation
              </button>
               <button 
                onClick={handleWhatsAppNotify}
                className="w-full py-5 bg-emerald-50 text-emerald-600 font-black text-sm rounded-3xl border-2 border-emerald-100 hover:bg-emerald-100 transition-all flex items-center justify-center gap-3 uppercase tracking-widest shadow-xl shadow-emerald-600/5"
              >
                <Send size={20} />
                Send via WhatsApp
              </button>
              <button 
                onClick={() => navigate('/tracking')}
                className="w-full py-5 bg-slate-900 text-white font-black text-sm rounded-3xl hover:bg-slate-800 transition-all flex items-center justify-center gap-3 uppercase tracking-widest"
              >
                Go to Tracking 🎡
              </button>
              <button 
                 onClick={() => {
                   setIsSuccess(false);
                   setFormData(prev => ({
                     ...prev,
                     customerId: 'CU' + Math.floor(Math.random() * 90000 + 10000),
                     name: '',
                     mobileNo: '',
                     personCount: 1,
                     socksCounts: {},
                     extraServices: [],
                     description: ''
                   }));
                 }}
                className="w-full py-4 text-slate-400 font-black text-xs hover:text-primary transition-all uppercase tracking-widest"
              >
                New Transaction
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-40 px-2 sm:px-0">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-3 bg-white rounded-2xl text-slate-500 hover:bg-slate-50 transition-all border border-slate-100"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight italic">Add Customer 🎡</h1>
            <p className="text-slate-500 font-medium">New Session Registration</p>
          </div>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        <div className="md:col-span-12 lg:col-span-8 space-y-8">
          {/* Quick Search Card */}
          <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] sm:rounded-[3rem] border border-slate-100 shadow-sm space-y-6 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-secondary to-primary opacity-50" />
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-secondary/10 rounded-2xl text-secondary">
                <User size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Customer Info</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Search or enter manually</p>
              </div>
            </div>

            <div className="relative group">
               <input 
                 type="text"
                 placeholder="Search Member by Name/Phone..."
                 value={memberSearchTerm}
                 onChange={e => {
                   setMemberSearchTerm(e.target.value);
                   setShowMemberResults(true);
                 }}
                 onFocus={() => setShowMemberResults(true)}
                 className="w-full pl-14 pr-5 py-5 bg-slate-50 border-2 border-slate-100 focus:border-secondary/30 focus:bg-white rounded-[2rem] transition-all outline-none font-bold text-base sm:text-lg shadow-sm"
               />
               <div className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-secondary text-white rounded-xl shadow-lg shadow-secondary/20">
                 <User size={20} />
               </div>
               <button 
                type="button"
                onClick={() => setShowMemberResults(true)}
                className="absolute right-4 top-1/2 -translate-y-1/2 px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-md"
               >
                 Search
               </button>
               <AnimatePresence>
                 {showMemberResults && searchedMembers.length > 0 && (
                   <motion.div 
                     initial={{ opacity: 0, y: 10 }}
                     animate={{ opacity: 1, y: 0 }}
                     exit={{ opacity: 0, y: 10 }}
                     className="absolute z-50 left-0 right-0 mt-3 bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden max-h-80 overflow-y-auto"
                   >
                     <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Found {searchedMembers.length} matches</span>
                       <button onClick={() => setShowMemberResults(false)} className="text-slate-400 hover:text-slate-600"><X size={14}/></button>
                     </div>
                     {searchedMembers.map(m => (
                       <button
                         key={m.id}
                         type="button"
                         onClick={() => selectMember(m)}
                         className="w-full text-left px-5 py-4 hover:bg-slate-50 transition-all border-b border-slate-50 last:border-0 flex items-center justify-between group"
                       >
                         <div className="flex-1 min-w-0 pr-4">
                           <p className="font-black text-slate-800 text-base sm:text-lg group-hover:text-primary transition-colors truncate">{m.parentName} ({m.childName || 'Child'})</p>
                           <p className="text-xs text-slate-400 font-bold">{m.mobileNumber} • {m.id}</p>
                         </div>
                         <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                           <Plus size={20} className="text-primary" />
                         </div>
                       </button>
                     ))}
                   </motion.div>
                 )}
               </AnimatePresence>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Customer ID</label>
                <div className="px-5 py-4 bg-slate-50 border-2 border-transparent rounded-2xl font-black text-primary italic flex items-center gap-2 text-sm">
                  <span className="opacity-50">#</span> {formData.customerId}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Customer Name</label>
                <input 
                  type="text" required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="Full Name"
                  className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl transition-all outline-none font-bold text-slate-700 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Handled By (Staff)</label>
                <select 
                  value={handledBy}
                  onChange={e => setHandledBy(e.target.value)}
                  className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-secondary/20 focus:bg-white rounded-2xl outline-none font-bold text-slate-700 text-sm"
                >
                  {staff.map(s => <option key={s.id} value={s.id}>{s.full_name} ({s.role})</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Mobile No.</label>
                <div className="relative">
                  <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input 
                    type="tel" required
                    maxLength={10}
                    value={formData.mobileNo}
                    onChange={e => setFormData({...formData, mobileNo: e.target.value})}
                    placeholder="9876543210"
                    className="w-full pl-12 pr-5 py-4 bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl transition-all outline-none font-bold text-slate-700 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pt-4">
               <label className="flex items-center gap-3 cursor-pointer group shrink-0">
                 <input 
                   type="checkbox"
                   checked={formData.registerAsMember}
                   onChange={e => setFormData({...formData, registerAsMember: e.target.checked})}
                   className="w-6 h-6 rounded-lg border-2 border-slate-200 checked:bg-primary accent-primary"
                 />
                 <div className="flex flex-col">
                   <span className="text-sm font-black text-slate-700 uppercase tracking-tight">Save as Member</span>
                   <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Loyalty benefits</span>
                 </div>
               </label>
               <div className="hidden sm:block h-10 w-px bg-slate-100" />
               <div className="w-full flex-1 space-y-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">No. of Person</label>
                 <div className="flex items-center gap-3 bg-slate-50 p-1.5 rounded-2xl">
                   <button 
                    type="button" 
                    onClick={() => setFormData(f => ({ ...f, personCount: Math.max(1, f.personCount - 1) }))}
                    className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm hover:bg-slate-100 transition-all font-black text-slate-600"
                   >-</button>
                   <input 
                     type="number" required
                     min="1"
                     value={formData.personCount}
                     onChange={e => setFormData({...formData, personCount: parseInt(e.target.value) || 1})}
                     className="flex-1 bg-transparent text-center outline-none font-black text-slate-800"
                   />
                   <button 
                    type="button" 
                    onClick={() => setFormData(f => ({ ...f, personCount: f.personCount + 1 }))}
                    className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm hover:bg-slate-100 transition-all font-black text-slate-600"
                   >+</button>
                 </div>
               </div>
            </div>
          </div>

          {/* Plan & Extra Services */}
          <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] sm:rounded-[3rem] border border-slate-100 shadow-sm space-y-8">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
              <div className="space-y-6 min-w-0">
                 <div className="flex items-center gap-3">
                   <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-500">
                     <Package size={20} />
                   </div>
                   <div>
                     <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Select Plan</h3>
                   </div>
                 </div>

                 <div className="space-y-4">
                   <div className="flex flex-col sm:flex-row xl:flex-col 2xl:flex-row gap-3">
                     <select 
                       value={formData.planId}
                       onChange={e => setFormData({...formData, planId: e.target.value})}
                       className="flex-1 min-w-0 px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500/20 focus:bg-white rounded-2xl outline-none font-bold text-slate-700 text-xs sm:text-sm"
                     >
                       <option value="">--Select Active Plan--</option>
                       {plans.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                     </select>
                     <button
                       type="button"
                       onClick={() => setFormData(f => ({...f, isGstInclusive: !f.isGstInclusive}))}
                       className={cn(
                         "px-5 py-4 sm:px-6 sm:py-0 xl:py-4 2xl:py-0 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 shrink-0",
                         formData.isGstInclusive 
                           ? "bg-secondary text-white border-secondary shadow-lg shadow-secondary/20" 
                           : "bg-white text-slate-400 border-slate-100"
                       )}
                     >
                       {formData.isGstInclusive ? "Inclusive" : "Add GST"}
                     </button>
                   </div>

                   {selectedPlan && (
                     <motion.div 
                       initial={{ opacity: 0, y: 10 }}
                       animate={{ opacity: 1, y: 0 }}
                       className="bg-indigo-50/50 border border-indigo-100 p-5 sm:p-6 rounded-[2rem] space-y-4 shadow-sm"
                     >
                       <div className="flex justify-between items-center text-[8px] sm:text-[10px]">
                          <span className="font-black text-indigo-500 uppercase tracking-widest">Plan Info</span>
                          <span className="px-3 py-1 bg-indigo-500 text-white font-black rounded-full uppercase italic tracking-tighter shadow-sm">{selectedPlan.type}</span>
                       </div>
                       <div className="grid grid-cols-2 gap-4 sm:gap-6">
                          <div>
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Price Unit</span>
                            <p className="text-lg sm:text-2xl font-black text-slate-800">{formatCurrency(selectedPlan.price)}</p>
                          </div>
                          <div>
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Duration</span>
                            <p className="text-lg sm:text-2xl font-black text-slate-800">{selectedPlan.validationTimeMin} Min</p>
                          </div>
                       </div>
                     </motion.div>
                   )}
                 </div>
              </div>

              <div className="space-y-6 min-w-0">
                 <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                     <div className="p-3 bg-amber-50 rounded-2xl text-amber-500">
                       <Plus size={20} />
                     </div>
                     <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Extras</h3>
                   </div>
                   <select 
                      onChange={(e) => {
                        if (e.target.value) {
                          addExtraService(e.target.value);
                          e.target.value = '';
                        }
                      }}
                      className="text-[10px] font-black bg-slate-100 rounded-xl px-4 py-2 outline-none border-none cursor-pointer hover:bg-slate-200 transition-colors"
                   >
                     <option value="">+ Add Item</option>
                     {services.map(s => (
                       <option key={s.id} value={s.id}>{s.name} (₹{s.price})</option>
                     ))}
                   </select>
                 </div>
                 
                 <div className="max-h-[300px] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                   {formData.extraServices.length === 0 && (
                     <div className="py-8 sm:py-12 text-center bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
                       <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No extras added</p>
                     </div>
                   )}
                   {formData.extraServices.map(extra => {
                     const service = services.find(s => s.id === extra.serviceId);
                     if (!service) return null;
                     return (
                       <div key={extra.serviceId} className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-sm group hover:border-amber-200 transition-all">
                         <div className="min-w-0 flex-1 pr-2">
                           <p className="font-black text-slate-800 text-xs italic truncate">{service.name}</p>
                           <p className="text-[10px] font-bold text-slate-400 uppercase">Unit: ₹{service.price}</p>
                         </div>
                         <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                           <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-50 p-1 rounded-xl">
                              <button type="button" onClick={() => updateExtraServiceQty(extra.serviceId, extra.quantity - 1)} className="w-7 h-7 flex items-center justify-center font-bold text-slate-400 hover:text-amber-500 hover:bg-white rounded-lg transition-all text-xs">-</button>
                              <span className="font-black text-xs min-w-[15px] text-center">{extra.quantity}</span>
                              <button type="button" onClick={() => updateExtraServiceQty(extra.serviceId, extra.quantity + 1)} className="w-7 h-7 flex items-center justify-center font-bold text-slate-400 hover:text-amber-500 hover:bg-white rounded-lg transition-all text-xs">+</button>
                           </div>
                           <button type="button" onClick={() => removeExtraService(extra.serviceId)} className="text-slate-300 hover:text-red-500 transition-colors">
                             <Trash2 size={16} />
                           </button>
                         </div>
                       </div>
                     );
                   })}
                 </div>
              </div>
            </div>

            <div className="pt-8 border-t border-slate-100">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Special Notes</label>
               <textarea 
                 value={formData.description}
                 onChange={e => setFormData({...formData, description: e.target.value})}
                 className="w-full mt-2 px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-slate-200 focus:bg-white rounded-[2rem] outline-none font-medium h-32 resize-none transition-all text-sm"
                 placeholder="Any dietary restrictions, medical notes, etc..."
               />
             </div>
          </div>
        </div>

        <div className="md:col-span-12 lg:col-span-4 space-y-8 sticky top-24">
          <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] sm:rounded-[3rem] border border-slate-100 shadow-sm space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                <Package size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Socks Stock</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Inventory Management</p>
              </div>
            </div>
            
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {socksTypes.map(type => (
                <div key={type.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between group hover:border-primary/20 transition-all">
                  <div className="min-w-0 pr-2">
                    <h4 className="font-black text-slate-800 text-[11px] leading-tight truncate">{type.name}</h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">₹{type.price}</p>
                  </div>
                  <div className="flex items-center gap-2 bg-white p-1 rounded-xl shadow-sm border border-slate-100 shrink-0">
                    <button 
                      type="button" 
                      onClick={() => setFormData(f => ({
                        ...f, 
                        socksCounts: { ...f.socksCounts, [type.id]: Math.max(0, (f.socksCounts[type.id] || 0) - 1) }
                      }))} 
                      className="w-8 h-8 flex items-center justify-center font-black text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    >-</button>
                    <span className="font-black text-xs w-6 text-center">{formData.socksCounts[type.id] || 0}</span>
                    <button 
                      type="button" 
                      onClick={() => setFormData(f => ({
                        ...f, 
                        socksCounts: { ...f.socksCounts, [type.id]: (f.socksCounts[type.id] || 0) + 1 }
                      }))} 
                      className="w-8 h-8 flex items-center justify-center font-black text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all"
                    >+</button>
                  </div>
                </div>
              ))}
              {socksTypes.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-[10px] text-slate-300 italic">No socks configured</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-900 text-white p-8 rounded-[3rem] shadow-2xl relative overflow-hidden border border-white/5">
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-primary/20 blur-[60px]" />
            <div className="relative z-10 space-y-6">
              <h3 className="text-lg font-black flex items-center gap-2 italic">
                <Receipt size={20} className="text-primary" /> Order Summary
              </h3>
              
              <div className="space-y-3">
                {billingCalculations.items.map(item => (
                  <div key={item.id} className="flex justify-between text-slate-400 font-bold text-[10px] uppercase tracking-wider">
                    <span className="truncate pr-4">{item.description}</span>
                    <span className="shrink-0">{formatCurrency(item.amount)}</span>
                  </div>
                ))}
                <div className="h-px bg-white/10 my-4" />
                <div className="flex justify-between text-slate-400 font-bold text-sm">
                   <span>Taxable Amount</span>
                   <span>{formatCurrency(billingCalculations.totalBase)}</span>
                </div>
                <div className="flex justify-between text-slate-400 font-bold text-sm">
                   <span>CGST + SGST</span>
                   <span>{formatCurrency(billingCalculations.totalGst)}</span>
                </div>
                {billingCalculations.discount > 0 && (
                  <div className="flex justify-between text-red-400 font-bold text-sm">
                    <span>Discount</span>
                    <span>-{formatCurrency(billingCalculations.discount)}</span>
                  </div>
                )}
                <div className="h-px bg-white/10 my-4" />
                <div className="flex justify-between items-end">
                  <span className="text-slate-400 font-black text-xs uppercase tracking-widest pb-1">Total Bill</span>
                  <span className="text-4xl font-black text-primary">{formatCurrency(billingCalculations.totalAmount)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] sm:rounded-[3rem] border border-slate-100 shadow-sm space-y-6">
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <CreditCard size={20} className="text-accent" /> Payment Mode
            </h3>
            
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'upi', label: 'UPI / QR', icon: QrCode },
                { id: 'cash', label: 'Cash', icon: Banknote },
              ].map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setPaymentMode(mode.id as any)}
                  className={cn(
                    "flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-2",
                    paymentMode === mode.id 
                      ? "border-accent bg-accent/5 text-accent" 
                      : "border-slate-50 text-slate-400 hover:bg-slate-50"
                  )}
                >
                  <mode.icon size={24} />
                  <span className="text-[10px] font-black uppercase tracking-widest">{mode.label}</span>
                </button>
              ))}
            </div>

            <div className="pt-4 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Special Discount (₹)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-900 font-black">₹</span>
                  <input 
                    type="number"
                    min="0"
                    value={formData.discount}
                    onChange={e => setFormData({...formData, discount: parseFloat(e.target.value) || 0})}
                    className="w-full pl-10 pr-5 py-3 bg-slate-50 border-2 border-transparent focus:border-accent/20 focus:bg-white rounded-2xl outline-none font-bold text-slate-800 text-sm"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <button 
                type="submit"
                className="w-full py-5 gradient-primary text-white font-black text-xl rounded-[2rem] shadow-xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all"
              >
                Checkout ✅
              </button>
              <button 
                type="button"
                onClick={handleWhatsAppNotify}
                disabled={!formData.mobileNo}
                className="w-full py-4 bg-emerald-50 text-emerald-600 font-black text-xs rounded-2xl border-2 border-emerald-100 hover:bg-emerald-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50 uppercase tracking-widest"
              >
                <Send size={16} />
                Notify on WhatsApp
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Invoices History */}
      <div className="mt-12 bg-white rounded-[3rem] p-8 border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-black text-slate-800 italic">Recent Bills 🧾</h2>
          <button 
            onClick={() => refreshData()}
            className="p-2 text-slate-400 hover:text-primary transition-colors"
            title="Refresh"
          >
            <RefreshCw size={18} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                <th className="pb-4 px-4">Invoice No</th>
                <th className="pb-4 px-4">Customer</th>
                <th className="pb-4 px-4">Mode</th>
                <th className="pb-4 px-4">Amount</th>
                <th className="pb-4 px-4">Date</th>
                <th className="pb-4 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {invoices.slice(0, 10).map((inv) => (
                <tr key={inv.id} className="group hover:bg-slate-50/50 transition-all">
                  <td className="py-4 px-4 font-bold text-slate-600 text-sm">{inv.invoiceNumber}</td>
                  <td className="py-4 px-4">
                    <p className="font-black text-slate-800 text-sm leading-none italic">{inv.customerName}</p>
                    <p className="text-[10px] font-bold text-slate-400 mt-1">{inv.mobileNumber}</p>
                  </td>
                  <td className="py-4 px-4">
                    <span className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-black uppercase text-slate-600">
                      {inv.paymentMode}
                    </span>
                  </td>
                  <td className="py-4 px-4 font-black text-slate-800 tracking-tight">
                    {formatCurrency(inv.totalAmount)}
                  </td>
                  <td className="py-4 px-4 text-slate-500 text-[10px] font-bold">
                    {new Date(inv.date).toLocaleDateString()}
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                       <button 
                        onClick={() => setSelectedInvoice(inv)}
                        className="p-2 text-slate-300 hover:text-primary transition-colors"
                       >
                         <Printer size={16} />
                       </button>
                       {isAdmin && (
                         <button 
                          onClick={() => {
                            if (window.confirm('Are you sure you want to delete this bill?')) {
                              deleteInvoice(inv.id);
                            }
                          }}
                          className="p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                         >
                           <Trash2 size={16} />
                         </button>
                       )}
                    </div>
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <p className="text-slate-400 font-bold italic">No bills yet today 🎢</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
    </div>
  );
}
