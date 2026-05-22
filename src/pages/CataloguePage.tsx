import React, { useState } from 'react';
import { usePlayZone } from '../hooks/usePlayZone';
import { 
  Plus, 
  Trash2, 
  Search, 
  Image as ImageIcon,
  Grid,
  List,
  Type,
  Tag,
  X,
  PlusCircle,
  Edit
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export default function CataloguePage() {
  const { 
    catalogueCategories, 
    catalogueDesigns, 
    addCatalogueCategory, 
    updateCatalogueCategory,
    deleteCatalogueCategory,
    addCatalogueDesign, 
    updateCatalogueDesign,
    deleteCatalogueDesign,
    isAdmin
  } = usePlayZone();

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [isAddingDesign, setIsAddingDesign] = useState(false);
  const [editingDesign, setEditingDesign] = useState<any>(null);
  
  const [newCatName, setNewCatName] = useState('');
  const [designForm, setDesignForm] = useState({
    id: '',
    name: '',
    categoryId: catalogueCategories[0]?.id || '',
    description: '',
    price: '',
    imageUrl: ''
  });

  const filteredDesigns = catalogueDesigns.filter(d => {
    const matchesCategory = selectedCategory === 'all' || d.categoryId === selectedCategory;
    const matchesSearch = (d.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCatName.trim()) {
      if (editingCategory) {
        updateCatalogueCategory(editingCategory.id, newCatName);
        setEditingCategory(null);
      } else {
        addCatalogueCategory(newCatName);
      }
      setNewCatName('');
      setIsAddingCategory(false);
    }
  };

  const handleAddDesign = (e: React.FormEvent) => {
    e.preventDefault();
    if (designForm.name && designForm.categoryId) {
      if (editingDesign) {
        updateCatalogueDesign(editingDesign.id, {
          name: designForm.name,
          categoryId: designForm.categoryId,
          description: designForm.description,
          price: designForm.price ? parseFloat(designForm.price) : undefined,
          imageUrl: designForm.imageUrl
        });
        setEditingDesign(null);
      } else {
        addCatalogueDesign({
          name: designForm.name,
          categoryId: designForm.categoryId,
          description: designForm.description,
          price: designForm.price ? parseFloat(designForm.price) : undefined,
          imageUrl: designForm.imageUrl || `https://images.unsplash.com/photo-1530103043960-ef38714abb15?q=80&w=300&h=300&auto=format&fit=crop`
        });
      }
      setDesignForm({
        id: '',
        name: '',
        categoryId: catalogueCategories[0]?.id || '',
        description: '',
        price: '',
        imageUrl: ''
      });
      setIsAddingDesign(false);
    }
  };

  const startEditDesign = (design: any) => {
    setEditingDesign(design);
    setDesignForm({
      id: design.id,
      name: design.name,
      categoryId: design.categoryId,
      description: design.description || '',
      price: design.price ? design.price.toString() : '',
      imageUrl: design.imageUrl || ''
    });
    setIsAddingDesign(true);
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
          <h1 className="text-3xl font-black text-slate-800 tracking-tight italic">Design Catalogue 🎨</h1>
          <p className="text-slate-500 font-medium">Showcase and manage party themes & decoration designs</p>
        </div>
        {isAdmin && (
          <div className="flex gap-3">
            <button 
              onClick={() => setIsAddingCategory(true)}
              className="px-6 py-4 bg-white border border-slate-100 text-slate-600 font-black rounded-2xl shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2"
            >
              <PlusCircle size={20} />
              Add Category
            </button>
            <button 
              onClick={() => setIsAddingDesign(true)}
              className="px-6 py-4 gradient-primary text-white font-black rounded-2xl shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
            >
              <Plus size={20} />
              Add Design
            </button>
          </div>
        )}
      </header>

      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-[1.5rem] border border-slate-100 shadow-sm">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
          <button 
            onClick={() => setSelectedCategory('all')}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-black transition-all whitespace-nowrap",
              selectedCategory === 'all' 
                ? "bg-primary text-white shadow-lg shadow-primary/20" 
                : "bg-slate-50 text-slate-500 hover:bg-slate-100"
            )}
          >
            All Designs
          </button>
          {catalogueCategories.map(cat => (
            <div key={cat.id} className="relative group/cat">
              <button 
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-black transition-all whitespace-nowrap",
                  selectedCategory === cat.id 
                    ? "bg-primary text-white shadow-lg shadow-primary/20" 
                    : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                )}
              >
                {cat.name}
              </button>
              {isAdmin && (
                <div className="absolute -top-2 -right-2 flex items-center gap-1 opacity-0 group-hover/cat:opacity-100 transition-opacity z-10">
                  <button 
                    onClick={(e) => { e.stopPropagation(); startEditCategory(cat); }}
                    className="p-1 bg-white border border-slate-200 text-slate-400 hover:text-primary rounded-lg shadow-sm"
                  >
                    <Edit size={10} />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); if (confirm('Delete category?')) deleteCatalogueCategory(cat.id); }}
                    className="p-1 bg-white border border-slate-200 text-slate-400 hover:text-red-500 rounded-lg shadow-sm"
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative group flex-1 md:w-80">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 p-1.5 bg-primary/10 text-primary rounded-lg group-focus-within:bg-primary group-focus-within:text-white transition-all shadow-sm">
              <Search size={14} />
            </div>
            <input 
              type="text"
              placeholder="Search design..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-24 py-2.5 bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-xl outline-none transition-all text-sm font-bold shadow-inner"
            />
            <button 
              type="button"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-slate-900 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-md active:scale-95"
            >
              Search
            </button>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button 
              onClick={() => setViewMode('grid')}
              className={cn("p-1.5 rounded-lg transition-all", viewMode === 'grid' ? "bg-white text-primary shadow-sm" : "text-slate-400")}
            >
              <Grid size={18} />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={cn("p-1.5 rounded-lg transition-all", viewMode === 'list' ? "bg-white text-primary shadow-sm" : "text-slate-400")}
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {viewMode === 'grid' ? (
          <motion.div 
            key="grid"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            {filteredDesigns.map(design => (
              <motion.div 
                key={design.id}
                layout
                className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden group hover:shadow-xl hover:shadow-slate-200/50 transition-all"
              >
                <div className="aspect-square relative overflow-hidden bg-slate-100">
                  <img 
                    src={design.imageUrl} 
                    alt={design.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6 gap-2">
                    {isAdmin && (
                      <>
                        <button 
                          onClick={() => startEditDesign(design)}
                          className="p-2 bg-white/20 backdrop-blur-md rounded-xl text-white hover:bg-primary transition-all"
                        >
                          <Edit size={18} />
                        </button>
                        <button 
                          onClick={() => deleteCatalogueDesign(design.id)}
                          className="p-2 bg-white/20 backdrop-blur-md rounded-xl text-white hover:bg-red-500 transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div className="p-6 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">
                      {catalogueCategories.find(c => c.id === design.categoryId)?.name}
                    </span>
                    {design.price && (
                      <span className="font-black text-slate-800 italic">₹{design.price}</span>
                    )}
                  </div>
                  <h3 className="text-lg font-black text-slate-800 leading-tight">{design.name}</h3>
                  {design.description && (
                    <p className="text-xs text-slate-400 line-clamp-2">{design.description}</p>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div 
            key="list"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden"
          >
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Design</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Category</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Price</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDesigns.map(design => (
                  <tr key={design.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
                          <img src={design.imageUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-black text-slate-800">{design.name}</span>
                          <span className="text-[10px] text-slate-400 italic line-clamp-1">{design.description}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-4">
                      <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-black rounded-lg uppercase">
                        {catalogueCategories.find(c => c.id === design.categoryId)?.name}
                      </span>
                    </td>
                    <td className="px-8 py-4 font-black">
                      {design.price ? `₹${design.price}` : '-'}
                    </td>
                    <td className="px-8 py-4 text-right">
                      {isAdmin && (
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => startEditDesign(design)}
                            className="p-2 text-slate-300 hover:text-primary transition-colors"
                          >
                            <Edit size={18} />
                          </button>
                          <button 
                            onClick={() => deleteCatalogueDesign(design.id)}
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
          </motion.div>
        )}
      </AnimatePresence>

      {filteredDesigns.length === 0 && (
        <div className="bg-white rounded-[3rem] p-20 text-center space-y-4 border border-dashed border-slate-200">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
            <ImageIcon size={40} />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-black text-slate-800 tracking-tight">Catalog is Empty</h3>
            <p className="text-slate-400 font-medium italic">Start adding your beautiful designs and themes.</p>
          </div>
          <button 
            onClick={() => setIsAddingDesign(true)}
            className="px-6 py-3 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/20 hover:scale-105 transition-all"
          >
            Add First Design
          </button>
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {isAddingCategory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setIsAddingCategory(false); setEditingCategory(null); setNewCatName(''); }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative w-full max-w-sm bg-white rounded-[3rem] p-8 shadow-2xl">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black text-slate-800 italic">{editingCategory ? 'Edit Category' : 'New Category'}</h3>
                <button onClick={() => { setIsAddingCategory(false); setEditingCategory(null); setNewCatName(''); }} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20}/></button>
              </div>
              <form onSubmit={handleAddCategory} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Category Name</label>
                  <input 
                    type="text" required autoFocus
                    value={newCatName}
                    onChange={e => setNewCatName(e.target.value)}
                    placeholder="e.g. Balloon Decor"
                    className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent focus:border-primary/20 rounded-2xl outline-none font-medium"
                  />
                </div>
                <button type="submit" className="w-full py-4 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/20">{editingCategory ? 'Update Category' : 'Create Category'}</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAddingDesign && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setIsAddingDesign(false); setEditingDesign(null); setDesignForm({ id: '', name: '', categoryId: catalogueCategories[0]?.id || '', description: '', price: '', imageUrl: '' }); }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative w-full max-w-lg bg-white rounded-[3rem] p-8 shadow-2xl">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black text-slate-800 italic">{editingDesign ? 'Edit Design' : 'Add New Design'}</h3>
                <button onClick={() => { setIsAddingDesign(false); setEditingDesign(null); setDesignForm({ id: '', name: '', categoryId: catalogueCategories[0]?.id || '', description: '', price: '', imageUrl: '' }); }} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20}/></button>
              </div>
              <form onSubmit={handleAddDesign} className="space-y-6 max-h-[70vh] overflow-y-auto px-1 pr-4 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Design Name</label>
                    <input 
                      type="text" required
                      value={designForm.name}
                      onChange={e => setDesignForm({...designForm, name: e.target.value})}
                      placeholder="e.g. Frozen Castle"
                      className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent focus:border-primary/20 rounded-2xl outline-none font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Category</label>
                    <select 
                      required
                      value={designForm.categoryId}
                      onChange={e => setDesignForm({...designForm, categoryId: e.target.value})}
                      className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent focus:border-primary/20 rounded-2xl outline-none font-bold"
                    >
                      <option value="">Select Category</option>
                      {catalogueCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Image URL (Optional)</label>
                  <input 
                    type="url"
                    value={designForm.imageUrl}
                    onChange={e => setDesignForm({...designForm, imageUrl: e.target.value})}
                    placeholder="https://..."
                    className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent focus:border-primary/20 rounded-2xl outline-none font-medium text-xs"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Estimate Price (₹)</label>
                  <input 
                    type="number"
                    value={designForm.price}
                    onChange={e => setDesignForm({...designForm, price: e.target.value})}
                    placeholder="0.00"
                    className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent focus:border-primary/20 rounded-2xl outline-none font-black text-lg"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Short Description</label>
                  <textarea 
                    value={designForm.description}
                    onChange={e => setDesignForm({...designForm, description: e.target.value})}
                    placeholder="Details about the design layout, items included..."
                    className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent focus:border-primary/20 rounded-2xl outline-none font-medium h-24 resize-none"
                  />
                </div>

                <button type="submit" className="w-full py-4 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/20">{editingDesign ? 'Update Design' : 'Save Design to Catalogue'}</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
