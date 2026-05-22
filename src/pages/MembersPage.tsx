import React, { useState, useMemo } from 'react';
import { usePlayZone } from '../hooks/usePlayZone';
import { 
  Users, 
  Search, 
  Plus, 
  ChevronRight, 
  Phone, 
  Calendar,
  CreditCard,
  Filter,
  CheckCircle2,
  AlertCircle,
  Download,
  Upload,
  X,
  MessageCircle,
  FileText,
  Printer,
  Trash2,
  Edit
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatWhatsAppLink } from '../lib/utils';
import ThermalReceipt from '../components/ThermalReceipt';
import { Invoice } from '../types';

export default function MembersPage() {
  const { members, plans, addMember, updateMember, deleteMember, addInvoice, importBulkData, exportToCSV, entries, invoices, exportToCSV: exportCSV, businessProfile, isAdmin } = usePlayZone();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired'>('all');
  const [isAdding, setIsAdding] = useState(false);
  const [editingMember, setEditingMember] = useState<any>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  
  const selectedMemberHistory = useMemo(() => {
    if (!selectedMemberId) return { entries: [], invoices: [] };
    const member = members.find(m => m.id === selectedMemberId);
    if (!member) return { entries: [], invoices: [] };

    // Find entries that match the member's phone number or name
    const memberEntries = entries.filter(e => 
      e.mobileNumber === member.mobileNumber
    );
    const memberInvoices = invoices.filter(inv => 
      inv.mobileNumber === member.mobileNumber
    );

    return { entries: memberEntries, invoices: memberInvoices };
  }, [selectedMemberId, members, entries, invoices]);

  const [formData, setFormData] = useState({
    parentName: '',
    childName: '',
    childAge: '',
    mobileNumber: '',
    planId: plans.find(p => p.type === 'subscription' || p.type === 'monthly')?.id || (plans.length > 0 ? plans[plans.length-1].id : ''),
    medicalNotes: ''
  });

  const filteredMembers = (members || []).filter(m => {
    if (!m) return false;
    const parentName = (m.parentName || '').toLowerCase();
    const childName = (m.childName || '').toLowerCase();
    const mobileNo = m.mobileNumber || '';
    const search = (searchTerm || '').toLowerCase();

    const matchesSearch = parentName.includes(search) ||
                         childName.includes(search) ||
                         mobileNo.includes(searchTerm);
    
    const plan = plans.find(p => p.id === m.planId);
    const validationDays = plan?.validationDays || 0;
    const createdAt = m.createdAt ? new Date(m.createdAt) : new Date();
    const expiryDate = new Date(createdAt);
    expiryDate.setDate(expiryDate.getDate() + validationDays);
    
    const isExpired = validationDays > 0 && expiryDate < new Date();
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && !isExpired) || 
                         (statusFilter === 'expired' && isExpired);

    return matchesSearch && matchesStatus;
  });

  const handleExportMembers = () => {
    const dataToExport = members.map(m => {
      const plan = plans.find(p => p.id === m.planId);
      const validationDays = plan?.validationDays || 0;
      const createdAt = m.createdAt ? new Date(m.createdAt) : new Date();
      const expiryDate = new Date(createdAt);
      expiryDate.setDate(expiryDate.getDate() + validationDays);

      return {
        ID: m.id,
        ChildName: m.childName,
        ParentName: m.parentName,
        Phone: m.mobileNumber,
        Age: m.childAge,
        CreatedAt: createdAt.toLocaleDateString(),
        ExpiryDate: validationDays > 0 ? expiryDate.toLocaleDateString() : 'Never',
        Notes: m.medicalNotes || ''
      };
    });
    exportCSV(dataToExport, 'FunkyLand_Members');
  };

  const handlePrintMembers = () => {
    window.print();
  };

  const handleWhatsAppContact = (member: any) => {
    const message = `Hello ${member.parentName}, this is ${businessProfile.name}! We're thinking of ${member.childName} today. Hope you're doing great! 🎡`;
    window.open(formatWhatsAppLink(member.mobileNumber, message), '_blank');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (confirm('This will merge/overwrite existing data. Continue?')) {
          importBulkData(data);
          alert('Data imported successfully!');
        }
      } catch (err) {
        alert('Invalid backup file.');
      }
    };
    reader.readAsText(file);
  };

  const startEditMember = (member: any) => {
    setEditingMember(member);
    setFormData({
      parentName: member.parentName,
      childName: member.childName || '',
      childAge: (member.childAge || '').toString(),
      mobileNumber: member.mobileNumber,
      planId: member.planId || '',
      medicalNotes: member.medicalNotes || ''
    });
    setIsAdding(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const selectedPlan = plans.find(p => p.id === formData.planId) || plans[0];
    const baseAmount = selectedPlan?.price || 0;
    const gstAmount = (baseAmount * (selectedPlan?.gstSlab || 0)) / 100;
    const totalAmount = baseAmount + gstAmount;

    if (editingMember) {
      updateMember(editingMember.id, {
        parentName: formData.parentName,
        childName: formData.childName,
        childAge: parseInt(formData.childAge),
        mobileNumber: formData.mobileNumber,
        planId: formData.planId,
        medicalNotes: formData.medicalNotes,
      });
      setEditingMember(null);
    } else {
      addMember({
        parentName: formData.parentName,
        childName: formData.childName,
        childAge: parseInt(formData.childAge),
        mobileNumber: formData.mobileNumber,
        planId: formData.planId,
        medicalNotes: formData.medicalNotes,
        createdAt: new Date(),
      });

      addInvoice({
        customerName: formData.parentName,
        mobileNumber: formData.mobileNumber,
        date: new Date(),
        items: [{
          id: 'MEM-SUB',
          description: `Membership Registration: ${selectedPlan?.title || 'Subscription'}`,
          type: 'service',
          quantity: 1,
          unitPrice: baseAmount,
          gstSlab: (selectedPlan?.gstSlab || 18) as any,
          amount: totalAmount
        }],
        totalBaseAmount: baseAmount,
        totalGST: gstAmount,
        totalAmount: totalAmount,
        paymentMode: 'upi',
        status: 'paid',
        type: 'member'
      });
    }

    setIsAdding(false);
    setFormData({
      parentName: '',
      childName: '',
      childAge: '',
      mobileNumber: '',
      planId: plans.find(p => p.type === 'subscription' || p.type === 'monthly')?.id || (plans.length > 0 ? plans[plans.length-1].id : ''),
      medicalNotes: ''
    });
  };

  return (
    <div className="space-y-8 pb-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight italic">Family Members ✨</h1>
          <p className="text-slate-500 font-medium">Manage your loyal Funky Land subscribers</p>
        </div>
        <div className="flex items-center gap-3 no-print">
          <button 
            onClick={handlePrintMembers}
            className="p-4 bg-white border border-slate-100 text-slate-400 rounded-2xl shadow-sm hover:text-primary transition-all"
            title="Print Members List"
          >
            <FileText size={18} />
          </button>
          {isAdmin && (
            <>
              <label className="hidden sm:flex items-center gap-2 px-6 py-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:bg-slate-50 transition-all font-black text-slate-600 cursor-pointer text-xs">
                <Upload size={18} />
                Import
                <input type="file" accept=".json" onChange={handleImport} className="hidden" />
              </label>
              <button 
                onClick={handleExportMembers}
                className="hidden sm:flex items-center gap-2 px-6 py-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:bg-slate-50 transition-all font-black text-slate-600 text-xs"
              >
                <Download size={18} />
                Excel
              </button>
              <button 
                onClick={() => setIsAdding(true)}
                className="inline-flex items-center gap-2 px-6 py-4 gradient-secondary text-white font-black rounded-2xl shadow-xl shadow-secondary/20 hover:scale-105 active:scale-95 transition-all text-sm"
              >
                <Plus size={20} />
                Add Member
              </button>
            </>
          )}
        </div>
      </header>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 group">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-secondary/10 text-secondary rounded-xl group-focus-within:bg-secondary group-focus-within:text-white transition-all">
            <Search size={20} />
          </div>
          <input 
            type="text"
            placeholder="Search by name, phone or ID..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-14 pr-32 py-4 bg-white border border-slate-100 rounded-[1.5rem] shadow-sm focus:ring-4 focus:ring-secondary/10 focus:border-secondary outline-none transition-all font-bold text-slate-700"
          />
          <button 
            type="button"
            onClick={() => setSearchTerm(searchTerm)}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2.5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg active:scale-95"
          >
            Search
          </button>
        </div>
        <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl">
          {['all', 'active', 'expired'].map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f as any)}
              className={cn(
                "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                statusFilter === f ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredMembers.map((member, i) => {
            const plan = plans.find(p => p.id === member.planId);
            const validationDays = plan?.validationDays || 0;
            const createdAt = member.createdAt ? new Date(member.createdAt) : new Date();
            const expiryDate = new Date(createdAt);
            expiryDate.setDate(expiryDate.getDate() + validationDays);
            const isExpired = validationDays > 0 && expiryDate < new Date();
            
            return (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all overflow-hidden group"
              >
                <div className="p-6 space-y-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl gradient-accent flex items-center justify-center text-white shadow-lg shadow-accent/20">
                        <Users size={28} />
                      </div>
                      <div>
                        <h3 className="font-black text-slate-800 text-lg leading-tight">{member.childName || 'Child'}</h3>
                        <p className="text-sm text-slate-400 font-bold uppercase tracking-tight">{member.parentName}</p>
                      </div>
                    </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                          isExpired ? "bg-red-100 text-red-500" : "bg-emerald-100 text-emerald-600"
                        )}>
                          {isExpired ? 'Expired' : 'Active'}
                        </div>
                        <div className="flex gap-2 no-print">
                          <button 
                            onClick={() => handleWhatsAppContact(member)}
                            className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-500 hover:text-white transition-all"
                            title="WhatsApp Contact"
                          >
                            <MessageCircle size={14} />
                          </button>
                          {isAdmin && (
                            <>
                              <button 
                                onClick={() => startEditMember(member)}
                                className="p-2 bg-primary/10 text-primary rounded-xl hover:bg-primary hover:text-white transition-all shadow-sm"
                                title="Edit Member"
                              >
                                <Edit size={14} />
                              </button>
                              <button 
                                onClick={() => {
                                  if (confirm(`Are you sure you want to delete ${member.childName}? this cannot be undone.`)) {
                                    deleteMember(member.id);
                                  }
                                }}
                                className="p-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                                title="Delete Member"
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                  <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-3 text-slate-500 font-medium text-sm">
                      <Phone size={16} className="text-secondary" />
                      <span>{member.mobileNumber}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-500 font-medium text-sm">
                      <Calendar size={16} className="text-secondary" />
                      <span>Expires: {validationDays > 0 ? expiryDate.toLocaleDateString() : 'Never'}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-500 font-medium text-sm">
                      <CreditCard size={16} className="text-secondary" />
                      <span>Plan: {plan?.title || 'Unknown'}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 flex items-center justify-between border-t border-slate-100">
                  <button 
                    onClick={() => setSelectedMemberId(member.id)}
                    className="text-xs font-black text-secondary uppercase tracking-widest hover:underline"
                  >
                    View History
                  </button>
                  <button 
                    onClick={() => setSelectedMemberId(member.id)}
                    className="p-2 bg-white rounded-xl text-slate-400 group-hover:text-secondary group-hover:bg-secondary/10 transition-all shadow-sm"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filteredMembers.length === 0 && (
          <div className="col-span-full py-20 text-center bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
            <Users size={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-xl font-black text-slate-400">No members found...</h3>
            <p className="text-slate-400 text-sm font-medium italic">Try adjusting your search or add a new member!</p>
          </div>
        )}
      </div>

      {/* Add Member Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAdding(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl p-8 overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 gradient-secondary" />
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                  {editingMember ? <Edit className="text-secondary" size={28} /> : <Plus className="text-secondary" size={28} />} 
                  {editingMember ? 'Edit Member Details' : 'New Member Enrollment'}
                </h2>
                <button onClick={() => { setIsAdding(false); setEditingMember(null); }} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
                  <X />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Parent Name</label>
                    <input 
                      type="text" required
                      value={formData.parentName}
                      onChange={e => setFormData({...formData, parentName: e.target.value})}
                      className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent focus:border-secondary/20 focus:bg-white rounded-2xl transition-all outline-none font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Mobile Number</label>
                    <input 
                      type="tel" required
                      value={formData.mobileNumber}
                      onChange={e => setFormData({...formData, mobileNumber: e.target.value})}
                      className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent focus:border-secondary/20 focus:bg-white rounded-2xl transition-all outline-none font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Child Name</label>
                    <input 
                      type="text" required
                      value={formData.childName}
                      onChange={e => setFormData({...formData, childName: e.target.value})}
                      className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent focus:border-secondary/20 focus:bg-white rounded-2xl transition-all outline-none font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Child Age</label>
                    <input 
                      type="number" required
                      value={formData.childAge}
                      onChange={e => setFormData({...formData, childAge: e.target.value})}
                      className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent focus:border-secondary/20 focus:bg-white rounded-2xl transition-all outline-none font-medium"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Select Plan</label>
                    <select 
                      value={formData.planId}
                      onChange={e => setFormData({...formData, planId: e.target.value})}
                      className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent focus:border-secondary/20 focus:bg-white rounded-2xl transition-all outline-none font-medium appearance-none"
                    >
                      <option value="">-- Select Plan --</option>
                      {plans.map(p => (
                        <option key={p.id} value={p.id}>{p.title} - ₹{p.price}</option>
                      ) )}
                    </select>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setIsAdding(false)}
                    className="flex-1 py-4 bg-slate-100 text-slate-500 font-black rounded-2xl hover:bg-slate-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-[2] py-4 gradient-secondary text-white font-black text-lg rounded-2xl shadow-xl shadow-secondary/20 hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    {editingMember ? 'Update Member' : 'Confirm Registration 🌈'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Member History Drawer */}
      <AnimatePresence>
        {selectedMemberId && (
          <div className="fixed inset-0 z-[60] flex justify-end">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setSelectedMemberId(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col"
            >
               <div className="p-8 border-b border-slate-100 flex items-center justify-between gradient-secondary text-white">
                  <div>
                    <h3 className="text-xl font-black italic">Activity History</h3>
                    <p className="text-xs font-bold opacity-80 uppercase tracking-widest">
                       {members.find(m => m.id === selectedMemberId)?.childName}'s Profile
                    </p>
                  </div>
                  <button 
                    onClick={() => setSelectedMemberId(null)}
                    className="p-2 hover:bg-white/20 rounded-full transition-colors"
                  >
                    <X size={24} />
                  </button>
               </div>

               <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8">
                  <section className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                       <Calendar size={14} /> Visit Log
                    </h4>
                    <div className="space-y-3">
                       {selectedMemberHistory.entries.length > 0 ? selectedMemberHistory.entries.map(e => (
                         <div key={e.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
                            <div>
                               <p className="font-black text-slate-800 text-sm">{new Date(e.startTime).toLocaleDateString()}</p>
                               <p className="text-[10px] text-slate-400 font-bold italic">{e.planName}</p>
                            </div>
                            <span className="text-xs font-black text-slate-600">₹{e.amount}</span>
                         </div>
                       )) : (
                         <p className="text-xs text-slate-400 italic">No visits recorded yet.</p>
                       )}
                    </div>
                  </section>

                  <section className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                       <CreditCard size={14} /> Payment History
                    </h4>
                    <div className="space-y-3">
                       {selectedMemberHistory.invoices.length > 0 ? selectedMemberHistory.invoices.map(inv => (
                         <div key={inv.id} className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 flex justify-between items-center group/inv">
                            <div>
                               <p className="font-black text-slate-800 text-sm italic">{inv.invoiceNumber}</p>
                               <p className="text-[10px] text-emerald-600 font-bold uppercase">{inv.paymentMode} • {new Date(inv.date).toLocaleDateString()}</p>
                            </div>
                            <div className="flex items-center gap-2">
                               <button 
                                 onClick={() => setSelectedInvoice(inv)}
                                 className="p-2 bg-white text-emerald-600 rounded-lg shadow-sm opacity-0 group-hover/inv:opacity-100 transition-all hover:bg-emerald-600 hover:text-white"
                                 title="Print Invoice"
                               >
                                 <Printer size={14} />
                               </button>
                               <span className="font-black text-slate-800">₹{inv.totalAmount}</span>
                            </div>
                         </div>
                       )) : (
                         <p className="text-xs text-slate-400 italic">No invoices found.</p>
                       )}
                    </div>
                  </section>
               </div>
               
               <div className="p-8 border-t border-slate-100">
                  <button 
                    onClick={() => {
                      const m = members.find(m => m.id === selectedMemberId);
                      if (m) {
                        // Navigate to POS with this member selected
                        // This requires redirecting to billing with a member ID
                        // For now we just close and show a toast maybe
                        setSelectedMemberId(null);
                        alert('To start a session for this member, use the Search Member feature in the POS page.');
                      }
                    }}
                    className="w-full py-4 gradient-secondary text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-secondary/20 hover:scale-105 active:scale-95 transition-all"
                  >
                    Start New Session 🎠
                  </button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Invoice Modal Overlay */}
      <AnimatePresence>
        {selectedInvoice && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
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
                <h3 className="text-xl font-black text-slate-800 italic">Subscription Receipt</h3>
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
