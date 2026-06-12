'use client';

import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin-layout';
import { supabase } from '@/lib/supabase';
import { AlertCircle, CheckCircle2, X, MoveUp, MoveDown, Save } from 'lucide-react';

type PositionSummary = {
  name: string;
  display_order: number;
};

export default function PositionsManagementPage() {
  const [positions, setPositions] = useState<PositionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    void loadPositions();
  }, []);

  const loadPositions = async () => {
    setLoading(true);
    try {
      // Fetch unique positions and their display_order from candidates
      const { data, error } = await supabase
        .from('candidates')
        .select('position, display_order')
        .order('display_order', { ascending: true })
        .order('position', { ascending: true });

      if (error) throw error;

      // Group by position name to get unique list
      const uniquePositions: PositionSummary[] = [];
      const seen = new Set<string>();

      for (const item of (data || [])) {
        if (!seen.has(item.position)) {
          seen.add(item.position);
          uniquePositions.push({
            name: item.position,
            display_order: item.display_order ?? 0,
          });
        }
      }

      setPositions(uniquePositions);
    } catch (error) {
      setMessage({
        type: 'error',
        text: `Unable to load positions: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const movePosition = (index: number, direction: 'up' | 'down') => {
    const newPositions = [...positions];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newPositions.length) return;

    const temp = newPositions[index];
    newPositions[index] = newPositions[targetIndex];
    newPositions[targetIndex] = temp;

    // Update display_order based on new array index
    const updatedPositions = newPositions.map((pos, i) => ({
      ...pos,
      display_order: i,
    }));

    setPositions(updatedPositions);
  };

  const handleSaveOrder = async () => {
    setSubmitting(true);
    setMessage(null);

    try {
      // Update each unique position in the candidates table
      const promises = positions.map((pos) =>
        supabase
          .from('candidates')
          .update({ display_order: pos.display_order })
          .eq('position', pos.name)
      );

      const results = await Promise.all(promises);
      const firstError = results.find((r) => r.error)?.error;

      if (firstError) throw firstError;

      setMessage({ type: 'success', text: 'Position order saved successfully across all candidates' });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'An error occurred while saving',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminLayout activePage="positions">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Position Ordering</h1>
            <p className="mt-1 text-slate-500">Control the order in which positions appear to students (Source: Candidates Table)</p>
          </div>
          <button
            onClick={handleSaveOrder}
            disabled={submitting || positions.length === 0}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-md transition-colors hover:bg-blue-700 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="h-5 w-5" />
            {submitting ? 'Saving...' : 'Save Order'}
          </button>
        </div>

        {message && (
          <div
            className={`flex items-center gap-3 rounded-xl border p-4 ${
              message.type === 'success'
                ? 'border-green-200 bg-green-50 text-green-700'
                : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
            )}
            <p className="text-sm font-medium">{message.text}</p>
            <button onClick={() => setMessage(null)} className="ml-auto">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-blue-200 border-t-blue-600" />
              <p className="text-sm text-slate-500">Loading positions from candidates...</p>
            </div>
          </div>
        ) : positions.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-slate-300" />
            <p className="mb-4 text-lg font-medium text-slate-500">No positions found in candidates</p>
            <p className="text-sm text-slate-400">Add candidates with positions first to see them here.</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-sm font-semibold text-slate-700">Position Name</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-700 w-32">Display Order</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-700 w-40">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {positions.map((pos, index) => (
                  <tr key={pos.name} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">{pos.name}</td>
                    <td className="px-6 py-4 text-slate-600">{pos.display_order}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => movePosition(index, 'up')}
                          disabled={index === 0}
                          className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-30 disabled:hover:bg-transparent"
                          title="Move Up"
                        >
                          <MoveUp className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => movePosition(index, 'down')}
                          disabled={index === positions.length - 1}
                          className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-30 disabled:hover:bg-transparent"
                          title="Move Down"
                        >
                          <MoveDown className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
