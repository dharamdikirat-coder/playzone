import React from 'react';
import { Invoice } from '../types';
import { Receipt } from 'lucide-react';
import { usePlayZone } from '../hooks/usePlayZone';

import { cn } from '../lib/utils';

interface ThermalReceiptProps {
  invoice: Invoice | null;
}

export default function ThermalReceipt({ invoice }: ThermalReceiptProps) {
  const { businessProfile } = usePlayZone();
  if (!invoice || !invoice.items) return null;

  const handlePrint = () => {
    window.print();
  };

  // Helper to find specific costs for the receipt layout
  const planItem = invoice.items.find(i => i && i.type === 'service');
  const smallSocks = invoice.items.find(i => i && i.id === 'SOCKS-S');
  const mediumSocks = invoice.items.find(i => i && i.id === 'SOCKS-M');
  const socksCost = (smallSocks?.amount || 0) + (mediumSocks?.amount || 0);

  // Categories for breakdown
  const gstBreakdown = invoice.items.reduce((acc, item) => {
    const gstSlab = Number(item.gstSlab || 0);
    if (gstSlab === 0) return acc;
    
    const key = `GST @${gstSlab}%`;
    const amount = Number(item.amount || 0);
    const itemGst = amount - (amount / (1 + gstSlab / 100));
    acc[key] = (acc[key] || 0) + itemGst;
    return acc;
  }, {} as Record<string, number>);

  // Add overtime GST to breakdown (assume 18% as it is a service)
  const overtimeAmount = Number(invoice.overtimeAmount || 0);
  if (overtimeAmount > 0) {
    const overtimeGstSlab = 18;
    const key = `GST @${overtimeGstSlab}%`;
    const overtimeGst = overtimeAmount - (overtimeAmount / (1 + overtimeGstSlab / 100));
    gstBreakdown[key] = (gstBreakdown[key] || 0) + overtimeGst;
  }

  return (
    <div className="bg-white p-2 w-full max-w-[80mm] text-slate-900 font-mono text-[10px]">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { 
            margin: 0; 
            size: 80mm auto;
          }
          html, body {
            width: 80mm;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff;
          }
          body * { 
            visibility: hidden; 
          }
          .print-area, .print-area * { 
            visibility: visible !important; 
          }
          .print-area { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 82mm !important;
            padding: 4mm 2mm !important;
            margin: 0 !important;
            background: white !important;
            color: #000 !important;
            font-size: 12pt !important;
            line-height: 1.2 !important;
            font-family: 'Courier New', Courier, monospace !important;
          }
          .print-area h1 { font-size: 20pt !important; font-weight: 900 !important; margin-bottom: 4pt !important; color: #000 !important; }
          .print-area p, .print-area span, .print-area div, .print-area td, .print-area th { 
            color: #000 !important; 
            font-weight: 900 !important; 
          }
          .border-print { border-color: #000 !important; border-width: 2px !important; }
          .no-print { display: none !important; }
          .bg-print-dark { background-color: #000 !important; color: #fff !important; }
        }
      `}} />
      
      <div className="print-area space-y-4">
        {/* Header section matches image */}
        <div className="text-center space-y-1 pb-2 border-b-2 border-black border-print">
          <div className="flex justify-center mb-2">
             <div className="w-24 h-20 flex items-center justify-center overflow-hidden grayscale">
                {businessProfile?.logo && (businessProfile.logo.startsWith('data:image') || businessProfile.logo.startsWith('http') || businessProfile.logo.startsWith('/')) ? (
                   <img src={businessProfile.logo} alt="Logo" className="max-w-full max-h-full object-contain" />
                ) : (
                   <div className="text-4xl">🎡</div>
                )}
             </div>
          </div>
          <h1 className="text-2xl font-black leading-none uppercase text-black">{businessProfile.name}</h1>
          <p className="font-black text-[12pt] text-black">{businessProfile.subName || 'Indoor Kids Play Area'}</p>
          <p className="text-[10pt] font-black leading-tight text-black">({businessProfile.unitName || 'A unit of Sudershan Business Solutions'})</p>
          <p className="leading-tight text-[10pt] font-black text-black max-w-[240px] mx-auto">{businessProfile.address || '2nd Floor, Plot 17, Sector-6, Channi Himmat, Jammu, J&K'}</p>
          <div className="flex flex-col gap-0.5 mt-2">
            <p className="font-black text-[11pt] text-black">GST No: {businessProfile.gstNo || '01AF1FS7527R1ZD'}</p>
            <p className="text-[11pt] font-black text-black">Mob: {businessProfile.mobile || '9596913030, 9796220727'}</p>
          </div>
        </div>

        {/* Bill Info Grid */}
        <div className="border-b-2 border-black border-print pb-3 space-y-2 px-1">
          <div className="flex justify-between items-start">
            <div className="flex flex-col">
              <span className="font-black text-[11pt]">Bill No:</span>
              <span className="font-black text-[16pt] text-black tracking-tighter">{invoice.invoiceNumber}</span>
            </div>
            <div className="flex flex-col text-right">
              <span className="font-black text-[11pt]">Date: {new Date(invoice.date).toLocaleDateString('en-IN', { month: 'short', day: '2-digit', year: 'numeric' })}</span>
              <span className="font-black text-[11pt]">{new Date(invoice.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-2">
            <div className="flex flex-col">
              <span className="font-black text-[11pt]">Customer:</span>
              <span className="font-black text-[12pt] uppercase text-black">{invoice.customerName}</span>
            </div>
            <div className="flex flex-col text-right">
              <span className="font-black text-[11pt]">Mobile No:</span>
              <span className="font-black text-[12pt] text-black">{invoice.mobileNumber}</span>
            </div>
          </div>
          <div className="flex justify-between items-center bg-black text-white p-1 px-2 rounded-sm mt-1">
             <span className="font-black text-[10pt] uppercase">Handled By:</span>
             <span className="font-black text-[10pt] uppercase">{invoice.staffId || 'Administrator'}</span>
          </div>
        </div>

        {/* Table items */}
        <div className="border-b-2 border-black border-print">
           <div className="flex justify-between font-black uppercase text-[11pt] bg-black text-white px-2 py-1.5 mb-1">
            <span className="w-2/3">Services & Items</span>
            <span className="w-1/3 text-right">Amount (₹)</span>
           </div>
           
           <div className="divide-y-2 divide-black border-print">
             {/* Plan items breakdown as in image */}
             {invoice.items.filter(i => i && i.type === 'service').map((item, idx) => (
                <div key={idx} className="px-1 py-2 space-y-1">
                  <div className="flex justify-between font-black text-[12pt]">
                    <span className="capitalize">{item.description}</span>
                    <span>{Number(item.amount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[11pt] font-black">
                    <span>No of Persons:</span>
                    <span>{item.quantity}</span>
                  </div>
                  <div className="flex justify-between text-[11pt] font-black italic">
                    <span>Base Price (ea):</span>
                    <span>{Number(item.unitPrice).toFixed(2)}</span>
                  </div>
                </div>
             ))}
             
             {/* Product items (Socks, etc) */}
             {invoice.items.filter(i => i && i.type === 'product').map((item, idx) => (
                <div key={`prod-${idx}`} className="px-1 py-2 space-y-1">
                  <div className="flex justify-between font-black text-[12pt]">
                    <span>{item.description} (x{item.quantity})</span>
                    <span>{Number(item.amount).toFixed(2)}</span>
                  </div>
                </div>
             ))}

             {/* Common details */}
             <div className="px-1 py-2 space-y-1.5 pt-3">
                <div className="flex justify-between font-black text-[11pt]">
                  <span>Plan Subtotal:</span>
                  <span>{(invoice.totalBaseAmount || 0).toFixed(2)}</span>
                </div>
                {overtimeAmount > 0 && (
                  <div className="flex justify-between font-black text-[11pt]">
                    <span>Extra/Overtime Charges:</span>
                    <span>{(overtimeAmount || 0).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-[12pt] border-t border-black pt-1 border-print">
                  <span>Gross Total (Tax Incl.):</span>
                  <span>{(Number(invoice.totalAmount + (overtimeAmount || 0))).toFixed(2)}</span>
                </div>
             </div>
           </div>
        </div>

        {/* GST and Totals breakdown */}
        <div className="pt-2 space-y-1.5 px-1 border-b-2 border-black border-print pb-4">
            <div className="bg-black text-white p-1 px-2 text-center font-black uppercase text-[10pt] mb-2">GST SUMMARY</div>
            {Object.entries(gstBreakdown).map(([label, val]) => (
                <div key={label} className="flex justify-between font-black text-[11pt]">
                  <span>{label}:</span>
                  <span>{val.toFixed(2)}</span>
                </div>
            ))}
            <div className="flex justify-between font-black border-t-2 border-black pt-2 border-print">
              <span className="text-[12pt]">Total GST Amount:</span>
              <span className="text-[12pt]">{(Object.values(gstBreakdown).reduce((a, b) => a + b, 0)).toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between text-[18pt] font-black pt-2 mb-2 bg-black text-white px-2 py-1">
              <span>NET PAYABLE:</span>
              <span>₹{(invoice.totalAmount + (overtimeAmount || 0)).toFixed(2)}</span>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-1">
              <div className="flex justify-between font-black text-[11pt]">
                <span>Discount:</span>
                <span>{(invoice.discount || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-black text-[11pt]">
                <span>Method:</span>
                <span className="uppercase">{invoice.paymentMode}</span>
              </div>
            </div>
            
            <div className="flex justify-between font-black text-[12pt] text-black">
              <span>Paid Amount:</span>
              <span>₹{(invoice.totalAmount + (overtimeAmount || 0)).toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-black text-[12pt]">
              <span>Balance:</span>
              <span className={cn(invoice.status === 'pending' ? "text-red-600" : "text-black")}>0.00</span>
            </div>
        </div>

        <div className="text-center text-[11pt] font-black pt-4 uppercase italic leading-tight px-4 space-y-1">
          <p>*** Thank you for visiting FunkyLand! ***</p>
          <p>Tell your friends about us!</p>
          <div className="pt-2 flex justify-center gap-4 text-[9pt]">
            <span>www.funkyland.com</span>
          </div>
        </div>
      </div>

      <button 
        onClick={handlePrint}
        className="w-full py-4 mt-6 bg-slate-900 text-white font-black rounded-2xl hover:bg-slate-800 transition-all no-print flex items-center justify-center gap-2 shadow-xl shadow-slate-900/20"
      >
        <Receipt size={18} />
        PRINT THERMAL RECEIPT
      </button>
    </div>
  );
}
