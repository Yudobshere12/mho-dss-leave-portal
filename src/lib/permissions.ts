import type { UserRole } from '../types/database.types'

export type AppRoute =
  | '/dashboard'
  | '/leaves/apply'
  | '/admin/leaves/file'
  | '/approvals'
  | '/admin/leaves'
  | '/admin/personnel'
  | '/admin/users'
  | '/reports/audit-logs'

export type AppAction =
  | 'leave:file_self'
  | 'leave:file_on_behalf'
  | 'leave:approve_reject'
  | 'leave:export'
  | 'personnel:manage'
  | 'users:manage'
  | 'dashboard:view_aggregate'
  | 'dashboard:quick_actions'

export interface RolePermissions {
  routes: AppRoute[]
  actions: AppAction[]
}

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  STAFF: {
    routes: ['/dashboard', '/leaves/apply'],
    actions: ['leave:file_self'],
  },
  MHO_ADMIN: {
    routes: [
      '/dashboard',
      '/leaves/apply',
      '/admin/leaves/file',
      '/admin/leaves',
      '/admin/personnel',
      '/admin/users',
    ],
    actions: [
      'leave:file_self',
      'leave:file_on_behalf',
      'leave:export',
      'personnel:manage',
      'users:manage',
      'dashboard:view_aggregate',
      'dashboard:quick_actions',
    ],
  },
  MHO_HEAD: {
    routes: [
      '/dashboard',
      '/leaves/apply',
      '/approvals',
      '/admin/leaves',
      '/admin/personnel',
      '/reports/audit-logs',
    ],
    actions: [
      'leave:file_self',
      'leave:approve_reject',
      'leave:export',
      'dashboard:view_aggregate',
      'dashboard:quick_actions',
    ],
  },
}

export function isRouteAllowed(role: UserRole | null | undefined, route: string): boolean {
  if (!role) return false
  const perms = ROLE_PERMISSIONS[role]
  if (!perms) return false
  return perms.routes.includes(route as AppRoute)
}

export function isActionAllowed(role: UserRole | null | undefined, action: AppAction): boolean {
  if (!role) return false
  const perms = ROLE_PERMISSIONS[role]
  if (!perms) return false
  return perms.actions.includes(action)
}
