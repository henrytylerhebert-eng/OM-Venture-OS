import { RoleType, StartupStage } from '../types';

export function getRoleHomePath(role?: RoleType | null): string {
  switch (role) {
    case RoleType.OM_ADMIN:
    case RoleType.OM_STAFF:
      return '/staff';
    case RoleType.MENTOR:
      return '/mentor';
    case RoleType.FOUNDER:
    case RoleType.STARTUP_TEAM:
      return '/founder';
    default:
      return '/';
  }
}

export function getRoleScopedPath(role: RoleType | null | undefined, segment?: string): string {
  const basePath = getRoleHomePath(role);
  if (!segment) {
    return basePath;
  }

  return `${basePath}/${segment}`.replace(/\/+/g, '/');
}

export function formatRoleLabel(role?: RoleType | null): string {
  switch (role) {
    case RoleType.OM_ADMIN:
      return 'OM Admin';
    case RoleType.OM_STAFF:
      return 'OM Staff';
    case RoleType.MENTOR:
      return 'Mentor';
    case RoleType.FOUNDER:
      return 'Founder';
    case RoleType.STARTUP_TEAM:
      return 'Startup Team';
    case RoleType.INVESTOR_ADMIN:
      return 'Investor Admin';
    case RoleType.INVESTOR_REVIEWER:
      return 'Investor Reviewer';
    default:
      return 'Opportunity Machine';
  }
}

export function formatStageLabel(stage?: StartupStage | string | null): string {
  if (!stage) {
    return 'Needs review';
  }

  return stage.replace(/_/g, ' ');
}
