import { supabase, type House } from './supabase';
import { Flame, Droplets, Leaf, Wind, Shield, Circle, type LucideIcon } from 'lucide-react';

export type CandidateHouse = 'None' | string;

export type HouseTheme = {
  accent: string;
  surface: string;
  ring: string;
  badge: string;
  borderColor: string;
  icon: LucideIcon;
};

export const COLOR_THEMES: Record<string, HouseTheme> = {
  orange: {
    accent: 'from-orange-600 to-red-700',
    surface: 'from-orange-50 via-white to-orange-50',
    ring: 'ring-orange-200',
    badge: 'bg-orange-100 text-orange-700 border-orange-200',
    borderColor: 'bg-orange-500',
    icon: Flame,
  },
  blue: {
    accent: 'from-blue-600 to-indigo-800',
    surface: 'from-blue-50 via-white to-blue-50',
    ring: 'ring-blue-200',
    badge: 'bg-blue-100 text-blue-700 border-blue-200',
    borderColor: 'bg-blue-500',
    icon: Droplets,
  },
  emerald: {
    accent: 'from-emerald-600 to-green-800',
    surface: 'from-emerald-50 via-white to-emerald-50',
    ring: 'ring-emerald-200',
    badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    borderColor: 'bg-green-600',
    icon: Leaf,
  },
  purple: {
    accent: 'from-purple-600 to-violet-800',
    surface: 'from-purple-50 via-white to-purple-50',
    ring: 'ring-purple-200',
    badge: 'bg-purple-100 text-purple-700 border-purple-200',
    borderColor: 'bg-purple-600',
    icon: Wind,
  },
  red: {
    accent: 'from-red-600 to-rose-800',
    surface: 'from-red-50 via-white to-red-50',
    ring: 'ring-red-200',
    badge: 'bg-red-100 text-red-700 border-red-200',
    borderColor: 'bg-red-600',
    icon: Flame,
  },
  yellow: {
    accent: 'from-yellow-500 to-amber-700',
    surface: 'from-yellow-50 via-white to-yellow-50',
    ring: 'ring-yellow-200',
    badge: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    borderColor: 'bg-yellow-500',
    icon: Circle,
  },
  cyan: {
    accent: 'from-cyan-500 to-blue-700',
    surface: 'from-cyan-50 via-white to-cyan-50',
    ring: 'ring-cyan-200',
    badge: 'bg-cyan-100 text-cyan-700 border-cyan-200',
    borderColor: 'bg-cyan-500',
    icon: Droplets,
  },
  slate: {
    accent: 'from-slate-500 via-slate-600 to-slate-800',
    surface: 'from-slate-50 via-white to-slate-100',
    ring: 'ring-slate-200',
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
    borderColor: 'bg-slate-600',
    icon: Shield,
  },
};

export function getHouseTheme(color: string | null | undefined, name?: string): HouseTheme {
  const normalizedColor = color?.toLowerCase() || '';
  const normalizedName = name?.toLowerCase() || '';

  // Direct hex check - if it starts with #, it's a custom color
  if (normalizedColor.startsWith('#')) {
    // We'll return a dynamic-ready theme or fallback to a base and override in UI
    return COLOR_THEMES.slate;
  }

  // Name-based mapping for premium legacy themes
  if (normalizedName.includes('agni')) return COLOR_THEMES.red;
  if (normalizedName.includes('bhoomi') || normalizedName.includes('prithvi')) return COLOR_THEMES.emerald;
  if (normalizedName.includes('vayu')) return COLOR_THEMES.blue;
  if (normalizedName.includes('jal')) return COLOR_THEMES.cyan;

  return COLOR_THEMES[normalizedColor] || COLOR_THEMES.slate;
}

export function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

export async function fetchHouses() {
  try {
    const { data, error } = await supabase
      .from('houses')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching houses:', error);
      return { data: [], error };
    }

    return { data: (data as House[]) || [], error: null };
  } catch (err) {
    console.error('Unexpected error in fetchHouses:', err);
    return { data: [], error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

export function isCandidateHouse(value: string | null | undefined): value is CandidateHouse {
  return typeof value === 'string' && value.length > 0;
}
