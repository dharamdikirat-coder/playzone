import React, { useState, useMemo } from 'react';
import { usePlayZone } from '../hooks/usePlayZone';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  PartyPopper, 
  Clock,
  User,
  Phone,
  Baby,
  IndianRupee,
  ChevronRight,
  Filter,
  CheckCircle2,
  X,
  Download,
  FileText,
  MessageCircle,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatCurrency, formatWhatsAppLink } from '../lib/utils';
import { BookingEvent } from '../types';

export default function CalendarPage() {
  const { events, addEvent, updateEvent, deleteEvent, updateEventStatus, addInvoice, categories, services, members, exportToCSV, businessProfile, isAdmin } = usePlayZone();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<BookingEvent | null>(null);
  const [filter, setFilter] = useState<'all' | 'confirmed' | 'tentative' | 'completed'>('all');

  const [formData, setFormData] = useState({
    id: 'EVB' + (events.length + 1).toString().padStart(2, '0'),
    category: categories[0]?.id || '',
    customerId: '',
    customerName: '',
    mobileNumber: '',
    date: '',
    timeSlot: '',
    kidsCount: 1,
    bookingCharges: 0,
    selectedServices: [] as { serviceId: string; name: string; price: number; theme?: string }[],
    theme: 'Barbie',
    gstPercentage: 18,
    advancePaid: 0,
    payMode: 'upi' as any,
    paymentStatus: 'pending' as any,
    notes: ''
  });

  const totals = useMemo(() => {
    const servicesTotal = formData.selectedServices.reduce((sum, s) => sum + s.price, 0);
    const subtotal = formData.bookingCharges + servicesTotal;
    const gstAmount = (subtotal * formData.gstPercentage) / 100;
    const grandTotal = subtotal + gstAmount;
    return {
      subtotal,
      gstAmount,
      grandTotal,
      balance: grandTotal - formData.advancePaid
    };
  }, [formData.bookingCharges, formData.selectedServices, formData.gstPercentage, formData.advancePaid]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingEvent) {
      updateEvent(editingEvent.id, {
        ...formData,
        date: new Date(formData.date),
        grandTotal: totals.grandTotal,
        balance: totals.balance,
      });
      setEditingEvent(null);
    } else {
      addEvent({
        ...formData,
        date: new Date(formData.date),
        grandTotal: totals.grandTotal,
        balance: totals.balance,
        status: 'confirmed',
      });

      // Add invoice for NEW event
      addInvoice({
        customerName: formData.customerName,
        mobileNumber: formData.mobileNumber,
        date: new Date(formData.date),
        items: [
          {
            id: 'EV-BASE',
            description: `Event Booking: ${categories.find(c => c.id === formData.category)?.name || 'General'}`,
            type: 'service',
            quantity: 1,
            unitPrice: formData.bookingCharges,
            gstSlab: formData.gstPercentage as any,
            amount: formData.bookingCharges + (formData.bookingCharges * formData.gstPercentage / 100)
          },
          ...formData.selectedServices.map((s, idx) => ({
            id: `EV-SRV-${idx}`,
            description: `Service: ${s.name} (${s.theme})`,
            type: 'service' as const,
            quantity: 1,
            unitPrice: s.price,
            gstSlab: formData.gstPercentage as any,
            amount: s.price + (s.price * formData.gstPercentage / 100)
          }))
        ],
        totalBaseAmount: formData.bookingCharges + formData.selectedServices.reduce((sum, s) => sum + s.price, 0),
        totalGST: totals.gstAmount,
        totalAmount: totals.grandTotal,
        paymentMode: formData.payMode,
        status: formData.paymentStatus === 'paid' ? 'paid' : 'pending',
        type: 'event'
      });
    }

    setShowAddModal(false);
    resetForm();
  };

  const startEditingEvent = (event: BookingEvent) => {
    setEditingEvent(event);
    setFormData({
      id: event.id,
      category: event.category,
      customerId: event.customerId || '',
      customerName: event.customerName,
      mobileNumber: event.mobileNumber,
      date: new Date(event.date).toISOString().split('T')[0],
      timeSlot: event.timeSlot,
      kidsCount: event.kidsCount,
      bookingCharges: event.bookingCharges,
      selectedServices: [...event.selectedServices],
      theme: event.theme || 'Barbie',
      gstPercentage: event.gstPercentage || 18,
      advancePaid: event.advancePaid,
      payMode: event.payMode,
      paymentStatus: event.paymentStatus,
      notes: event.notes || ''
    });
    setShowAddModal(true);
  };

  const resetForm = () => {
    setFormData({
      id: 'EVB' + (events.length + 1).toString().padStart(2, '0'),
      category: categories[0]?.id || '',
      customerId: '',
      customerName: '',
      mobileNumber: '',
      date: '',
      timeSlot: '',
      kidsCount: 1,
      bookingCharges: 0,
      selectedServices: [],
      theme: 'Barbie',
      gstPercentage: 18,
      advancePaid: 0,
      payMode: 'upi',
      paymentStatus: 'pending',
      notes: ''
    });
  };

  const handleExportEvents = () => {
    const dataToExport = events.map(e => ({
      ID: e.id,
      Event: `${e.customerName}'s Event`,
      Customer: e.customerName,
      Phone: e.mobileNumber,
      Date: new Date(e.date).toLocaleDateString(),
      Time: e.timeSlot,
      Total: e.grandTotal,
      Balance: e.balance,
      Status: e.status
    }));
    exportToCSV(dataToExport, 'FunkyLand_Events');
  };

  const handlePrintCalendar = () => {
    window.print();
  };

  const handleWhatsAppEvent = (event: BookingEvent) => {
    const eventDisplayName = categories.find(c => c.id === event.category)?.name || 'Event';
    const message = `Hello ${event.customerName}, this is a reminder for your event "${eventDisplayName}" at ${businessProfile.name}.\nDate: ${new Date(event.date).toLocaleDateString()}\nTime: ${event.timeSlot}\nLooking forward to seeing you! 🎈`;
    window.open(formatWhatsAppLink(event.mobileNumber, message), '_blank');
  };

  const handleAddServiceToBooking = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    if (service && !formData.selectedServices.find(s => s.serviceId === serviceId)) {
      setFormData({
        ...formData,
        selectedServices: [...formData.selectedServices, { 
          serviceId: service.id, 
          name: service.name, 
          price: service.price,
          theme: formData.theme 
        }]
      });
    }
  };

  const removeServiceFromBooking = (id: string) => {
    setFormData({
      ...formData,
      selectedServices: formData.selectedServices.filter(s => s.serviceId !== id)
    });
  };

  const filteredEvents = events.filter(e => filter === 'all' || e.status === filter);
  const sortedEvents = [...filteredEvents].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="space-y-8 pb-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight italic">Event Bookings 🎈</h1>
          <p className="text-slate-500 font-medium">Birthdays, School Trips & Group Events</p>
        </div>
        <div className="flex items-center gap-3 no-print">
          <button 
            onClick={handlePrintCalendar}
            className="p-4 bg-white border border-slate-100 text-slate-400 rounded-2xl shadow-sm hover:text-primary transition-all"
            title="Print Calendar"
          >
            <FileText size={18} />
          </button>
          {isAdmin && (
            <>
              <button 
                onClick={handleExportEvents}
                className="hidden sm:flex items-center gap-2 px-6 py-4 bg-white border border-slate-100 text-slate-600 font-black rounded-2xl shadow-sm hover:bg-slate-50 transition-all font-xs"
              >
                <Download size={18} />
                Excel
              </button>
              <button 
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 px-6 py-4 bg-secondary text-white font-black rounded-2xl shadow-xl shadow-secondary/20 hover:scale-105 active:scale-95 transition-all"
              >
                <Plus size={20} />
                New Event
              </button>
            </>
          )}
        </div>
      </header>

      {/* Filters */}
      <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl w-fit">
        {['all', 'confirmed', 'tentative', 'completed'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f as any)}
            className={cn(
              "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
              filter === f ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {sortedEvents.map((event, i) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all overflow-hidden flex flex-col"
            >
              <div className="p-8 flex-1 space-y-6">
                <div className="flex items-start justify-between">
                  <div className="w-14 h-14 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center">
                    <PartyPopper size={28} />
                  </div>
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                    event.status === 'confirmed' ? "bg-emerald-100 text-emerald-600" : 
                    event.status === 'completed' ? "bg-blue-100 text-blue-600" :
                    "bg-amber-100 text-amber-600"
                  )}>
                    {event.status}
                  </span>
                </div>

                <div>
                  <h3 className="text-xl font-black text-slate-800 leading-tight mb-2">{event.customerName}'s {categories.find(c => c.id === event.category)?.name || 'Event'}</h3>
                  <div className="flex items-center gap-2 text-slate-400 font-bold text-xs uppercase tracking-tight">
                    <CalendarIcon size={14} />
                    {new Date(event.date).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Bill</p>
                    <p className="text-sm font-black text-slate-900 flex items-center gap-2 italic">
                      <IndianRupee size={14} /> {formatCurrency(event.grandTotal || 0)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Time Slot</p>
                    <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      <Clock size={14} /> {event.timeSlot}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Kids Count</p>
                    <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      <Baby size={14} /> {event.kidsCount} Kids
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Payment</p>
                    <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      <IndianRupee size={14} /> {formatCurrency(event.balance || 0)} due
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-4 border-t border-slate-100 flex items-center justify-between">
                <div className="flex gap-2">
                  <select 
                    value={event.status}
                    onChange={(e) => updateEventStatus(event.id, e.target.value as any)}
                    className="text-[10px] font-black bg-white border border-slate-200 rounded-lg px-2 py-1 outline-none transition-all focus:border-secondary"
                  >
                    <option value="tentative">Tentative</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => startEditingEvent(event)}
                    className="p-2 text-slate-400 hover:text-secondary rounded-xl transition-all"
                    title="Edit Event"
                  >
                    <FileText size={16} />
                  </button>
                  {isAdmin && (
                    <button 
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete this event for ${event.customerName}?`)) {
                          deleteEvent(event.id);
                        }
                      }}
                      className="p-2 text-slate-300 hover:text-rose-500 rounded-xl transition-all"
                      title="Delete Event"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                  <button 
                    onClick={() => handleWhatsAppEvent(event)}
                    className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all no-print"
                    title="Send WhatsApp Reminder"
                  >
                    <MessageCircle size={14} />
                  </button>
                  <span className="text-[10px] font-black text-slate-400">{event.mobileNumber}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {sortedEvents.length === 0 && (
          <div className="col-span-full py-24 text-center bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
            <CalendarIcon size={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-xl font-black text-slate-400 italic">No events found for this filter.</h3>
          </div>
        )}
      </div>

      {/* Add Event Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl p-8 overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-secondary" />
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                  <PartyPopper className="text-secondary" size={28} /> {editingEvent ? 'Edit Event Details' : 'Schedule New Event'}
                </h2>
                <button onClick={() => { setShowAddModal(false); setEditingEvent(null); }} className="text-slate-400 hover:text-slate-600">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto px-1 pr-4 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Booking ID</label>
                    <input type="text" readOnly value={formData.id} className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent rounded-2xl font-black text-primary italic" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Category</label>
                    <select 
                      value={formData.category}
                      onChange={e => setFormData({...formData, category: e.target.value})}
                      className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent focus:border-secondary/20 rounded-2xl outline-none font-bold"
                    >
                      <option value="">--Select Category--</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Customer</label>
                    <select 
                      value={formData.customerId}
                      onChange={e => {
                        const member = members.find(m => m.id === e.target.value);
                        setFormData({
                          ...formData, 
                          customerId: e.target.value,
                          customerName: member?.parentName || '',
                          mobileNumber: member?.mobileNumber || ''
                        });
                      }}
                      className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent focus:border-secondary/20 rounded-2xl outline-none font-bold"
                    >
                      <option value="">--Select Customer--</option>
                      {members.map(m => <option key={m.id} value={m.id}>{m.parentName} ({m.childName})</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Booking Charges</label>
                    <input 
                      type="number" required
                      value={formData.bookingCharges}
                      onChange={e => setFormData({...formData, bookingCharges: parseInt(e.target.value) || 0})}
                      className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent focus:border-secondary/20 rounded-2xl outline-none font-black"
                    />
                  </div>

                  <div className="md:col-span-2 p-5 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Other Services</h4>
                    <div className="flex gap-3">
                      <select 
                        onChange={e => handleAddServiceToBooking(e.target.value)}
                        className="flex-1 px-4 py-2 bg-white border border-slate-200 rounded-xl font-bold text-sm"
                        value=""
                      >
                        <option value="">--Select Services--</option>
                        {services.map(s => <option key={s.id} value={s.id}>{s.name} - {formatCurrency(s.price)}</option>)}
                      </select>
                      <select 
                        value={formData.theme}
                        onChange={e => setFormData({...formData, theme: e.target.value})}
                        className="w-32 px-4 py-2 bg-white border border-slate-200 rounded-xl font-bold text-sm"
                      >
                        <option value="Barbie">Barbie</option>
                        <option value="Jungle">Jungle</option>
                        <option value="Space">Space</option>
                        <option value="SuperHero">SuperHero</option>
                      </select>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-[10px]">
                        <thead>
                          <tr className="text-slate-400 border-b border-slate-200">
                            <th className="pb-2">Sr. No.</th>
                            <th className="pb-2">Services</th>
                            <th className="pb-2">Price</th>
                            <th className="pb-2">Theme</th>
                            <th className="pb-2 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {formData.selectedServices.map((s, idx) => (
                            <tr key={s.serviceId}>
                              <td className="py-2">{idx + 1}</td>
                              <td className="py-2 font-bold">{s.name}</td>
                              <td className="py-2 text-secondary font-black">{formatCurrency(s.price)}</td>
                              <td className="py-2 font-medium">{s.theme}</td>
                              <td className="py-2 text-right">
                                <button type="button" onClick={() => removeServiceFromBooking(s.serviceId)} className="text-red-400 hover:text-red-500"><X size={14} /></button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Grand Total</label>
                    <div className="px-5 py-3 bg-slate-900 text-primary font-black rounded-2xl text-xl shadow-inner">
                      {formatCurrency(totals.grandTotal)}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Gst (%)</label>
                    <input 
                      type="number"
                      value={formData.gstPercentage}
                      onChange={e => setFormData({...formData, gstPercentage: parseInt(e.target.value) || 0})}
                      className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent focus:border-secondary/20 rounded-2xl outline-none font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Advance</label>
                    <input 
                      type="number"
                      value={formData.advancePaid}
                      onChange={e => setFormData({...formData, advancePaid: parseInt(e.target.value) || 0})}
                      className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent focus:border-secondary/20 rounded-2xl outline-none font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Paymode</label>
                    <select 
                      value={formData.payMode}
                      onChange={e => setFormData({...formData, payMode: e.target.value as any})}
                      className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent focus:border-secondary/20 rounded-2xl outline-none font-bold"
                    >
                      <option value="upi">UPI / QR</option>
                      <option value="cash">Cash</option>
                      <option value="card">Card</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Payment Status</label>
                    <select 
                      value={formData.paymentStatus}
                      onChange={e => setFormData({...formData, paymentStatus: e.target.value as any})}
                      className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent focus:border-secondary/20 rounded-2xl outline-none font-bold"
                    >
                      <option value="pending">Pending</option>
                      <option value="partial">Partial</option>
                      <option value="paid">Paid</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Booking Date</label>
                    <input 
                      type="date" required
                      value={formData.date}
                      onChange={e => setFormData({...formData, date: e.target.value})}
                      className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent focus:border-secondary/20 rounded-2xl outline-none font-bold uppercase"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button" 
                    onClick={() => { setShowAddModal(false); setEditingEvent(null); }}
                    className="flex-1 py-4 bg-slate-100 text-slate-500 font-black rounded-2xl hover:bg-slate-200 transition-all uppercase tracking-widest text-xs"
                  >
                    Discard
                  </button>
                  <button 
                    type="submit"
                    className="flex-[2] py-4 bg-secondary text-white font-black text-lg rounded-2xl shadow-xl shadow-secondary/20 hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    {editingEvent ? 'Save Changes' : 'Confirm Booking ✨'}
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
