import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Download, Edit3, CheckCircle2, Building, User, Calendar, CreditCard } from 'lucide-react';
import { Invoice, InvoiceItem, Customer } from '../types';
import { storageService } from '../services/storageService';
import { generateInvoicePDF } from '../services/pdfService';
import { formatFinnishCurrency, formatFinnishIban, formatFinnishReference } from '../services/formatUtils';

const InvoiceForm: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const businessInfo = storageService.getBusinessInfo();

  const [invoice, setInvoice] = useState<Invoice>(() => {
    const editId = localStorage.getItem('flow_edit_invoice_id');
    const copyId = localStorage.getItem('flow_copy_invoice_id');
    const invoices = storageService.getInvoices();

    if (editId) {
      const source = invoices.find(i => i.id === editId);
      if (source) return source;
    }

    if (copyId) {
      const source = invoices.find(i => i.id === copyId);
      if (source) {
        return {
          ...source,
          id: '',
          invoiceNumber: '',
          invoiceDate: new Date().toISOString().split('T')[0],
          dueDate: '',
          referenceNumber: '',
          isPaid: false,
          items: source.items.map(i => ({ ...i, id: storageService.generateId() })),
          createdAt: new Date().toISOString()
        };
      }
    }

    // Default Empty Invoice
    return {
      id: '',
      invoiceNumber: '',
      invoiceDate: new Date().toISOString().split('T')[0],
      dueDate: '',
      paymentDuration: 14,
      referenceNumber: '',
      isPaid: false,
      
      senderName: businessInfo.name,
      senderBusinessId: businessInfo.businessId,
      senderAddress: businessInfo.address,
      senderEmail: businessInfo.email,
      senderPhone: businessInfo.phone,
      senderIban: businessInfo.bankAccounts[0]?.iban || '',
      senderBic: businessInfo.bankAccounts[0]?.bic || '',

      recipientName: '',
      recipientEmail: '',
      recipientAddress: '',
      
      message: '',
      items: [],
      createdAt: new Date().toISOString()
    };
  });

  const [isEditingMode] = useState(() => !!localStorage.getItem('flow_edit_invoice_id'));
  const [totals, setTotals] = useState({ exclVat: 0, vat: 0, total: 0 });
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setCustomers(storageService.getCustomers());
    
    localStorage.removeItem('flow_edit_invoice_id');
    localStorage.removeItem('flow_copy_invoice_id');

    if (!invoice.id && !isEditingMode) {
      const nextNum = storageService.getNextInvoiceNumber();
      const date = new Date(invoice.invoiceDate);
      date.setDate(date.getDate() + invoice.paymentDuration);
      
      const currentYear = new Date().getFullYear();
      const refBase = `${currentYear}${nextNum.padStart(4, '0')}`;
      const finalRef = storageService.calculateFinnishReference(refBase);
      
      setInvoice(prev => ({ 
        ...prev, 
        id: storageService.generateId(),
        invoiceNumber: nextNum,
        referenceNumber: finalRef,
        dueDate: date.toISOString().split('T')[0]
      }));
    } else if (invoice.id === '' && !isEditingMode) {
      setInvoice(prev => ({ ...prev, id: storageService.generateId() }));
    }
  }, []);

  useEffect(() => {
    let excl = 0;
    let vatSum = 0;

    invoice.items.forEach(item => {
      const gross = (item.quantity || 0) * (item.unitPrice || 0);
      const rate = item.vatRate || 0;
      const net = rate > 0 ? gross / (1 + (rate / 100)) : gross;
      const vat = gross - net;

      excl += net;
      vatSum += vat;
    });

    setTotals({
      exclVat: excl,
      vat: vatSum,
      total: excl + vatSum
    });
  }, [invoice.items]);

  const handleDateOrDurationChange = (field: 'invoiceDate' | 'paymentDuration', val: any) => {
    const newDateStr = field === 'invoiceDate' ? val : invoice.invoiceDate;
    const newDur = field === 'paymentDuration' ? parseInt(val) || 0 : invoice.paymentDuration;

    const d = new Date(newDateStr);
    d.setDate(d.getDate() + newDur);

    setInvoice(prev => ({
      ...prev,
      [field]: val,
      dueDate: !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : prev.dueDate
    }));
  };

  const handleDueDateChange = (newDueDate: string) => {
    const start = new Date(invoice.invoiceDate);
    const end = new Date(newDueDate);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    setInvoice(prev => ({
      ...prev,
      dueDate: newDueDate,
      paymentDuration: diffDays >= 0 ? diffDays : 0
    }));
  };

  const addItem = () => {
    const newItem: InvoiceItem = {
      id: storageService.generateId(),
      description: '',
      dateOfWork: invoice.invoiceDate,
      quantity: 1,
      unit: 'item',
      unitPrice: 0,
      vatRate: 25.5
    };
    setInvoice(prev => ({ ...prev, items: [...prev.items, newItem] }));
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...invoice.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setInvoice(prev => ({ ...prev, items: newItems }));
  };

  const removeItem = (index: number) => {
    setInvoice(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleSave = () => {
    if (!invoice.recipientName.trim()) {
      alert("Syötä asiakkaan nimi (Recipient Name).");
      return;
    }
    if (invoice.items.length === 0) {
      alert("Lisää vähintään yksi laskurivi (Services/Products).");
      return;
    }

    storageService.saveInvoice(invoice);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleExport = () => {
    generateInvoicePDF(invoice);
  };

  const handleCustomerSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const custId = e.target.value;
    const customer = customers.find(c => c.id === custId);
    if (customer) {
      setInvoice(prev => ({
        ...prev,
        recipientId: customer.id,
        recipientName: customer.name,
        recipientBusinessId: customer.businessId,
        recipientEmail: customer.email,
        recipientAddress: customer.address
      }));
    }
  };

  const handleBankSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const bankId = e.target.value;
    const bank = businessInfo.bankAccounts.find(b => b.id === bankId);
    if (bank) {
      setInvoice({ ...invoice, senderIban: bank.iban, senderBic: bank.bic });
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 animate-fadeIn max-w-4xl mx-auto pb-12">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[#003580] text-white flex items-center justify-center font-bold shadow-sm shrink-0">
            {isEditingMode ? <Edit3 size={18} /> : <Plus size={18} />}
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight truncate">
              {isEditingMode ? 'Edit Invoice' : 'New Invoice'}
            </h1>
            <p className="text-xs text-slate-500 font-medium truncate">
              Finnish Sales Invoice (Compliant with Accounting Act)
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-auto">
          <label className="flex items-center space-x-2 cursor-pointer bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-2xs hover:bg-slate-50 transition min-h-[44px]">
            <input 
              type="checkbox" 
              checked={invoice.isPaid} 
              onChange={(e) => setInvoice({...invoice, isPaid: e.target.checked})}
              className="w-4 h-4 rounded border-slate-300 text-[#003580] focus:ring-[#003580]"
            />
            <span className="text-xs font-bold text-slate-700">Marked as Paid</span>
          </label>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center space-x-2 animate-in fade-in">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>Invoice saved successfully! You can download the PDF or view it on the Dashboard.</span>
        </div>
      )}

      {/* Grouped Inset Section 1: Basic Invoice Identifiers */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
        <h3 className="text-xs font-bold text-[#003580] uppercase tracking-wider">
          1. Basic Invoice Details
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Invoice Number</label>
            <input 
              type="text" 
              value={invoice.invoiceNumber}
              onChange={(e) => setInvoice({...invoice, invoiceNumber: e.target.value})}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-base sm:text-sm font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#003580] min-h-[44px]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Invoice Date</label>
            <input 
              type="date" 
              value={invoice.invoiceDate}
              onChange={(e) => handleDateOrDurationChange('invoiceDate', e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-base sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#003580] min-h-[44px]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Due Date</label>
            <input 
              type="date" 
              value={invoice.dueDate}
              onChange={(e) => handleDueDateChange(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-base sm:text-sm font-bold text-[#003580] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#003580] min-h-[44px]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Payment Terms (days)</label>
            <input 
              type="number" 
              value={invoice.paymentDuration}
              onChange={(e) => handleDateOrDurationChange('paymentDuration', e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-base sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#003580] min-h-[44px]"
            />
          </div>
        </div>
      </div>

      {/* Grouped Inset Section 2: Recipient and Bank Account */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Recipient */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200/80 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between pb-1">
            <h3 className="text-xs font-bold text-[#003580] uppercase tracking-wider">
              2. Recipient (Customer)
            </h3>
            {customers.length > 0 && (
              <select 
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 cursor-pointer min-h-[36px] max-w-[170px] truncate"
                onChange={handleCustomerSelect}
                defaultValue=""
              >
                <option value="" disabled>Saved customer...</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Customer / Company Name *</label>
              <input 
                placeholder="e.g. Acme Oy or Jane Doe" 
                value={invoice.recipientName} 
                onChange={(e) => setInvoice({...invoice, recipientName: e.target.value})} 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-base sm:text-sm text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#003580] min-h-[44px]" 
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Invoice Email</label>
              <input 
                placeholder="billing@client.com" 
                value={invoice.recipientEmail} 
                onChange={(e) => setInvoice({...invoice, recipientEmail: e.target.value})} 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-base sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#003580] min-h-[44px]" 
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Billing Address</label>
              <textarea 
                placeholder="Street address, postal code and city" 
                rows={2} 
                value={invoice.recipientAddress} 
                onChange={(e) => setInvoice({...invoice, recipientAddress: e.target.value})} 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-base sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#003580]" 
              />
            </div>
          </div>
        </div>

        {/* Bank & Reference */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200/80 shadow-xs space-y-3.5">
          <h3 className="text-xs font-bold text-[#003580] uppercase tracking-wider">
            3. Bank Details & Reference
          </h3>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Finnish Reference Number (Viitenumero)</label>
              <input 
                type="text" 
                value={invoice.referenceNumber}
                onChange={(e) => setInvoice({...invoice, referenceNumber: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-base sm:text-sm font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#003580] min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Billing Bank Account</label>
              <select 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-base sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#003580] min-h-[44px]"
                onChange={handleBankSelect}
                value={businessInfo.bankAccounts.find(b => b.iban === invoice.senderIban)?.id || ''}
              >
                {businessInfo.bankAccounts.map(b => (
                  <option key={b.id} value={b.id}>{b.label} ({b.iban.slice(-4)})</option>
                ))}
              </select>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 text-xs text-slate-600 space-y-1">
              <div className="flex justify-between">
                <span>IBAN:</span>
                <span className="font-mono tabular-nums font-semibold text-slate-900">{formatFinnishIban(invoice.senderIban) || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span>BIC:</span>
                <span className="font-mono text-slate-700">{invoice.senderBic || '—'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grouped Inset Section 3: Services / Products Line Items */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-[#003580] uppercase tracking-wider">
            4. Line Items (Goods & Services)
          </h3>
          <span className="text-xs font-mono font-bold text-slate-900 tabular-nums">
            {formatFinnishCurrency(totals.total)}
          </span>
        </div>

        <div className="space-y-3">
          {invoice.items.map((item, index) => (
            <div 
              key={item.id} 
              className="bg-slate-50/70 p-3.5 sm:p-4 rounded-xl border border-slate-200 space-y-3"
            >
              {/* Responsive Line Item: Apple HIG Inset Card Layout */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
                <div className="sm:col-span-4">
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Description / Specification *</label>
                  <input 
                    placeholder="e.g. Web development services" 
                    value={item.description} 
                    onChange={(e) => updateItem(index, 'description', e.target.value)} 
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-base sm:text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#003580] min-h-[44px]" 
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Date of Work</label>
                  <input 
                    type="date" 
                    value={item.dateOfWork} 
                    onChange={(e) => updateItem(index, 'dateOfWork', e.target.value)} 
                    className="w-full bg-white border border-slate-200 rounded-xl px-2 py-2 text-base sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#003580] min-h-[44px]" 
                  />
                </div>

                <div className="grid grid-cols-2 sm:col-span-3 gap-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 block">Quantity</label>
                    <input 
                      type="number" 
                      step="0.5" 
                      value={item.quantity} 
                      onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)} 
                      className="w-full bg-white border border-slate-200 rounded-xl px-2 py-2 text-base sm:text-sm text-center font-mono font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#003580] min-h-[44px]" 
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 block">Unit Price</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      value={item.unitPrice} 
                      onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)} 
                      className="w-full bg-white border border-slate-200 rounded-xl px-2 py-2 text-base sm:text-sm text-right font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#003580] min-h-[44px]" 
                    />
                  </div>
                </div>

                <div className="sm:col-span-3">
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">VAT Rate (ALV)</label>
                  <select 
                    value={item.vatRate} 
                    onChange={(e) => updateItem(index, 'vatRate', parseFloat(e.target.value))} 
                    className="w-full bg-white border border-slate-200 rounded-xl px-2 py-2 text-base sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#003580] min-h-[44px]"
                  >
                    <option value={25.5}>25.5% (Standard 2026)</option>
                    <option value={13.5}>13.5% (Reduced 2026)</option>
                    <option value={10}>10% (Books, periodicals)</option>
                    <option value={0}>0% (Zero-rate / Intra-EU)</option>
                  </select>
                </div>
              </div>

              {/* Row Total & Delete button */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs sm:text-sm">
                <span className="font-mono text-slate-600">
                  Line Total: <strong className="font-bold text-slate-900 tabular-nums">{formatFinnishCurrency((item.quantity || 0) * (item.unitPrice || 0))}</strong>
                </span>
                <button 
                  onClick={() => removeItem(index)} 
                  className="p-2 text-slate-400 hover:text-rose-600 active:scale-95 transition min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg"
                  title="Delete row"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}

          {invoice.items.length === 0 && (
            <div className="py-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
              No line items. Click the button below to add goods or services.
            </div>
          )}
        </div>

        <button 
          onClick={addItem} 
          className="flex items-center text-[#003580] hover:text-[#002255] font-semibold text-xs transition min-h-[40px]"
        >
          <Plus size={16} className="mr-1" />
          <span>Add Line Item</span>
        </button>
      </div>

      {/* Summary & Save Action Bar */}
      <div className="bg-[#EDF4FC]/80 rounded-2xl p-5 sm:p-6 border border-[#BFDBFE] flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
        <div className="space-y-1.5 min-w-0">
          <div className="flex justify-between text-xs text-slate-600">
            <span>Total (excl. VAT / net):</span>
            <span className="font-mono font-medium tabular-nums ml-4">{formatFinnishCurrency(totals.exclVat)}</span>
          </div>
          <div className="flex justify-between text-xs text-slate-600">
            <span>Total VAT:</span>
            <span className="font-mono font-medium tabular-nums ml-4">{formatFinnishCurrency(totals.vat)}</span>
          </div>
          <div className="flex justify-between text-base font-bold text-slate-900 pt-1 border-t border-[#BFDBFE]">
            <span>Total Payable:</span>
            <span className="font-mono text-[#003580] tabular-nums ml-4">{formatFinnishCurrency(totals.total)}</span>
          </div>
        </div>

        <div className="flex items-center space-x-2 pt-2 md:pt-0">
          <button 
            onClick={handleSave} 
            className="flex-1 md:flex-initial flex items-center justify-center px-5 py-2.5 bg-white text-[#003580] font-semibold text-xs rounded-xl hover:bg-slate-50 transition shadow-xs border border-slate-200 min-h-[44px]"
          >
            <Save size={16} className="mr-1.5" /> 
            <span>{isEditingMode ? 'Update Invoice' : 'Save Invoice'}</span>
          </button>
          <button 
            onClick={handleExport} 
            className="flex-1 md:flex-initial flex items-center justify-center px-5 py-2.5 bg-[#003580] hover:bg-[#002868] text-white font-semibold text-xs rounded-xl transition shadow-xs min-h-[44px]"
          >
            <Download size={16} className="mr-1.5" /> 
            <span>Download PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvoiceForm;
