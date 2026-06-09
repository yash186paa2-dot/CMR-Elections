export const HOUSE_NAMES = [
  'Agni House',
  'Jal House',
  'Prithvi House',
  'Vayu House',
] as const;

export type HouseName = (typeof HOUSE_NAMES)[number];
export type CandidateHouse = 'None' | HouseName;

type BaseHouseOption = {
  description: string;
  accent: string;
  surface: string;
  ring: string;
  badge: string;
};

export type HouseOption = BaseHouseOption & {
  value: HouseName;
};

export type CandidateHouseOption = BaseHouseOption & {
  value: CandidateHouse;
};

export const HOUSE_OPTIONS: HouseOption[] = [
  {
    value: 'Agni House',
    description: 'Bold leadership, energy, and competitive spirit.',
    accent: 'from-orange-500 via-red-500 to-rose-600',
    surface: 'from-orange-50 via-white to-rose-50',
    ring: 'ring-orange-200',
    badge: 'bg-orange-100 text-orange-700 border-orange-200',
  },
  {
    value: 'Jal House',
    description: 'Calm focus, adaptability, and collective strength.',
    accent: 'from-sky-500 via-cyan-500 to-blue-600',
    surface: 'from-sky-50 via-white to-cyan-50',
    ring: 'ring-sky-200',
    badge: 'bg-sky-100 text-sky-700 border-sky-200',
  },
  {
    value: 'Prithvi House',
    description: 'Steady growth, resilience, and grounded teamwork.',
    accent: 'from-emerald-500 via-green-500 to-lime-600',
    surface: 'from-emerald-50 via-white to-lime-50',
    ring: 'ring-emerald-200',
    badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
  {
    value: 'Vayu House',
    description: 'Speed, creativity, and agile decision making.',
    accent: 'from-violet-500 via-fuchsia-500 to-purple-600',
    surface: 'from-violet-50 via-white to-fuchsia-50',
    ring: 'ring-violet-200',
    badge: 'bg-violet-100 text-violet-700 border-violet-200',
  },
];

export const CANDIDATE_HOUSE_OPTIONS: CandidateHouseOption[] = [
  {
    value: 'None',
    description: 'Visible to every student regardless of the selected house.',
    accent: 'from-slate-500 via-slate-600 to-slate-800',
    surface: 'from-slate-50 via-white to-slate-100',
    ring: 'ring-slate-200',
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
  },
  ...HOUSE_OPTIONS,
];

export const HOUSE_OPTIONS_BY_VALUE = Object.fromEntries(
  CANDIDATE_HOUSE_OPTIONS.map((house) => [house.value, house])
) as Record<CandidateHouse, CandidateHouseOption>;

export const STUDENT_HOUSE_OPTIONS_BY_VALUE = Object.fromEntries(
  HOUSE_OPTIONS.map((house) => [house.value, house])
) as Record<HouseName, HouseOption>;

export function isHouseName(value: string | null | undefined): value is HouseName {
  return HOUSE_NAMES.includes(value as HouseName);
}

export function isCandidateHouse(value: string | null | undefined): value is CandidateHouse {
  return value === 'None' || isHouseName(value);
}
