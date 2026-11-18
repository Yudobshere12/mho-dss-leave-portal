export interface LeaveTypeRecord {
  code: string
  name: string
  legal_basis: string | null
  charged_to: 'VL' | 'SL' | 'NONE'
  requires_advance_filing: boolean
  min_advance_days: number
  sort_order: number
  is_active: boolean
}

export interface LeaveTypeTheme {
  code: string
  name: string
  badgeBg: string
  badgeText: string
  badgeBorder: string
  chartBg: string
  chartBar: string
  chartDot: string
}

export const FALLBACK_LEAVE_TYPES: LeaveTypeRecord[] = [
  {
    code: 'VL',
    name: 'Vacation Leave',
    legal_basis: 'Sec. 51, Rule XVI, Omnibus Rules Implementing E.O. No. 292',
    charged_to: 'VL',
    requires_advance_filing: true,
    min_advance_days: 5,
    sort_order: 1,
    is_active: true,
  },
  {
    code: 'FL',
    name: 'Mandatory/Forced Leave',
    legal_basis: 'Sec. 25, Rule XVI, Omnibus Rules Implementing E.O. No. 292',
    charged_to: 'VL',
    requires_advance_filing: true,
    min_advance_days: 5,
    sort_order: 2,
    is_active: true,
  },
  {
    code: 'SL',
    name: 'Sick Leave',
    legal_basis: 'Sec. 43, Rule XVI, Omnibus Rules Implementing E.O. No. 292',
    charged_to: 'SL',
    requires_advance_filing: false,
    min_advance_days: 0,
    sort_order: 3,
    is_active: true,
  },
  {
    code: 'ML',
    name: 'Maternity Leave',
    legal_basis: 'R.A. No. 11210 / IRR issued by CSC, DOLE and SSS',
    charged_to: 'NONE',
    requires_advance_filing: false,
    min_advance_days: 0,
    sort_order: 4,
    is_active: true,
  },
  {
    code: 'PL',
    name: 'Paternity Leave',
    legal_basis: 'R.A. No. 8187 / CSC MC No. 71, s. 1998, as amended',
    charged_to: 'NONE',
    requires_advance_filing: false,
    min_advance_days: 0,
    sort_order: 5,
    is_active: true,
  },
  {
    code: 'SPL',
    name: 'Special Privilege Leave',
    legal_basis: 'Sec. 21, Rule XVI, Omnibus Rules Implementing E.O. No. 292',
    charged_to: 'NONE',
    requires_advance_filing: true,
    min_advance_days: 5,
    sort_order: 6,
    is_active: true,
  },
  {
    code: 'SOLO',
    name: 'Solo Parent Leave',
    legal_basis: 'RA No. 8972 / CSC MC No. 8, s. 2004',
    charged_to: 'NONE',
    requires_advance_filing: false,
    min_advance_days: 0,
    sort_order: 7,
    is_active: true,
  },
  {
    code: 'STUDY',
    name: 'Study Leave',
    legal_basis: 'Sec. 68, Rule XVI, Omnibus Rules Implementing E.O. No. 292',
    charged_to: 'NONE',
    requires_advance_filing: false,
    min_advance_days: 0,
    sort_order: 8,
    is_active: true,
  },
  {
    code: 'VAWC',
    name: '10-Day VAWC Leave',
    legal_basis: 'RA No. 9262 / CSC MC No. 15, s. 2010',
    charged_to: 'NONE',
    requires_advance_filing: false,
    min_advance_days: 0,
    sort_order: 9,
    is_active: true,
  },
  {
    code: 'REHAB',
    name: 'Rehabilitation Privilege',
    legal_basis: 'Sec. 55, Rule XVI, Omnibus Rules Implementing E.O. No. 292',
    charged_to: 'NONE',
    requires_advance_filing: false,
    min_advance_days: 0,
    sort_order: 10,
    is_active: true,
  },
  {
    code: 'SLBW',
    name: 'Special Leave Benefits for Women',
    legal_basis: 'RA No. 9710 / CSC MC No. 25, s. 2010',
    charged_to: 'NONE',
    requires_advance_filing: false,
    min_advance_days: 0,
    sort_order: 11,
    is_active: true,
  },
  {
    code: 'CALAMITY',
    name: 'Special Emergency (Calamity) Leave',
    legal_basis: 'CSC MC No. 2, s. 2012, as amended',
    charged_to: 'NONE',
    requires_advance_filing: false,
    min_advance_days: 0,
    sort_order: 12,
    is_active: true,
  },
  {
    code: 'ADOPT',
    name: 'Adoption Leave',
    legal_basis: 'R.A. No. 8552',
    charged_to: 'NONE',
    requires_advance_filing: false,
    min_advance_days: 0,
    sort_order: 13,
    is_active: true,
  },
  {
    code: 'WL',
    name: 'Wellness Leave',
    legal_basis: null,
    charged_to: 'NONE',
    requires_advance_filing: true,
    min_advance_days: 5,
    sort_order: 14,
    is_active: true,
  },
  {
    code: 'CTO',
    name: 'Compensatory Time-Off',
    legal_basis: null,
    charged_to: 'NONE',
    requires_advance_filing: true,
    min_advance_days: 5,
    sort_order: 15,
    is_active: true,
  },
  {
    code: 'OTHER',
    name: 'Others (specify)',
    legal_basis: null,
    charged_to: 'NONE',
    requires_advance_filing: false,
    min_advance_days: 0,
    sort_order: 16,
    is_active: true,
  },
]

export const LEAVE_TYPE_THEMES: Record<string, LeaveTypeTheme> = {
  VL: {
    code: 'VL',
    name: 'Vacation Leave',
    badgeBg: 'bg-teal-50',
    badgeText: 'text-teal-800',
    badgeBorder: 'border-teal-200',
    chartBg: '#0f766e',
    chartBar: 'bg-teal-700',
    chartDot: 'bg-teal-700',
  },
  FL: {
    code: 'FL',
    name: 'Mandatory/Forced Leave',
    badgeBg: 'bg-cyan-50',
    badgeText: 'text-cyan-800',
    badgeBorder: 'border-cyan-200',
    chartBg: '#0e7490',
    chartBar: 'bg-cyan-700',
    chartDot: 'bg-cyan-700',
  },
  SL: {
    code: 'SL',
    name: 'Sick Leave',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-800',
    badgeBorder: 'border-emerald-200',
    chartBg: '#059669',
    chartBar: 'bg-emerald-600',
    chartDot: 'bg-emerald-600',
  },
  ML: {
    code: 'ML',
    name: 'Maternity Leave',
    badgeBg: 'bg-pink-50',
    badgeText: 'text-pink-800',
    badgeBorder: 'border-pink-200',
    chartBg: '#db2777',
    chartBar: 'bg-pink-600',
    chartDot: 'bg-pink-600',
  },
  PL: {
    code: 'PL',
    name: 'Paternity Leave',
    badgeBg: 'bg-indigo-50',
    badgeText: 'text-indigo-800',
    badgeBorder: 'border-indigo-200',
    chartBg: '#4f46e5',
    chartBar: 'bg-indigo-600',
    chartDot: 'bg-indigo-600',
  },
  SPL: {
    code: 'SPL',
    name: 'Special Privilege Leave',
    badgeBg: 'bg-violet-50',
    badgeText: 'text-violet-800',
    badgeBorder: 'border-violet-200',
    chartBg: '#7c3aed',
    chartBar: 'bg-violet-600',
    chartDot: 'bg-violet-600',
  },
  SOLO: {
    code: 'SOLO',
    name: 'Solo Parent Leave',
    badgeBg: 'bg-purple-50',
    badgeText: 'text-purple-800',
    badgeBorder: 'border-purple-200',
    chartBg: '#9333ea',
    chartBar: 'bg-purple-600',
    chartDot: 'bg-purple-600',
  },
  STUDY: {
    code: 'STUDY',
    name: 'Study Leave',
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-800',
    badgeBorder: 'border-blue-200',
    chartBg: '#2563eb',
    chartBar: 'bg-blue-600',
    chartDot: 'bg-blue-600',
  },
  VAWC: {
    code: 'VAWC',
    name: '10-Day VAWC Leave',
    badgeBg: 'bg-rose-50',
    badgeText: 'text-rose-800',
    badgeBorder: 'border-rose-200',
    chartBg: '#e11d48',
    chartBar: 'bg-rose-600',
    chartDot: 'bg-rose-600',
  },
  REHAB: {
    code: 'REHAB',
    name: 'Rehabilitation Privilege',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-800',
    badgeBorder: 'border-amber-200',
    chartBg: '#d97706',
    chartBar: 'bg-amber-600',
    chartDot: 'bg-amber-600',
  },
  SLBW: {
    code: 'SLBW',
    name: 'Special Leave Benefits for Women',
    badgeBg: 'bg-fuchsia-50',
    badgeText: 'text-fuchsia-800',
    badgeBorder: 'border-fuchsia-200',
    chartBg: '#c026d3',
    chartBar: 'bg-fuchsia-600',
    chartDot: 'bg-fuchsia-600',
  },
  CALAMITY: {
    code: 'CALAMITY',
    name: 'Special Emergency (Calamity) Leave',
    badgeBg: 'bg-orange-50',
    badgeText: 'text-orange-800',
    badgeBorder: 'border-orange-200',
    chartBg: '#ea580c',
    chartBar: 'bg-orange-600',
    chartDot: 'bg-orange-600',
  },
  ADOPT: {
    code: 'ADOPT',
    name: 'Adoption Leave',
    badgeBg: 'bg-lime-50',
    badgeText: 'text-lime-800',
    badgeBorder: 'border-lime-200',
    chartBg: '#65a30d',
    chartBar: 'bg-lime-600',
    chartDot: 'bg-lime-600',
  },
  WL: {
    code: 'WL',
    name: 'Wellness Leave',
    badgeBg: 'bg-sky-50',
    badgeText: 'text-sky-800',
    badgeBorder: 'border-sky-200',
    chartBg: '#0284c7',
    chartBar: 'bg-sky-600',
    chartDot: 'bg-sky-600',
  },
  CTO: {
    code: 'CTO',
    name: 'Compensatory Time-Off',
    badgeBg: 'bg-yellow-50',
    badgeText: 'text-yellow-800',
    badgeBorder: 'border-yellow-200',
    chartBg: '#ca8a04',
    chartBar: 'bg-yellow-600',
    chartDot: 'bg-yellow-600',
  },
  OTHER: {
    code: 'OTHER',
    name: 'Others (specify)',
    badgeBg: 'bg-slate-100',
    badgeText: 'text-slate-700',
    badgeBorder: 'border-slate-300',
    chartBg: '#64748b',
    chartBar: 'bg-slate-500',
    chartDot: 'bg-slate-500',
  },
}

export const DEFAULT_LEAVE_THEME: LeaveTypeTheme = {
  code: 'OTHER',
  name: 'Leave',
  badgeBg: 'bg-slate-100',
  badgeText: 'text-slate-700',
  badgeBorder: 'border-slate-200',
  chartBg: '#64748b',
  chartBar: 'bg-slate-500',
  chartDot: 'bg-slate-500',
}

export function getLeaveTypeTheme(codeOrName: string): LeaveTypeTheme {
  if (LEAVE_TYPE_THEMES[codeOrName]) {
    return LEAVE_TYPE_THEMES[codeOrName]
  }
  // Check match by name or legacy string
  const entry = Object.values(LEAVE_TYPE_THEMES).find(
    (t) => t.name.toLowerCase() === codeOrName.toLowerCase() || t.code.toLowerCase() === codeOrName.toLowerCase()
  )
  if (entry) return entry

  // Legacy mappings
  if (codeOrName === 'Emergency Leave') return LEAVE_TYPE_THEMES.CALAMITY
  if (codeOrName === 'Other') return LEAVE_TYPE_THEMES.OTHER

  return {
    ...DEFAULT_LEAVE_THEME,
    code: codeOrName,
    name: codeOrName,
  }
}
