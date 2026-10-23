import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Check, X, User, Building, Mail, MapPin } from 'lucide-react';
import { Customer } from '../types';
import { storageService } from '../services/storageService';
import { TextReveal } from './ui/TextReveal';

const CustomerManager: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Customer>({
    id: '',
    name: '',
    businessId: '',
    email: '',
    address: ''
  });

  useEffect(() => {
    setCustomers(storageService.getCustomers());
  }, []);

  const handleSave = () => {
    if (!editForm.name.trim()) {
      alert("Please enter customer name.");
      return;
    }
    const customerToSave = { ...editForm, id: editForm.id || storageService.generateId() };
    storageService.saveCustomer(customerToSave);
    setCustomers(storageService.getCustomers());
    setIsEditing(null);
    setEditForm({ id: '', name: '', businessId: '', email: '', address: '' });
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this customer?')) {
      storageService.deleteCustomer(id);
      setCustomers(storageService.getCustomers());
    }
  };

  const startEdit = (customer: Customer) => {
    setIsEditing(customer.id);
    setEditForm(customer);
  };

  const startNew = () => {
    setIsEditing('new');
    setEditForm({ id: '', name: '', businessId: '', email: '', address: '' });
  };

  return (
    <div className="space-y-4 md:space-y-6 animate-fadeIn max-w-5xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <span className="text-[10px] font-bold text-[#003580] uppercase tracking-wider block">
            Customer Directory
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Customers (Asiakkaat)
          </h1>
        </div>
        <button 
          onClick={startNew}
          className="flex items-center justify-center space-x-1.5 px-4 py-2.5 bg-[#003580] hover:bg-[#002868] text-white rounded-xl text-xs font-semibold shadow-xs transition min-h-[44px]"
        >
          <Plus size={16} />
          <span>Add New Customer</span>
        </button>
      </div>

      {isEditing && (
        <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-xs border border-slate-200/80 mb-6 space-y-4">
          <h3 className="font-bold text-slate-900 text-sm">
            {isEditing === 'new' ? 'New Customer' : 'Edit Customer'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Name / Company Name *</label>
              <input 
                placeholder="e.g. Acme Oy or Matti Meikäläinen" 
                value={editForm.name} 
                onChange={e => setEditForm({...editForm, name: e.target.value})} 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#003580] min-h-[42px]" 
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Business ID (For Corporate Clients)</label>
              <input 
                placeholder="e.g. 1234567-8" 
                value={editForm.businessId} 
                onChange={e => setEditForm({...editForm, businessId: e.target.value})} 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#003580] min-h-[42px]" 
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Billing Email</label>
              <input 
                placeholder="invoicing@company.fi" 
                value={editForm.email} 
                onChange={e => setEditForm({...editForm, email: e.target.value})} 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#003580] min-h-[42px]" 
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Billing Address</label>
              <input 
                placeholder="Mannerheimintie 1, 00100 Helsinki" 
                value={editForm.address} 
                onChange={e => setEditForm({...editForm, address: e.target.value})} 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#003580] min-h-[42px]" 
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
            <button 
              onClick={() => setIsEditing(null)} 
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition min-h-[40px]"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave} 
              className="px-5 py-2 bg-[#003580] hover:bg-[#002868] text-white text-xs font-semibold rounded-xl shadow-xs transition min-h-[40px]"
            >
              Save Customer
            </button>
          </div>
        </div>
      )}

      {/* Customer Inset Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {customers.map((c) => (
          <div key={c.id} className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-[#003580] transition relative group space-y-2 min-w-0">
            <div className="flex justify-between items-start gap-2 min-w-0">
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-slate-900 text-sm tracking-tight truncate">
                  <TextReveal text={c.name} label="Customer name" />
                </h4>
                {c.businessId && (
                  <p className="text-[11px] font-mono text-slate-500 font-medium">
                    Business ID: {c.businessId}
                  </p>
                )}
              </div>
              <div className="flex items-center space-x-1 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition">
                <button 
                  onClick={() => startEdit(c)} 
                  className="p-1.5 text-slate-500 hover:text-[#003580] hover:bg-slate-100 rounded-lg min-h-[36px] min-w-[36px] flex items-center justify-center"
                  title="Edit"
                >
                  <Edit2 size={15} />
                </button>
                <button 
                  onClick={() => handleDelete(c.id)} 
                  className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg min-h-[36px] min-w-[36px] flex items-center justify-center"
                  title="Delete"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>

            <div className="text-xs text-slate-600 space-y-1 pt-1 border-t border-slate-50 min-w-0">
              {c.email && (
                <div className="flex items-center space-x-1.5 min-w-0">
                  <Mail size={13} className="text-slate-400 shrink-0" />
                  <span className="truncate">
                    <TextReveal text={c.email} label="Email" copyable />
                  </span>
                </div>
              )}
              {c.address && (
                <div className="flex items-center space-x-1.5 min-w-0 text-slate-500">
                  <MapPin size={13} className="text-slate-400 shrink-0" />
                  <span className="truncate">
                    <TextReveal text={c.address} label="Address" copyable />
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
        {customers.length === 0 && !isEditing && (
          <div className="col-span-full py-12 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-2xl">
            No customers saved yet. Add a customer to speed up invoice creation.
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerManager;
