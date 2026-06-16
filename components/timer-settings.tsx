'use client';

import { useState, useEffect } from 'react';
import { supabase, type TimerSettings } from '@/lib/supabase';
import { Clock, Play, Pause, RotateCcw, Save, AlertCircle } from 'lucide-react';

type Props = {
  onSave?: () => void;
};

export function TimerSettings({ onSave }: Props) {
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [timerDuration, setTimerDuration] = useState(60);
  const [customDuration, setCustomDuration] = useState('');
  const [timerStatus, setTimerStatus] = useState<'stopped' | 'running' | 'paused'>('stopped');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const TIMER_DEFAULTS = {
    timer_enabled: false,
    timer_duration: 60,
    timer_status: 'stopped' as 'stopped' | 'running' | 'paused',
    timer_start_time: null as string | null,
  };

  useEffect(() => {
    fetchTimerSettings();
  }, []);

  const fetchTimerSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const settingKeys = Object.keys(TIMER_DEFAULTS);
      const { data, error: fetchError } = await supabase
        .from('election_settings')
        .select('key, value')
        .in('key', settingKeys);

      if (fetchError) {
        throw fetchError;
      }

      const settingsMap = new Map((data ?? []).map((item) => [item.key, item.value]));
      
      // Filter out keys that actually exist in DB
      const missingKeys = settingKeys.filter((key) => !settingsMap.has(key));

      if (missingKeys.length > 0) {
        const missingSettings = missingKeys.map((key) => ({ 
          key, 
          value: TIMER_DEFAULTS[key as keyof typeof TIMER_DEFAULTS] 
        }));

        const { error: seedError } = await supabase
          .from('election_settings')
          .upsert(missingSettings, { onConflict: 'key' });

        if (seedError) {
          console.error('Seed error:', seedError);
          // Don't throw here, just use defaults for missing ones
        } else {
          for (const setting of missingSettings) {
            settingsMap.set(setting.key, setting.value);
          }
        }
      }

      const enabledValue = settingsMap.get('timer_enabled') ?? TIMER_DEFAULTS.timer_enabled;
      const durationValue = settingsMap.get('timer_duration') ?? TIMER_DEFAULTS.timer_duration;
      const statusValue = settingsMap.get('timer_status') ?? TIMER_DEFAULTS.timer_status;

      setTimerEnabled(enabledValue === true || enabledValue === 'true');
      setTimerDuration(Number(durationValue));
      setTimerStatus((statusValue as any) || 'stopped');
    } catch (err) {
      console.error('Error fetching timer settings:', err);
      setError('Failed to load timer settings. Please check your connection and permissions.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      const duration = timerDuration === 0 && customDuration ? Number(customDuration) : timerDuration;

      // Use individual updates to avoid potential collisions with other settings like election_status
      const { error: error1 } = await supabase
        .from('election_settings')
        .update({ value: timerEnabled })
        .eq('key', 'timer_enabled');
      
      const { error: error2 } = await supabase
        .from('election_settings')
        .update({ value: duration })
        .eq('key', 'timer_duration');
      
      const { error: error3 } = await supabase
        .from('election_settings')
        .update({ value: timerStatus })
        .eq('key', 'timer_status');

      if (error1 || error2 || error3) throw (error1 || error2 || error3);

      onSave?.();
    } catch (err) {
      console.error('Error saving timer settings:', err);
      setError('Failed to save timer settings');
    } finally {
      setSaving(false);
    }
  };

  const handleStartTimer = async () => {
    try {
      setSaving(true);
      await supabase
        .from('election_settings')
        .update({ value: 'running' })
        .eq('key', 'timer_status');
      
      await supabase
        .from('election_settings')
        .update({ value: new Date().toISOString() })
        .eq('key', 'timer_start_time');
      
      setTimerStatus('running');
    } catch (err) {
      console.error('Error starting timer:', err);
      setError('Failed to start timer');
    } finally {
      setSaving(false);
    }
  };

  const handlePauseTimer = async () => {
    try {
      setSaving(true);
      await supabase
        .from('election_settings')
        .update({ value: 'paused' })
        .eq('key', 'timer_status');
      
      setTimerStatus('paused');
    } catch (err) {
      console.error('Error pausing timer:', err);
      setError('Failed to pause timer');
    } finally {
      setSaving(false);
    }
  };

  const handleResetTimer = async () => {
    try {
      setSaving(true);
      await supabase
        .from('election_settings')
        .update({ value: 'stopped' })
        .eq('key', 'timer_status');
      
      await supabase
        .from('election_settings')
        .update({ value: null })
        .eq('key', 'timer_start_time');
      
      setTimerStatus('stopped');
    } catch (err) {
      console.error('Error resetting timer:', err);
      setError('Failed to reset timer');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
          <p className="text-sm text-slate-600">Loading timer settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
            <Clock className="h-5 w-5 text-slate-700" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Voting Timer</h3>
            <p className="text-sm text-slate-600">Configure and control the voting timer</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3">
          <AlertCircle className="h-4 w-4 text-rose-600 mt-0.5" />
          <p className="text-sm text-rose-700">{error}</p>
        </div>
      )}

      <div className="space-y-6">
        {/* Enable/Disable Timer */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">Enable Timer</p>
            <p className="text-xs text-slate-600">Show countdown timer to voters</p>
          </div>
          <button
            type="button"
            onClick={() => setTimerEnabled(!timerEnabled)}
            className={`relative h-6 w-11 rounded-full transition-colors ${
              timerEnabled ? 'bg-emerald-500' : 'bg-slate-300'
            }`}
          >
            <span
              className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                timerEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Timer Duration */}
        <div>
          <p className="text-sm font-semibold text-slate-900 mb-2">Timer Duration</p>
          <div className="flex flex-wrap gap-2">
            {[30, 60, 90, 120].map((duration) => (
              <button
                key={duration}
                type="button"
                onClick={() => {
                  setTimerDuration(duration);
                  setCustomDuration('');
                }}
                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  timerDuration === duration
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                {duration}s
              </button>
            ))}
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={customDuration}
                onChange={(e) => {
                  setCustomDuration(e.target.value);
                  setTimerDuration(0);
                }}
                placeholder="Custom"
                min="5"
                max="600"
                className="w-24 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
              />
              <span className="text-xs text-slate-600">seconds</span>
            </div>
          </div>
        </div>

        {/* Timer Controls */}
        <div className="flex items-center gap-2 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={handleStartTimer}
            disabled={timerStatus === 'running' || saving}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="h-4 w-4" />
            Start
          </button>
          <button
            type="button"
            onClick={handlePauseTimer}
            disabled={timerStatus !== 'running' || saving}
            className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Pause className="h-4 w-4" />
            Pause
          </button>
          <button
            type="button"
            onClick={handleResetTimer}
            disabled={timerStatus === 'stopped' || saving}
            className="flex items-center gap-2 rounded-lg bg-slate-600 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>
          <div className="ml-auto">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>

        {/* Current Status */}
        <div className="rounded-lg bg-slate-50 p-4">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
            Current Status
          </p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div
                className={`h-2 w-2 rounded-full ${
                  timerStatus === 'running'
                    ? 'bg-emerald-500'
                    : timerStatus === 'paused'
                      ? 'bg-amber-500'
                      : 'bg-slate-400'
                }`}
              />
              <span className="text-sm text-slate-700 capitalize">{timerStatus}</span>
            </div>
            <span className="text-slate-300">|</span>
            <span className="text-sm text-slate-700">
              Duration: {timerDuration === 0 && customDuration ? customDuration : timerDuration} seconds
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-sm text-slate-700">
              {timerEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
