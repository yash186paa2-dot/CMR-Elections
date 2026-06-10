export const HOUSE_NAMES = [
  'Agni House',
  'Jal House',
  'Bhoomi House',
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
  iconName: 'flame' | 'droplets' | 'leaf' | 'wind';
  textContrast: string;
  borderColor: string;
};

export type CandidateHouseOption = BaseHouseOption & {
  value: CandidateHouse;
  iconName?: 'flame' | 'droplets' | 'leaf' | 'wind';
  textContrast?: string;
  borderColor?: string;
};

export const HOUSE_OPTIONS: HouseOption[] = [
  {
    value: 'Agni House',
    iconName: 'flame',
    description: '',
    accent: 'from-orange-600 to-red-700',
    textContrast: 'text-white',
    borderColor: 'bg-orange-500',
    surface: 'from-orange-50 via-white to-orange-50',
    ring: 'ring-orange-200',
    badge: 'bg-orange-100 text-orange-700 border-orange-200',
  },
  {
    value: 'Jal House',
    iconName: 'droplets',
    description: '',
    accent: 'from-blue-600 to-indigo-800',
    textContrast: 'text-white',
    borderColor: 'bg-blue-500',
    surface: 'from-blue-50 via-white to-blue-50',
    ring: 'ring-blue-200',
    badge: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  {
    value: 'Bhoomi House',
    iconName: 'leaf',
    description: '',
    accent: 'from-emerald-600 to-green-800',
    textContrast: 'text-white',
    borderColor: 'bg-green-600',
    surface: 'from-emerald-50 via-white to-emerald-50',
    ring: 'ring-emerald-200',
    badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
  {
    value: 'Vayu House',
    iconName: 'wind',
    description: '',
    accent: 'from-purple-600 to-violet-800',
    textContrast: 'text-white',
    borderColor: 'bg-purple-600',
    surface: 'from-purple-50 via-white to-purple-50',
    ring: 'ring-purple-200',
    badge: 'bg-purple-100 text-purple-700 border-purple-200',
  },
];

export const CANDIDATE_HOUSE_OPTIONS: CandidateHouseOption[] = [
  {
    value: 'None',
    description: '',
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
