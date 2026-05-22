import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { usePlayZone } from '../hooks/usePlayZone';
import { 
  Plus, 
  Trash2, 
  Settings, 
  Clock, 
  Calendar, 
  Tag, 
  FileText,
  IndianRupee,
  Package,
  X,
  CheckCircle2,
  Footprints,
  Edit,
  Save,
  Building2,
  Mail,
  Phone,
  MapPin,
  Users,
  UserCheck,
  Code2
} from 'lucide-react';

import { motion, AnimatePresence } from 'motion/react';
import { formatCurrency, cn } from '../lib/utils';
import { GSTSlab, PlanType, SocksConfig, BusinessProfile, StaffMember } from '../types';

export default function PlansPage() {
  const { 
    plans, 
    addPlan, 
    updatePlan,
    deletePlan, 
    socksConfig, 
    updateSocksConfig,
    socksTypes,
    addSocksType,
    updateSocksType,
    deleteSocksType,
    businessProfile,
    updateBusinessProfile,
    staff,
    addStaff,
    updateStaff,
    deleteStaff,
    isAdmin
  } = usePlayZone();
  const [isAdding, setIsAdding] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [isAddingStaff, setIsAddingStaff] = useState(false);
  
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  
  const [tempSocksConfig, setTempSocksConfig] = useState<SocksConfig>(socksConfig);
  const [tempBusinessProfile, setTempBusinessProfile] = useState<BusinessProfile>(businessProfile);

  const [editingSocksType, setEditingSocksType] = useState<any | null>(null);
  const [socksEditFormData, setSocksEditFormData] = useState({ name: '', price: '', gstSlab: '5' });
  const [socksToDelete, setSocksToDelete] = useState<any | null>(null);

  const [staffFormData, setStaffFormData] = useState({
    id: '',
    full_name: '',
    role: 'cashier' as any,
    phone: '',
    password: '',
    status: 'active' as any
  });

  const handleStaffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    
    if (editingStaff) {
      updateStaff(editingStaff.id, {
        full_name: staffFormData.full_name,
        role: staffFormData.role,
        phone: staffFormData.phone,
        password: staffFormData.password,
        status: staffFormData.status
      });
      setEditingStaff(null);
    } else {
      addStaff({
        ...staffFormData,
      });
    }
    
    setIsAddingStaff(false);
    setStaffFormData({ id: '', full_name: '', role: 'cashier', phone: '', password: '', status: 'active' });
  };

  const startEditingStaff = (member: StaffMember) => {
    setEditingStaff(member);
    setStaffFormData({
      id: member.id,
      full_name: member.full_name,
      role: member.role,
      phone: member.phone,
      password: member.password || '',
      status: member.status
    });
    setIsAddingStaff(true);
  };

  useEffect(() => {
    if (socksConfig) setTempSocksConfig(prev => ({ ...prev, ...socksConfig }));
  }, [socksConfig]);

  useEffect(() => {
    if (businessProfile) setTempBusinessProfile(prev => ({ ...prev, ...businessProfile }));
  }, [businessProfile]);

  const handleSocksUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    updateSocksConfig(tempSocksConfig);
    alert('Socks pricing updated successfully!');
  };

  const handleProfileUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    updateBusinessProfile(tempBusinessProfile);
    alert('Business profile updated successfully!');
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setTempBusinessProfile(prev => ({ ...prev, logo: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const [formData, setFormData] = useState({
    id: 'PL' + Math.floor(Math.random() * 9000 + 1000),
    title: '',
    price: '',
    validationDays: '0',
    validationTimeMin: '60',
    gstSlab: '18',
    type: 'hourly' as PlanType,
    description: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    
    if (editingPlan) {
      updatePlan(editingPlan.id, {
        title: formData.title,
        price: parseFloat(formData.price),
        validationTimeMin: parseInt(formData.validationTimeMin),
        validationDays: parseInt(formData.validationDays),
        gstSlab: parseInt(String(formData.gstSlab)) as GSTSlab,
        type: formData.type,
      });
      setEditingPlan(null);
    } else {
      addPlan({
        id: formData.id,
        title: formData.title,
        price: parseFloat(formData.price),
        validationTimeMin: parseInt(formData.validationTimeMin),
        validationDays: parseInt(formData.validationDays),
        gstSlab: parseInt(String(formData.gstSlab)) as GSTSlab,
        type: formData.type,
      });
    }
    
    setIsAdding(false);
    setFormData({
      id: 'PL' + Math.floor(Math.random() * 9000 + 1000),
      title: '',
      price: '',
      validationDays: '0',
      validationTimeMin: '60',
      gstSlab: '18',
      type: 'hourly',
      description: ''
    });
  };

  const startEditing = (plan: any) => {
    if (!plan) return;
    setEditingPlan(plan);
    setFormData({
      id: plan.id?.toString() || '',
      title: plan.title || '',
      price: (plan.price ?? '').toString(),
      validationDays: (plan.validationDays ?? '0').toString(),
      validationTimeMin: (plan.validationTimeMin ?? '60').toString(),
      gstSlab: (plan.gstSlab ?? '18').toString(),
      type: plan.type || 'hourly',
      description: plan.description || ''
    });
    setIsAdding(true);
  };

  const [isAddingSocks, setIsAddingSocks] = useState(false);
  const [socksFormData, setSocksFormData] = useState({
    name: '',
    price: '',
    gstSlab: '5' as any
  });

  const handleSocksSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedPrice = parseFloat(socksFormData.price);
    if (!isNaN(parsedPrice)) {
      addSocksType({ 
        name: socksFormData.name, 
        price: parsedPrice, 
        gstSlab: parseInt(socksFormData.gstSlab) as GSTSlab
      });
      setIsAddingSocks(false);
      setSocksFormData({ name: '', price: '', gstSlab: '5' });
    } else {
      alert('Invalid price');
    }
  };

  const handleSocksEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedPrice = parseFloat(socksEditFormData.price);
    if (editingSocksType && !isNaN(parsedPrice)) {
      updateSocksType(editingSocksType.id, {
        name: socksEditFormData.name,
        price: parsedPrice,
        gstSlab: parseInt(socksEditFormData.gstSlab) as GSTSlab
      });
      setEditingSocksType(null);
    } else {
      alert('Invalid price');
    }
  };

  return (
    <div className="space-y-8 pb-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight italic">Plan Management ⚙️</h1>
          <p className="text-slate-500 font-medium">Configure play packages and memberships</p>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <Link 
              to="/database"
              className="inline-flex items-center gap-2 px-6 py-4 bg-slate-900 text-white font-black rounded-2xl shadow-xl shadow-slate-900/20 hover:scale-105 active:scale-95 transition-all"
            >
              <Code2 size={20} />
              SQL TERMINAL
            </Link>
          )}
          {isAdmin && (
            <button 
              onClick={() => setIsAdding(true)}
              className="inline-flex items-center gap-2 px-6 py-4 gradient-primary text-white font-black rounded-2xl shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
            >
              <Plus size={20} />
              ADD PLAN
            </button>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans?.filter(p => p && p.id).map((plan) => (
          <motion.div 
            key={plan.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[2rem] border border-slate-100 p-6 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden"
          >
            <div className="flex justify-between items-start mb-6">
              <div className="p-3 bg-slate-50 rounded-xl">
                <Tag size={20} className="text-primary" />
              </div>
              {isAdmin && (
                <div className="flex gap-2">
                  <button 
                    onClick={() => startEditing(plan)}
                    className="p-2.5 bg-white border border-slate-100 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all shadow-sm"
                    title="Edit Plan"
                  >
                    <Edit size={18} />
                  </button>
                  <button 
                    onClick={() => deletePlan(plan.id)}
                    className="p-2.5 bg-white border border-slate-100 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all shadow-sm"
                    title="Delete Plan"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-1 mb-6">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{plan.id}</p>
              <h3 className="text-xl font-black text-slate-800">{plan.title}</h3>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400 font-bold flex items-center gap-2">
                  <IndianRupee size={14} /> Price
                </span>
                <span className="font-black text-slate-800">{formatCurrency(plan.price)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400 font-bold flex items-center gap-2">
                  <Clock size={14} /> Duration
                </span>
                <span className="font-black text-slate-800">{plan.validationTimeMin} Min</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400 font-bold flex items-center gap-2">
                  <Settings size={14} /> GST
                </span>
                <span className="font-black text-slate-800">{plan.gstSlab}%</span>
              </div>
            </div>

            <div className="mt-8">
              <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest">
                {plan.type}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-start">
        {/* Socks Pricing */}
        <div className="bg-white p-8 md:p-10 rounded-[3rem] border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-primary" />
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-primary/10 rounded-2xl text-primary">
                <Footprints size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-800 italic uppercase tracking-tighter">Socks Inventory 🧦</h2>
                <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Global configurations</p>
              </div>
            </div>
            {isAdmin && (
              <button 
                onClick={() => setIsAddingSocks(true)}
                className="p-3 bg-primary text-white rounded-2xl shadow-lg shadow-primary/20 hover:scale-105 transition-all"
              >
                <Plus size={20} />
              </button>
            )}
          </div>

          <div className="space-y-4">
            {socksTypes?.length === 0 && (
              <div className="text-center py-12 bg-slate-50 rounded-[2rem] border border-dashed border-slate-100">
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No inventory items</p>
              </div>
            )}
            {socksTypes?.filter(t => t && t.id).map((type) => (
              <div key={type.id} className="p-5 bg-white border border-slate-100 rounded-3xl flex items-center justify-between hover:border-primary/30 hover:shadow-md transition-all group/item">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 group-hover/item:text-primary transition-colors">
                     <Package size={20} />
                   </div>
                   <div>
                     <h4 className="font-black text-slate-800 text-sm italic">{type.name}</h4>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">₹{type.price} <span className="opacity-30 mx-1">|</span> {type.gstSlab}% GST</p>
                   </div>
                </div>
                {isAdmin && (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        setEditingSocksType(type);
                        setSocksEditFormData({
                          name: type.name || '',
                          price: (type.price ?? '').toString(),
                          gstSlab: (type.gstSlab ?? '5').toString()
                        });
                      }}
                      className="p-2 text-slate-400 hover:text-primary transition-colors"
                      title="Edit Item"
                    >
                      <Edit size={16} />
                    </button>
                    <button 
                      onClick={() => {
                        setSocksToDelete(type);
                      }}
                      className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                      title="Delete Item"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          <div className="mt-8 pt-8 border-t border-slate-50">
             <div className="bg-slate-50 p-6 rounded-[2rem] space-y-4">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <span>Quick Setup Info</span>
                  <CheckCircle2 size={14} className="text-emerald-500" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="p-4 bg-white rounded-2xl border border-slate-100">
                      <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Standard Basic</p>
                      <p className="text-xs font-black text-slate-800">5% GST Slab</p>
                   </div>
                   <div className="p-4 bg-white rounded-2xl border border-slate-100">
                      <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Premium Items</p>
                      <p className="text-xs font-black text-slate-800">12% GST Slab</p>
                   </div>
                </div>
             </div>
          </div>
        </div>

        {/* Business Settings */}
        <div className="bg-white p-8 md:p-10 rounded-[3rem] border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500" />
          <div className="flex items-center gap-4 mb-8">
            <div className="p-4 bg-blue-50 rounded-2xl text-blue-500">
              <Building2 size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 italic">Business Profile 🏢</h2>
              <p className="text-slate-400 font-medium text-xs">Manage company info & branding</p>
            </div>
          </div>

          <form onSubmit={handleProfileUpdate} className="space-y-6">
            <div className="flex items-center gap-6 mb-4">
              <div className="relative group">
                <div className="w-24 h-24 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden transition-all group-hover:border-primary/50">
                   {tempBusinessProfile?.logo ? (
                     <img src={tempBusinessProfile.logo} alt="Logo Preview" className="w-full h-full object-contain" />
                   ) : (
                     <div className="text-center">
                        <Building2 size={24} className="text-slate-300 mx-auto" />
                        <span className="text-[8px] font-black text-slate-300 uppercase mt-1 block">No Logo</span>
                     </div>
                   )}
                   <label className="absolute inset-0 bg-slate-900/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                      <Plus size={20} />
                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                   </label>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-800 italic uppercase tracking-tighter">Business Logo</h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest max-w-[200px]">Upload your brand icon for receipts & reports</p>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Business Name</label>
              <input 
                type="text" required
                value={tempBusinessProfile?.name || ''}
                onChange={e => setTempBusinessProfile(prev => ({...prev, name: e.target.value}))}
                className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent focus:border-blue-200 focus:bg-white rounded-2xl outline-none font-bold placeholder:text-slate-300"
                placeholder="Funky Land"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Mobile No.</label>
                <div className="relative">
                  <input 
                    type="text" required
                    value={tempBusinessProfile?.mobile || ''}
                    onChange={e => setTempBusinessProfile(prev => ({...prev, mobile: e.target.value}))}
                    className="w-full px-5 py-3 pl-12 bg-slate-50 border-2 border-transparent focus:border-blue-200 focus:bg-white rounded-2xl outline-none font-bold"
                  />
                  <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">GST Number</label>
                <input 
                  type="text" required
                  value={tempBusinessProfile?.gstNo || ''}
                  onChange={e => setTempBusinessProfile(prev => ({...prev, gstNo: e.target.value}))}
                  className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent focus:border-blue-200 focus:bg-white rounded-2xl outline-none font-bold uppercase tracking-widest"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Grace Period (Min)</label>
                <input 
                  type="number" required
                  value={tempBusinessProfile?.gracePeriodMinutes || 0}
                  onChange={e => setTempBusinessProfile(prev => ({...prev, gracePeriodMinutes: parseInt(e.target.value) || 0}))}
                  className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent focus:border-blue-200 focus:bg-white rounded-2xl outline-none font-bold placeholder:text-slate-300"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Overtime Rate (₹/Min)</label>
                <input 
                  type="number" required
                  value={tempBusinessProfile?.overtimeRatePerMinute || 0}
                  onChange={e => setTempBusinessProfile(prev => ({...prev, overtimeRatePerMinute: parseFloat(e.target.value) || 0}))}
                  className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent focus:border-blue-200 focus:bg-white rounded-2xl outline-none font-bold placeholder:text-slate-300"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Accounting Year Start (DD-MM)</label>
              <div className="relative">
                <input 
                  type="text" required
                  value={tempBusinessProfile?.accountingYearStart || ''}
                  onChange={e => setTempBusinessProfile(prev => ({...prev, accountingYearStart: e.target.value}))}
                  className="w-full px-5 py-3 pl-12 bg-slate-50 border-2 border-transparent focus:border-blue-200 focus:bg-white rounded-2xl outline-none font-bold placeholder:text-slate-300"
                  placeholder="01-04"
                />
                <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
              <p className="text-[9px] text-slate-400 px-1 font-bold italic">Invoices will reset every year on this date (e.g. 01-04 for April 1st)</p>
            </div>

            {isAdmin && (
              <button 
                type="submit"
                className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-600/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-xs"
              >
                <Save size={18} />
                Update Profile
              </button>
            )}
          </form>
        </div>

        {/* Staff Management */}
        <div className="bg-white p-8 md:p-10 rounded-[3rem] border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500" />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-emerald-50 rounded-2xl text-emerald-500">
                <Users size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-800 italic">Staff Panel 👥</h2>
                <p className="text-slate-400 font-medium text-xs">Manage team access & roles</p>
              </div>
            </div>
            {isAdmin && (
              <button 
                onClick={() => setIsAddingStaff(true)}
                className="flex items-center gap-2 px-5 py-3 bg-emerald-500 text-white font-black rounded-xl text-[9px] uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:scale-105 transition-all shrink-0"
              >
                <Plus size={16} />
                New Staff Member
              </button>
            )}
          </div>

          <div className="space-y-3">
            {staff?.filter(s => s && s.id).map((s) => (
              <div key={s.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-500 shadow-sm">
                    <UserCheck size={18} />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-800 text-sm leading-tight italic">{s.full_name}</h4>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.id} • {s.role} • {s.phone}</p>
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => startEditingStaff(s)}
                      className="p-2 text-slate-400 hover:text-primary transition-colors bg-white rounded-lg border border-slate-100 shadow-sm"
                      title="Edit Staff Member"
                    >
                      <Settings size={16} />
                    </button>
                    {staff.length > 1 && (
                      <button 
                        onClick={() => deleteStaff(s.id)}
                        className="p-2 text-slate-400 hover:text-red-500 transition-colors bg-white rounded-lg border border-slate-100 shadow-sm"
                        title="Delete Staff Member"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>


      {/* Add Plan Modal */}
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
              className="relative w-full max-w-xl bg-white rounded-[3rem] shadow-2xl p-8"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black text-slate-800 italic">
                  {editingPlan ? 'Edit Plan ✏️' : 'Add New Plan 🌈'}
                </h2>
                <button onClick={() => { setIsAdding(false); setEditingPlan(null); }} className="text-slate-400 hover:text-slate-600"><X /></button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Plan ID</label>
                    <input 
                      type="text" required
                      disabled={!!editingPlan}
                      value={formData.id}
                      onChange={e => setFormData({...formData, id: e.target.value})}
                      className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl outline-none font-bold italic disabled:opacity-50"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Plan Name</label>
                    <input 
                      type="text" required
                      value={formData.title}
                      onChange={e => setFormData({...formData, title: e.target.value})}
                      placeholder="e.g. Weekend Special"
                      className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl outline-none font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Price (₹)</label>
                    <input 
                      type="number" required
                      value={formData.price}
                      onChange={e => setFormData({...formData, price: e.target.value})}
                      className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl outline-none font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Type</label>
                    <select 
                      value={formData.type}
                      onChange={e => setFormData({...formData, type: e.target.value as PlanType})}
                      className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl outline-none font-medium appearance-none"
                    >
                      <option value="hourly">Hourly</option>
                      <option value="unlimited">Unlimited Day Pass</option>
                      <option value="subscription">Membership</option>
                      <option value="monthly">Monthly Subscription</option>
                      <option value="combo">Combo</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Validation (Days)</label>
                    <input 
                      type="number" required
                      value={formData.validationDays}
                      onChange={e => setFormData({...formData, validationDays: e.target.value})}
                      className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl outline-none font-medium"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">GST Slab (%)</label>
                    <select 
                      value={formData.gstSlab}
                      onChange={e => setFormData({...formData, gstSlab: e.target.value})}
                      className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl outline-none font-bold"
                    >
                      <option value="0">0% (Nil)</option>
                      <option value="5">5% (Food/Basic)</option>
                      <option value="12">12% (Products)</option>
                      <option value="18">18% (Services)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Validation Time (Min)</label>
                    <input 
                      type="number" required
                      value={formData.validationTimeMin}
                      onChange={e => setFormData({...formData, validationTimeMin: e.target.value})}
                      className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl outline-none font-medium"
                    />
                  </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Description</label>
                  <textarea 
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl outline-none font-medium h-20 resize-none"
                    placeholder="Short plan details..."
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setIsAdding(false)}
                    className="flex-1 py-4 bg-slate-100 text-slate-500 font-black rounded-2xl hover:bg-slate-200 transition-all text-xs uppercase tracking-widest"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-[2] py-4 gradient-primary text-white font-black text-lg rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 size={24} />
                    Confirm Plan
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Staff Modal */}
      <AnimatePresence>
        {isAddingStaff && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddingStaff(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[3rem] shadow-2xl p-8"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black text-slate-800 italic">
                  {editingStaff ? 'Edit Staff Member 👤' : 'Add Staff Member 👥'}
                </h2>
                <button onClick={() => { setIsAddingStaff(false); setEditingStaff(null); }} className="text-slate-400 hover:text-slate-600"><X /></button>
              </div>

              <form onSubmit={handleStaffSubmit} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Staff ID</label>
                    <input 
                      type="text" required
                      disabled={!!editingStaff}
                      value={staffFormData.id}
                      onChange={e => setStaffFormData({...staffFormData, id: e.target.value})}
                      placeholder="e.g. STF02"
                      className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent focus:border-emerald-200 focus:bg-white rounded-2xl outline-none font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Login Password</label>
                    <input 
                      type="password" required
                      value={staffFormData.password}
                      onChange={e => setStaffFormData({...staffFormData, password: e.target.value})}
                      placeholder="••••••••"
                      className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent focus:border-emerald-200 focus:bg-white rounded-2xl outline-none font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Full Name</label>
                  <input 
                    type="text" required
                    value={staffFormData.full_name}
                    onChange={e => setStaffFormData({...staffFormData, full_name: e.target.value})}
                    placeholder="Enter name..."
                    className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent focus:border-emerald-200 focus:bg-white rounded-2xl outline-none font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Role</label>
                    <select 
                      value={staffFormData.role}
                      onChange={e => setStaffFormData({...staffFormData, role: e.target.value as any})}
                      className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent focus:border-emerald-200 focus:bg-white rounded-2xl outline-none font-bold appearance-none"
                    >
                      <option value="cashier">Cashier</option>
                      <option value="attendant">Floor Attendant</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Status</label>
                    <select 
                      value={staffFormData.status}
                      onChange={e => setStaffFormData({...staffFormData, status: e.target.value as any})}
                      className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent focus:border-emerald-200 focus:bg-white rounded-2xl outline-none font-bold appearance-none"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Phone Number</label>
                  <input 
                    type="text" required
                    value={staffFormData.phone}
                    onChange={e => setStaffFormData({...staffFormData, phone: e.target.value})}
                    placeholder="10 digit number"
                    className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent focus:border-emerald-200 focus:bg-white rounded-2xl outline-none font-bold"
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button" 
                    onClick={() => { setIsAddingStaff(false); setEditingStaff(null); }}
                    className="flex-1 py-4 bg-slate-100 text-slate-500 font-black rounded-2xl hover:bg-slate-200 transition-all text-xs uppercase tracking-widest"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-[2] py-4 bg-emerald-500 text-white font-black text-lg rounded-2xl shadow-xl shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 size={24} />
                    {editingStaff ? 'Update Staff Member' : 'Add Staff Member'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Add Socks Modal */}
      <AnimatePresence>
        {isAddingSocks && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddingSocks(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-8"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black text-slate-800 italic">Add Socks Stock 🧦</h2>
                <button onClick={() => setIsAddingSocks(false)} className="text-slate-400 hover:text-slate-600"><X /></button>
              </div>

              <form onSubmit={handleSocksSubmit} className="space-y-5">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Item Name</label>
                  <input 
                    type="text" required
                    value={socksFormData.name}
                    onChange={e => setSocksFormData({...socksFormData, name: e.target.value})}
                    placeholder="e.g. Premium Small Socks"
                    className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl outline-none font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Price (₹)</label>
                    <input 
                      type="number" required
                      value={socksFormData.price}
                      onChange={e => setSocksFormData({...socksFormData, price: e.target.value})}
                      placeholder="50"
                      className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl outline-none font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">GST Slab</label>
                    <select 
                      value={socksFormData.gstSlab}
                      onChange={e => setSocksFormData({...socksFormData, gstSlab: e.target.value})}
                      className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl outline-none font-bold appearance-none"
                    >
                      <option value="0">0% (Nil)</option>
                      <option value="5">5% (Socks/Basic)</option>
                      <option value="12">12% (Products)</option>
                      <option value="18">18% (Services)</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setIsAddingSocks(false)}
                    className="flex-1 py-4 bg-slate-100 text-slate-500 font-black rounded-2xl hover:bg-slate-200 transition-all text-xs uppercase tracking-widest"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-[2] py-4 gradient-primary text-white font-black text-lg rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <Save size={20} />
                    Add Item
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Edit Socks Modal */}
        {editingSocksType && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingSocksType(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-8 z-10"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black text-slate-800 italic">Edit Socks Stock 🧦</h2>
                <button onClick={() => setEditingSocksType(null)} className="text-slate-400 hover:text-slate-600"><X /></button>
              </div>

              <form onSubmit={handleSocksEditSubmit} className="space-y-5">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Item Name</label>
                  <input 
                    type="text" required
                    value={socksEditFormData.name}
                    onChange={e => setSocksEditFormData({...socksEditFormData, name: e.target.value})}
                    placeholder="e.g. Premium Small Socks"
                    className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl outline-none font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Price (₹)</label>
                    <input 
                      type="number" required
                      value={socksEditFormData.price}
                      onChange={e => setSocksEditFormData({...socksEditFormData, price: e.target.value})}
                      placeholder="50"
                      className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl outline-none font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">GST Slab</label>
                    <select 
                      value={socksEditFormData.gstSlab}
                      onChange={e => setSocksEditFormData({...socksEditFormData, gstSlab: e.target.value})}
                      className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl outline-none font-bold appearance-none"
                    >
                      <option value="0">0% (Nil)</option>
                      <option value="5">5% (Socks/Basic)</option>
                      <option value="12">12% (Products)</option>
                      <option value="18">18% (Services)</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setEditingSocksType(null)}
                    className="flex-1 py-4 bg-slate-100 text-slate-500 font-black rounded-2xl hover:bg-slate-200 transition-all text-xs uppercase tracking-widest"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-[2] py-4 gradient-primary text-white font-black text-lg rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <Save size={20} />
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {socksToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSocksToDelete(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl p-8 z-10 text-center"
            >
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-2 italic">Delete Socks Item</h3>
              <p className="text-slate-500 text-sm mb-6 font-medium">Are you sure you want to delete <span className="font-extrabold text-slate-800">"{socksToDelete.name}"</span>? This action cannot be undone.</p>
              
              <div className="flex gap-4">
                <button
                  onClick={() => setSocksToDelete(null)}
                  className="flex-1 py-3 bg-slate-100 text-slate-500 font-black rounded-2xl hover:bg-slate-200 transition-all text-xs uppercase tracking-widest"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    deleteSocksType(socksToDelete.id);
                    setSocksToDelete(null);
                  }}
                  className="flex-1 py-3 bg-red-500 text-white font-black rounded-2xl hover:bg-red-600 transition-all text-xs uppercase tracking-widest shadow-lg shadow-red-500/20"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
