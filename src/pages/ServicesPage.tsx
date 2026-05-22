import React, { useState } from 'react';
import { usePlayZone } from '../hooks/usePlayZone';
import { 
  Plus, 
  Trash2, 
  Search, 
  Tag, 
  Layers, 
  IndianRupee,
  ChevronRight,
  Edit,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatCurrency, cn } from '../lib/utils';

export default function ServicesPage() {
  const { categories, services, addCategory, updateCategory, deleteCategory, addService, updateService, deleteService, isAdmin } = usePlayZone();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | 'all'>('all');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [isAddingService, setIsAddingService] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  
  const [newCatName, setNewCatName] = useState('');
  const [serviceForm, setServiceForm] = useState({
    id: '',
    name: '',
    price: '',
    gstSlab: '18',
    categoryId: categories[0]?.id || ''
  });

  const filteredServices = services.filter(s => {
    const matchesSearch = (s.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === 'all' || s.categoryId === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCatName.trim()) {
      if (editingCategory) {
        updateCategory(editingCategory.id, newCatName);
        setEditingCategory(null);
      } else {
        addCategory(newCatName);
      }
      setNewCatName('');
      setIsAddingCategory(false);
    }
  };

  const handleAddService = (e: React.FormEvent) => {
    e.preventDefault();
    if (serviceForm.name && serviceForm.price) {
      if (editingService) {
        updateService(editingService.id, {
          name: serviceForm.name,
          price: parseFloat(serviceForm.price),
          gstSlab: parseInt(serviceForm.gstSlab) as any,
          categoryId: serviceForm.categoryId
        });
        setEditingService(null);
      } else {
        addService({
          name: serviceForm.name,
          price: parseFloat(serviceForm.price),
          gstSlab: parseInt(serviceForm.gstSlab) as any,
          categoryId: serviceForm.categoryId
        });
      }
      setServiceForm({ id: '', name: '', price: '', gstSlab: '18', categoryId: categories[0]?.id || '' });
      setIsAddingService(false);
    }
  };

  const startEditService = (s: any) => {
    setEditingService(s);
    setServiceForm({
      id: s.id,
      name: s.name,
      price: s.price.toString(),
      gstSlab: s.gstSlab.toString(),
      categoryId: s.categoryId
    });
    setIsAddingService(true);
  };

  const startEditCategory = (cat: any) => {
    setEditingCategory(cat);
    setNewCatName(cat.name);
    setIsAddingCategory(true);
  };

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight italic">Services & Amenities 🎈</h1>
          <p className="text-slate-500 font-medium">Manage add-ons, food, and decoration services</p>
        </div>
        {isAdmin && (
          <div className="flex gap-3">
            <button 
              onClick={() => setIsAddingCategory(true)}
              className="px-6 py-4 bg-white border border-slate-100 text-slate-600 font-black rounded-2xl shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2"
            >
              <Layers size={20} />
              Add Category
            </button>
            <button 
              onClick={() => setIsAddingService(true)}
              className="px-6 py-4 gradient-secondary text-white font-black rounded-2xl shadow-xl shadow-secondary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
            >
              <Plus size={20} />
              Add Service
            </button>
          </div>
        )}
      </header>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Categories Sidebar */}
        <aside className="lg:w-72 space-y-4">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 italic">Quick Filter</h3>
            <div className="space-y-2">
              <button 
                onClick={() => setActiveCategory('all')}
                className={cn(
                  "w-full flex items-center justify-between p-3 rounded-xl transition-all font-bold text-sm",
                  activeCategory === 'all' ? "bg-secondary text-white shadow-lg" : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                )}
              >
                <span>All Services</span>
                <Layers size={14} className={activeCategory === 'all' ? "text-white" : "text-slate-300"} />
              </button>
              {categories.map(cat => (
                <div key={cat.id} className="relative group/cat">
                  <button 
                    onClick={() => setActiveCategory(cat.id)}
                    className={cn(
                      "w-full flex items-center justify-between p-3 rounded-xl transition-all font-bold text-sm",
                      activeCategory === cat.id ? "bg-secondary text-white shadow-lg" : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                    )}
                  >
                    <span className="truncate pr-8">{cat.name}</span>
                    <Tag size={14} className={activeCategory === cat.id ? "text-white" : "text-slate-300"} />
                  </button>
                  {isAdmin && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover/cat:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => { e.stopPropagation(); startEditCategory(cat); }}
                        className={cn("p-1.5 rounded-lg", activeCategory === cat.id ? "text-white hover:bg-white/20" : "text-slate-400 hover:bg-slate-200")}
                      >
                        <Edit size={12} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); if (confirm('Delete category?')) deleteCategory(cat.id); }}
                        className={cn("p-1.5 rounded-lg", activeCategory === cat.id ? "text-white hover:bg-white/20" : "text-slate-400 hover:bg-red-100 hover:text-red-500")}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Services List */}
        <div className="flex-1 space-y-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text"
              placeholder="Search services..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-[1.5rem] shadow-sm focus:ring-2 focus:ring-secondary/20 outline-none transition-all font-medium"
            />
          </div>

          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Sr. No.</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Services</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">GST</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Prices</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredServices.map((service, idx) => (
                  <tr key={service.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-8 py-5 text-sm font-black text-slate-300">{(idx + 1).toString().padStart(2, '0')}</td>
                    <td className="px-8 py-5">
                      <div className="flex flex-col">
                        <span className="font-black text-slate-800">{service.name}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">{categories.find(c => c.id === service.categoryId)?.name}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className="px-2 py-1 bg-slate-100 rounded-lg text-[10px] font-black text-slate-500">{service.gstSlab}%</span>
                    </td>
                    <td className="px-8 py-5 text-right font-black text-secondary">{formatCurrency(service.price)}</td>
                    <td className="px-8 py-5 text-center">
                      {isAdmin && (
                        <div className="flex items-center justify-center gap-2">
                           <button 
                            onClick={() => startEditService(service)}
                            className="p-2 text-slate-300 hover:text-primary transition-colors"
                          >
                            <Edit size={18} />
                          </button>
                          <button 
                            onClick={() => deleteService(service.id)}
                            className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredServices.length === 0 && (
              <div className="p-20 text-center text-slate-400 italic font-medium">
                No services added yet. 🧩
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Category Modal */}
      <AnimatePresence>
        {isAddingCategory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAddingCategory(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative w-full max-w-sm bg-white rounded-[2.5rem] p-8 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black text-slate-800 flex items-center gap-2 italic"><Layers className="text-secondary" /> {editingCategory ? 'Edit Category' : 'Add Category'}</h3>
                <button onClick={() => { setIsAddingCategory(false); setEditingCategory(null); setNewCatName(''); }} className="text-slate-400 hover:text-slate-600"><X /></button>
              </div>
              <form onSubmit={handleAddCategory} className="space-y-4">
                <input 
                  type="text" required autoFocus
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  placeholder="e.g. Activity Add-ons"
                  className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent focus:border-secondary/20 rounded-2xl outline-none font-medium"
                />
                <div className="flex gap-3">
                  <button type="button" onClick={() => setIsAddingCategory(false)} className="flex-1 py-3 bg-slate-100 text-slate-500 font-bold rounded-xl">Cancel</button>
                  <button type="submit" className="flex-1 py-3 bg-secondary text-white font-bold rounded-xl shadow-lg shadow-secondary/20">Save</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Service Modal */}
      <AnimatePresence>
        {isAddingService && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAddingService(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative w-full max-w-md bg-white rounded-[2.5rem] p-8 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black text-slate-800 flex items-center gap-2 italic"><Plus className="text-secondary" /> {editingService ? 'Edit Service' : 'New Service Item'}</h3>
                <button onClick={() => { setIsAddingService(false); setEditingService(null); setServiceForm({ id: '', name: '', price: '', gstSlab: '18', categoryId: categories[0]?.id || '' }); }} className="text-slate-400 hover:text-slate-600"><X /></button>
              </div>
              <form onSubmit={handleAddService} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Category</label>
                  <select 
                    value={serviceForm.categoryId}
                    onChange={e => setServiceForm({...serviceForm, categoryId: e.target.value})}
                    className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent focus:border-secondary/20 rounded-2xl outline-none font-bold"
                  >
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Service Name</label>
                  <input 
                    type="text" required
                    value={serviceForm.name}
                    onChange={e => setServiceForm({...serviceForm, name: e.target.value})}
                    placeholder="e.g. Magic Show"
                    className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent focus:border-secondary/20 rounded-2xl outline-none font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">GST Slab (%)</label>
                  <select 
                    value={serviceForm.gstSlab}
                    onChange={e => setServiceForm({...serviceForm, gstSlab: e.target.value})}
                    className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent focus:border-secondary/20 rounded-2xl outline-none font-bold"
                  >
                    <option value="0">0% (Nil)</option>
                    <option value="5">5% (Food/Basic)</option>
                    <option value="12">12% (Products)</option>
                    <option value="18">18% (Services)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Price (₹)</label>
                  <input 
                    type="number" required
                    value={serviceForm.price}
                    onChange={e => setServiceForm({...serviceForm, price: e.target.value})}
                    placeholder="0.00"
                    className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent focus:border-secondary/20 rounded-2xl outline-none font-black text-xl"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setIsAddingService(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 font-bold rounded-2xl">Cancel</button>
                  <button type="submit" className="flex-1 py-4 bg-secondary text-white font-bold rounded-2xl shadow-xl shadow-secondary/20">Add Service</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
