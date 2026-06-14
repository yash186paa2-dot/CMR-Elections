'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Play, Pause, Square, AlertCircle, CheckCircle2, Loader2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

type ElectionStatus = 'open' | 'closed' | 'paused' | 'scheduled';
type ResultsVisibility = 'visible' | 'hidden';

export function ElectionControl() {
  const [status, setStatus] = useState<ElectionStatus>('closed');
  const [visibility, setVisibility] = useState<ResultsVisibility>('hidden');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('election_settings')
        .select('key, value');

      if (fetchError) throw fetchError;
      
      if (data) {
        const statusItem = data.find(item => item.key === 'election_status');
        const visibilityItem = data.find(item => item.key === 'results_visibility');
        
        if (statusItem) {
          const val = typeof statusItem.value === 'string' ? statusItem.value.replace(/"/g, '') : statusItem.value;
          setStatus(val as ElectionStatus);
        }
        
        if (visibilityItem) {
          const val = typeof visibilityItem.value === 'string' ? visibilityItem.value.replace(/"/g, '') : visibilityItem.value;
          setVisibility(val as ResultsVisibility);
        }
      }
    } catch (err) {
      console.error('Error fetching election settings:', err);
      setError('Failed to load election settings');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus: ElectionStatus) => {
    try {
      setUpdating(true);
      setError(null);
      
      const { error: updateError } = await supabase
        .from('election_settings')
        .update({ value: newStatus })
        .eq('key', 'election_status');

      if (updateError) throw updateError;
      
      setStatus(newStatus);
      toast.success(`Election is now ${newStatus.toUpperCase()}`);
    } catch (err) {
      console.error('Error updating election status:', err);
      setError(`Failed to set election to ${newStatus}`);
      toast.error('Failed to update election status');
    } finally {
      setUpdating(false);
    }
  };

  const updateVisibility = async (newVisibility: ResultsVisibility) => {
    try {
      setUpdating(true);
      setError(null);
      
      const { error: updateError } = await supabase
        .from('election_settings')
        .update({ value: newVisibility })
        .eq('key', 'results_visibility');

      if (updateError) throw updateError;
      
      setVisibility(newVisibility);
      toast.success(`Results are now ${newVisibility === 'visible' ? 'PUBLISHED' : 'HIDDEN'}`);
    } catch (err) {
      console.error('Error updating results visibility:', err);
      setError(`Failed to set visibility to ${newVisibility}`);
      toast.error('Failed to update visibility settings');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
          <p className="text-sm font-medium text-slate-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      <div className="bg-slate-50 border-b border-slate-200 px-8 py-4 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Election Controls</h3>
        <div className="flex gap-2">
          <Badge color={status === 'open' ? 'emerald' : status === 'paused' ? 'amber' : 'slate'}>
            Status: {status}
          </Badge>
          <Badge color={visibility === 'visible' ? 'blue' : 'slate'}>
            Results: {visibility === 'visible' ? 'Published' : 'Hidden'}
          </Badge>
        </div>
      </div>

      <div className="p-8 space-y-8">
        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4">
            <AlertCircle className="h-4 w-4 text-rose-600 mt-0.5" />
            <p className="text-sm font-medium text-rose-700">{error}</p>
          </div>
        )}

        {/* Status Controls */}
        <section>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Election Status Management</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <ControlButton
              onClick={() => updateStatus('open')}
              active={status === 'open'}
              disabled={updating || status === 'open'}
              color="emerald"
              icon={<Play className="h-4 w-4" />}
              label="Open Election"
            />
            <ControlButton
              onClick={() => updateStatus('paused')}
              active={status === 'paused'}
              disabled={updating || status === 'paused'}
              color="amber"
              icon={<Pause className="h-4 w-4" />}
              label="Pause Election"
            />
            <ControlButton
              onClick={() => updateStatus('closed')}
              active={status === 'closed'}
              disabled={updating || status === 'closed'}
              color="slate"
              icon={<Square className="h-4 w-4" />}
              label="Close Election"
            />
          </div>
        </section>

        {/* Visibility Controls */}
        <section className="pt-6 border-t border-slate-100">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Results Visibility</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ControlButton
              onClick={() => updateVisibility('visible')}
              active={visibility === 'visible'}
              disabled={updating || visibility === 'visible'}
              color="blue"
              icon={<Eye className="h-4 w-4" />}
              label="Publish Results"
            />
            <ControlButton
              onClick={() => updateVisibility('hidden')}
              active={visibility === 'hidden'}
              disabled={updating || visibility === 'hidden'}
              color="slate"
              icon={<EyeOff className="h-4 w-4" />}
              label="Hide Results"
            />
          </div>
        </section>
      </div>
    </div>
  );
}

function Badge({ children, color }: { children: React.ReactNode; color: 'emerald' | 'amber' | 'slate' | 'blue' }) {
  const colors = {
    emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-100 text-amber-700 border-amber-200',
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
    blue: 'bg-blue-100 text-blue-700 border-blue-200',
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${colors[color]}`}>
      {children}
    </span>
  );
}

function ControlButton({ 
  onClick, 
  disabled, 
  color, 
  icon, 
  label,
  active
}: { 
  onClick: () => void; 
  disabled: boolean; 
  color: 'emerald' | 'amber' | 'slate' | 'blue';
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  const colors = {
    emerald: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200',
    amber: 'bg-amber-600 hover:bg-amber-700 shadow-amber-200',
    slate: 'bg-slate-800 hover:bg-slate-900 shadow-slate-200',
    blue: 'bg-blue-600 hover:bg-blue-700 shadow-blue-200',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        flex items-center justify-center gap-2 rounded-xl px-4 py-4 text-sm font-bold text-white transition-all
        disabled:opacity-40 disabled:cursor-not-allowed active:scale-95
        ${active ? 'ring-4 ring-offset-2 ring-' + (color === 'emerald' ? 'emerald' : color === 'amber' ? 'amber' : color === 'blue' ? 'blue' : 'slate') + '-500' : ''}
        ${colors[color]} shadow-lg
      `}
    >
      {icon}
      {label}
    </button>
  );
}

