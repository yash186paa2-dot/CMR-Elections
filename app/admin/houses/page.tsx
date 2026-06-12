'use client';

import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin-layout';
import { supabase, type House, type Candidate } from '@/lib/supabase';
import { fetchHouses, hexToRgb } from '@/lib/houses';
import { AlertCircle, CheckCircle2, X, MoveUp, MoveDown, Save, Plus, Edit2, Trash2, Palette } from 'lucide-react';

export default function HousesManagementPage() {
  const [houses, setHouses] = useState<House[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | string | null>(null);
  const [form, setForm] = useState({ name: '', color: '#3b82f6' });

  useEffect(() => {
    void loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    console.log('DEBUG: Initiating house fetch...');
    try {
      const { data, error } = await fetchHouses();
      
      if (error) {
        console.error('Fetch error:', error);
        setMessage({ type: 'error', text: `Failed to load houses: ${error.message}` });
      } else {
        console.log('DEBUG: Houses loaded:', data.length);
        setHouses(data);
      }
      
      // Also fetch candidates to check for dependencies before delete
      const { data: candidatesData } = await supabase.from('candidates').select('id, house');
      if (candidatesData) {
        setCandidates(candidatesData as Candidate[]);
      }
    } catch (err) {
      console.error('DEBUG: Unexpected error in loadData:', err);
      setMessage({ 
        type: 'error', 
        text: `System Error: ${err instanceof Error ? err.message : 'Unknown'}` 
      });
    } finally {
      setLoading(false);
    }
  };

  const rgb = hexToRgb(form.color);

  const moveHouse = async (index: number, direction: 'up' | 'down') => {
    const newHouses = [...houses];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newHouses.length) return;
    
    const temp = newHouses[index];
    newHouses[index] = newHouses[targetIndex];
    newHouses[targetIndex] = temp;
    
    const updatedHouses = newHouses.map((h, i) => ({ ...h, display_order: i }));
    setHouses(updatedHouses);
    
    // Auto-save order
    await handleSaveOrder(updatedHouses);
  };

  const handleSaveOrder = async (housesToSave: House[]) => {
    setSubmitting(true);
    try {
      const updates = housesToSave.map((h) => ({ id: h.id, display_order: h.display_order }));
      const { error } = await supabase.from('houses').upsert(updates);
      if (error) throw error;
      setMessage({ type: 'success', text: 'Order updated successfully' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: 'Error saving order' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpen = (house?: House) => {
    if (house) {
      setForm({ name: house.name, color: house.color.startsWith('#') ? house.color : '#3b82f6' });
      setEditingId(house.id);
    } else {
      setForm({ name: '', color: '#3b82f6' });
      setEditingId(null);
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingId) {
        const { error } = await supabase
          .from('houses')
          .update({ name: form.name, color: form.color })
          .eq('id', editingId);
        if (error) throw error;
        setMessage({ type: 'success', text: 'House updated' });
      } else {
        const { error } = await supabase.from('houses').insert([
          { name: form.name, color: form.color, display_order: houses.length }
        ]);
        if (error) throw error;
        setMessage({ type: 'success', text: 'House created' });
      }
      setShowModal(false);
      void loadData();
    } catch (err) {
      setMessage({ type: 'error', text: 'Error saving house' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (house: House) => {
    const hasCandidates = candidates.some((c) => c.house === house.name);
    if (hasCandidates) {
      setMessage({ type: 'error', text: `Cannot delete "${house.name}": candidates are assigned to it.` });
      return;
    }
    if (!window.confirm(`Delete house "${house.name}"?`)) return;
    try {
      const { error } = await supabase.from('houses').delete().eq('id', house.id);
      if (error) throw error;
      setMessage({ type: 'success', text: 'House deleted' });
      void loadData();
    } catch (err) {
      setMessage({ type: 'error', text: 'Error deleting house' });
    }
  };

  return (
    <AdminLayout activePage="houses">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">House Management</h1>
            <p className="mt-1 text-slate-500">Manage election houses and custom themes</p>
          </div>
          <button
            onClick={() => handleOpen()}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-md transition-colors hover:bg-blue-700"
          >
            <Plus className="h-5 w-5" />
            Add House
          </button>
        </div>

        {message && (
          <div className={`flex items-center gap-3 rounded-xl border p-4 ${
            message.type === 'success' ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'
          }`}>
            {message.type === 'success' ? <CheckCircle2 className="h-5 w-5 flex-shrink-0" /> : <AlertCircle className="h-5 w-5 flex-shrink-0" />}
            <p className="text-sm font-medium">{message.text}</p>
            <button onClick={() => setMessage(null)} className="ml-auto"><X className="h-4 w-4" /></button>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
              <p className="text-slate-500 font-medium">Loading houses...</p>
            </div>
          ) : houses.length === 0 ? (
            <div className="py-20 text-center">
              <AlertCircle className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">No houses found in database.</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-sm font-bold text-slate-700">Display Order</th>
                  <th className="px-6 py-4 text-sm font-bold text-slate-700">House Name</th>
                  <th className="px-6 py-4 text-sm font-bold text-slate-700">Theme Color</th>
                  <th className="px-6 py-4 text-sm font-bold text-slate-700 w-40 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {houses.map((house, index) => (
                  <tr key={house.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => moveHouse(index, 'up')} 
                          disabled={index === 0 || submitting}
                          className="p-1.5 text-slate-400 hover:text-blue-600 disabled:opacity-30"
                        >
                          <MoveUp className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => moveHouse(index, 'down')} 
                          disabled={index === houses.length - 1 || submitting}
                          className="p-1.5 text-slate-400 hover:text-blue-600 disabled:opacity-30"
                        >
                          <MoveDown className="h-4 w-4" />
                        </button>
                        <span className="text-sm font-mono text-slate-400 ml-2">#{index + 1}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="text-xl" style={{ color: house.color }}>●</span>
                        <span className="font-bold text-slate-900">{house.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div 
                          className="h-6 w-12 rounded-md shadow-inner border border-black/10" 
                          style={{ backgroundColor: house.color }} 
                        />
                        <code className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-600 font-mono">
                          {house.color.toUpperCase()}
                        </code>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={() => handleOpen(house)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(house)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md animate-scale-in rounded-[2rem] bg-white p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                {editingId ? 'Edit House' : 'New House'}
              </h2>
              <button 
                onClick={() => setShowModal(false)}
                className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-2">
                  House Name
                </label>
                <input 
                  type="text" 
                  value={form.name} 
                  onChange={(e) => setForm({ ...form, name: e.target.value })} 
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 font-bold text-slate-900 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" 
                  placeholder="e.g. Agni House"
                  required 
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-2">
                  Brand Color & Preview
                </label>
                <div className="flex flex-col gap-4 p-5 rounded-3xl border border-slate-100 bg-slate-50">
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      <input 
                        type="color" 
                        value={form.color} 
                        onChange={(e) => setForm({ ...form, color: e.target.value })} 
                        className="h-20 w-20 cursor-pointer overflow-hidden rounded-2xl border-4 border-white shadow-lg p-0"
                      />
                    </div>
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm">
                        <span className="text-2xl" style={{ color: form.color }}>●</span>
                        <span className="font-bold text-slate-800">{form.name || 'House Name'}</span>
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1 bg-white px-3 py-2 rounded-xl border border-slate-100 text-center">
                          <p className="text-[10px] font-black text-slate-400 uppercase">HEX</p>
                          <p className="font-mono font-bold text-slate-700">{form.color.toUpperCase()}</p>
                        </div>
                        <div className="flex-1 bg-white px-3 py-2 rounded-xl border border-slate-100 text-center">
                          <p className="text-[10px] font-black text-slate-400 uppercase">RGB</p>
                          <p className="font-mono font-bold text-slate-700">
                            {rgb ? `${rgb.r}, ${rgb.g}, ${rgb.b}` : '---'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)} 
                  className="flex-1 rounded-2xl border-2 border-slate-100 py-4 text-sm font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submitting} 
                  className="flex-2 rounded-2xl bg-slate-900 px-8 py-4 text-sm font-black uppercase tracking-widest text-white shadow-xl hover:bg-slate-800 disabled:opacity-50 transition-all active:scale-[0.98]"
                >
                  {submitting ? 'Saving...' : 'Save House'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
