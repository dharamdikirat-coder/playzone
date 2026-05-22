
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Clipboard, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';

interface PasteImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const IMPORT_TYPES = [
  { id: 'members', label: 'Members Data' },
  { id: 'walk_in', label: 'Walk-in (V1)' },
  { id: 'walk_in_v2', label: 'Walk-in (V2)' },
  { id: 'accounting', label: 'Expenses' },
];

export default function PasteImportModal({ isOpen, onClose, onSuccess }: PasteImportModalProps) {
  const [type, setType] = useState('walk_in');
  const [pasteData, setPasteData] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleProcess = async () => {
    if (!pasteData.trim()) {
      setError('Please paste some data first');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Parse TSV
      const rawLines = pasteData.trim().split('\n');
      
      // Filter out lines that look like timestamps or are empty
      // A data line should have multiple tabs
      const lines = rawLines.filter(line => {
        const tabs = line.split('\t').length;
        return tabs > 3 && line.trim().length > 0;
      });

      if (lines.length < 2) {
        throw new Error('Data must include headers and at least one row. Ensure you are copying headers too.');
      }

      const headers = lines[0].split('\t').map(h => h.trim().toLowerCase().replace(/[\s_]/g, ''));
      const data = lines.slice(1).map(line => {
        const values = line.split('\t');
        const obj: any = {};
        headers.forEach((header, index) => {
          let val: any = values[index] ? values[index].trim() : null;
          
          if (val !== null && val !== '' && !isNaN(Number(val.replace(/,/g, '')))) {
            val = Number(val.replace(/,/g, ''));
          }
          
          // Map headers to schema keys
          let key = header;
          // Members
          if (header === 'phonenumber' || header === 'phone' || header === 'mobile' || header === 'mobilenumber') key = 'phoneNumber';
          if (header === 'parentname' || header === 'parent') key = 'parentName';
          if (header === 'childname' || header === 'child') key = 'childName';
          if (header === 'childage' || header === 'age') key = 'childAge';
          if (header === 'plan' || header === 'planid') key = 'planId';
          // Expenses
          if (header === 'vendor' || header === 'vendorname') key = 'vendorName';
          if (header === 'amount' || header === 'price') key = 'amount';
          if (header === 'category' || header === 'type') key = 'category';
          // Walk-In V1
          if (header === 'billno' || header === 'invoice' || header === 'invoiceno') key = 'billno';
          if (header === 'cid' || header === 'customerid') key = 'cid';
          if (header === 'mode' || header === 'paymentmode') key = 'mode';
          if (header === 'paybleamount' || header === 'payableamount' || header === 'payable') key = 'paybleamount';
          if (header === 'grandtotal' || header === 'total') key = 'grandtotal';
          if (header === 'planamount' || header === 'planprice') key = 'planamount';
          if (header === 'totalshokescost' || header === 'sockscost') key = 'totalshokescost';
          if (header === 'noofperson' || header === 'persons') key = 'noofperson';
          if (header === 'noofpare' || header === 'socks' || header === 'pairs') key = 'noofpare';
          if (header === 'insdate' || header === 'date') key = 'insdate';
          // Walk-In V2
          if (header === 'memberid') key = 'memberid';
          if (header === 'mno' || header === 'phone' || header === 'mobile') key = 'mno';
          if (header === 'validationdate') key = 'validationdate';
          if (header === 'shokesprice') key = 'shokesprice';
          
          obj[key] = val;
        });
        return obj;
      });

      console.log('Sending data:', data);

      const res = await fetch(`/api/import-json/${type}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      let result: any;
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        result = await res.json();
      } else {
        const text = await res.text();
        console.error('Non-JSON response:', text);
        throw new Error(`Server returned non-JSON response (${res.status}). Check if the data format is correct.`);
      }

      if (result.success) {
        alert(`Successfully imported ${result.count} records!`);
        onSuccess();
        onClose();
        setPasteData('');
      } else {
        setError(result.error || 'Import failed');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                  <Clipboard size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 italic">Paste Import</h3>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Copy from Excel/Google Sheets</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-slate-100 rounded-xl transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
              <div className="space-y-3">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                  1. Select Data Type
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {IMPORT_TYPES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setType(t.id)}
                      className={cn(
                        "px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border-2",
                        type === t.id 
                          ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200" 
                          : "bg-white border-slate-100 text-slate-400 hover:border-indigo-200 hover:text-slate-600"
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 flex justify-between">
                  <span>2. Paste Data (TSV Format)</span>
                  <button 
                    onClick={() => setPasteData('')}
                    className="text-[10px] text-rose-500 hover:underline uppercase font-black"
                  >
                    Clear
                  </button>
                </label>
                <textarea
                  value={pasteData}
                  onChange={(e) => setPasteData(e.target.value)}
                  placeholder="Paste your Excel columns here (including headers)..."
                  className="w-full h-64 p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-mono text-xs custom-scrollbar resize-none"
                />
                <div className="flex gap-4 px-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                    Headers required
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    Tab-separated
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-4 bg-rose-50 border-2 border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600">
                  <AlertCircle size={18} />
                  <p className="text-xs font-bold">{error}</p>
                </div>
              )}
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                onClick={onClose}
                className="px-6 py-3 text-slate-400 font-black text-xs uppercase tracking-widest hover:text-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={isProcessing || !pasteData.trim()}
                onClick={handleProcess}
                className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white font-black rounded-2xl shadow-lg shadow-indigo-200 hover:scale-105 active:scale-95 transition-all text-xs uppercase tracking-widest disabled:opacity-50 disabled:scale-100 disabled:hover:scale-100"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    Import Data
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
