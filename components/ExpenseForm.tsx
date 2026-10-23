import React, { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, Save, Upload, Sparkles, Loader2, Check, Edit3, ArrowLeft, CheckCircle2, Link2, ExternalLink } from 'lucide-react';
import { Expense, ExpenseItem, ExpenseCategory } from '../types';
import { storageService } from '../services/storageService';
import { analyzeReceipt } from '../services/geminiService';
import { formatFinnishCurrency } from '../services/formatUtils';

const ExpenseForm: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [expense, setExpense] = useState<Expense>(() => {
    const editId = localStorage.getItem('flow_edit_expense_id');
    const copyId = localStorage.getItem('flow_copy_expense_id');
    const expenses = storageService.getExpenses();

    if (editId) {
      const source = expenses.find(e => e.id === editId);
      if (source) return source;
    }

    if (copyId) {
      const source = expenses.find(e => e.id === copyId);
      if (source) {
        return {
          ...source,
          id: storageService.generateId(),
          items: source.items.map(i => ({ ...i, id: storageService.generateId() })),
          createdAt: new Date().toISOString()
        };
      }
    }

    return {
      id: storageService.generateId(),
      paymentDate: new Date().toISOString().split('T')[0],
      items: [],
      createdAt: new Date().toISOString()
    };
  });

  const [isEditingMode] = useState(() => !!localStorage.getItem('flow_edit_expense_id'));

  useEffect(() => {
    localStorage.removeItem('flow_edit_expense_id');
    localStorage.removeItem('flow_copy_expense_id');
    if (expense.items.length === 0 && !isEditingMode) {
      addRow();
    }
  }, []);

  const totalExpense = expense.items.reduce((acc, item) => acc + (item.amount || 0), 0);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64Data = e.target?.result as string;
      const cleanBase64 = base64Data.split(',')[1];
      setExpense(prev => ({ ...prev, receiptUrl: base64Data }));
      try {
        setIsAnalyzing(true);
        const analysis = await analyzeReceipt(cleanBase64, file.type);
        if (analysis) {
          const newItems: ExpenseItem[] = analysis.items.map((item: any) => ({
            id: storageService.generateId(),
            description: item.description || 'Receipt purchase',
            amount: item.amount || 0,
            category: Object.values(ExpenseCategory).includes(item.category) 
              ? item.category 
              : ExpenseCategory.SERVICE,
            vatRate: 25.5
          }));
          setExpense(prev => ({ 
            ...prev, 
            paymentDate: analysis.date || prev.paymentDate, 
            items: [...prev.items.filter(i => i.description.trim() !== ''), ...newItems] 
          }));
        }
      } catch (err) { 
        alert("Receipt received. You can review or fill in the expense items manually below."); 
      } finally { 
        setIsAnalyzing(false); 
      }
    };
    reader.readAsDataURL(file);
  };

  const addRow = () => {
    const newItem: ExpenseItem = { 
      id: storageService.generateId(), 
      description: '', 
      amount: 0, 
      category: ExpenseCategory.SERVICE,
      vatRate: 25.5
    };
    setExpense(prev => ({ ...prev, items: [...prev.items, newItem] }));
  };

  const updateItem = (index: number, field: keyof ExpenseItem, value: any) => {
    const newItems = [...expense.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setExpense({ ...expense, items: newItems });
  };

  const removeItem = (index: number) => {
    setExpense({
      ...expense,
      items: expense.items.filter((_, i) => i !== index)
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (expense.items.length === 0) {
      alert("Please add at least one expense item.");
      return;
    }
    const hasInvalid = expense.items.some(i => !i.description.trim() || isNaN(i.amount) || i.amount <= 0);
    if (hasInvalid) {
      alert("Please ensure all items have a description and an amount greater than 0.");
      return;
    }

    storageService.saveExpense(expense);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
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
              {isEditingMode ? 'Edit Expense' : 'Record Business Expense'}
            </h1>
            <p className="text-xs text-slate-500 font-medium truncate">
              Single-entry cash-basis bookkeeping (Finnish Tax Administration 2026)
            </p>
          </div>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center space-x-2 animate-in fade-in">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>Expense voucher saved successfully! Updated in Tax Safe calculations.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        {/* Receipt Upload & Date Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Smart Receipt Section: Link/Path or File Upload */}
          <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-xs space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Receipt Voucher (Link, Path, or File)
                </label>
                <span className="text-[10px] font-semibold text-[#003580] bg-[#EDF4FC] px-2 py-0.5 rounded-full">
                  Guest Friendly
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                <div className="relative flex-1">
                  <Link2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={expense.receiptUrl || ''}
                    onChange={(e) => setExpense({ ...expense, receiptUrl: e.target.value })}
                    placeholder="https://drive.google.com/... or /path/to/receipt.pdf"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs pl-8 pr-3 py-2.5 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#003580] min-h-[42px]"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 shrink-0 transition min-h-[42px]"
                  title="Upload receipt image or PDF from device"
                >
                  <Upload size={14} />
                  <span className="hidden sm:inline">Upload</span>
                </button>
              </div>

              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                accept="image/*,application/pdf" 
                className="hidden" 
              />
            </div>

            {isAnalyzing && (
              <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center space-x-2 text-xs text-[#003580]">
                <Loader2 className="animate-spin" size={16} />
                <span className="font-semibold">AI is analyzing receipt...</span>
              </div>
            )}

            {expense.receiptUrl && !isAnalyzing && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800">
                <div className="flex items-center space-x-2 min-w-0">
                  <Check size={14} className="text-emerald-600 shrink-0" />
                  <span className="font-semibold truncate">Receipt voucher attached</span>
                </div>
                {expense.receiptUrl.startsWith('http') && (
                  <a
                    href={expense.receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#003580] hover:underline flex items-center space-x-1 shrink-0 font-semibold ml-2"
                  >
                    <span>Open link</span>
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>
            )}

            <p className="text-[10px] text-slate-500 leading-relaxed">
              💡 <strong>Storage Tip:</strong> Pasting a link to Google Drive, iCloud, or a local file path keeps your browser storage lightweight and permanent with zero quota limits.
            </p>
          </div>

          {/* Payment Date & Bookkeeping Info */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3 flex flex-col justify-between">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Date (Maksupäivä) *
              </label>
              <input 
                type="date" 
                value={expense.paymentDate} 
                onChange={(e) => setExpense({...expense, paymentDate: e.target.value})} 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs px-3.5 py-2.5 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#003580] min-h-[44px]" 
                required
              />
            </div>

            <div className="p-3 bg-[#EDF4FC] rounded-xl border border-[#BFDBFE] space-y-1 text-xs">
              <h4 className="font-bold text-[#003580] flex items-center gap-1.5 text-[11px]">
                <Sparkles size={14} />
                <span>Accounting Act & Tax Rule</span>
              </h4>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                Under single-entry cash-basis bookkeeping, an expense is recorded on the date funds leave your bank account or card. Keep all receipts for 6 years.
              </p>
            </div>
          </div>
        </div>

        {/* Expense Items Breakdown */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-[#003580] uppercase tracking-wider">
              Expense Items (Business Deductions)
            </h3>
            <span className="text-xs font-mono font-bold text-slate-900 tabular-nums">
              Total: {formatFinnishCurrency(totalExpense)}
            </span>
          </div>

          <div className="space-y-3">
            {expense.items.map((item, index) => (
              <div 
                key={item.id} 
                className="bg-slate-50/70 p-3.5 sm:p-4 rounded-xl border border-slate-200 space-y-3"
              >
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                  <div className="sm:col-span-5">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Description / Item</label>
                    <input 
                      placeholder="e.g. Adobe Creative Cloud or Office supplies" 
                      value={item.description} 
                      onChange={(e) => updateItem(index, 'description', e.target.value)} 
                      className="w-full bg-white border border-slate-200 rounded-lg text-xs text-slate-900 px-3 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-[#003580] min-h-[38px]" 
                      required
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Tax Category (Form 5)</label>
                    <select 
                      value={item.category} 
                      onChange={(e) => updateItem(index, 'category', e.target.value as ExpenseCategory)} 
                      className="w-full bg-white border border-slate-200 rounded-lg text-xs text-slate-900 px-2 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-[#003580] min-h-[38px] truncate"
                    >
                      {Object.values(ExpenseCategory).map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 sm:contents gap-2">
                    <div className="sm:col-span-2">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">VAT Rate</label>
                      <select 
                        value={item.vatRate !== undefined ? item.vatRate : 25.5} 
                        onChange={(e) => updateItem(index, 'vatRate', parseFloat(e.target.value))} 
                        className="w-full bg-white border border-slate-200 rounded-lg text-xs text-slate-900 px-2 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-[#003580] min-h-[38px]"
                      >
                        <option value={25.5}>25.5% (Standard – software, equipment, services)</option>
                        <option value={13.5}>13.5% (Reduced 2026 – books, hotel, public transport)</option>
                        <option value={10}>10% (Reduced – newspapers & periodicals)</option>
                        <option value={0}>0% (Exempt – insurance, banking, grants)</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Amount (incl. VAT)</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        value={item.amount || ''} 
                        onChange={(e) => updateItem(index, 'amount', parseFloat(e.target.value) || 0)} 
                        className="w-full bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-right text-slate-900 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#003580] min-h-[38px]" 
                        placeholder="0.00"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs">
                  <span className="font-mono text-slate-500">
                    Row: <strong className="font-bold text-slate-900 tabular-nums">{formatFinnishCurrency(item.amount || 0)}</strong>
                  </span>
                  <button 
                    type="button"
                    onClick={() => removeItem(index)} 
                    className="p-1.5 text-slate-400 hover:text-rose-600 transition min-h-[32px] min-w-[32px] flex items-center justify-center"
                    title="Delete row"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button 
            type="button"
            onClick={addRow} 
            className="mt-3 flex items-center space-x-1.5 text-[#003580] hover:text-[#002255] font-semibold text-xs transition min-h-[40px]"
          >
            <Plus size={15} />
            <span>Add another item to this voucher</span>
          </button>
        </div>

        {/* Save CTA bar */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="text-xs text-slate-600">
            <span>Total Expenses: </span>
            <strong className="font-mono font-bold text-slate-900 text-sm tabular-nums">{formatFinnishCurrency(totalExpense)}</strong>
          </div>
          <button 
            type="submit" 
            className="px-6 py-2.5 bg-[#003580] hover:bg-[#002868] text-white text-xs font-semibold rounded-xl shadow-xs transition flex items-center space-x-2 min-h-[44px]"
          >
            <Save size={16} />
            <span>{isEditingMode ? 'Save Changes' : 'Save Expense'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default ExpenseForm;
