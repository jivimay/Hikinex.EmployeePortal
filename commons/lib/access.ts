export type PortalRole = 'Employee' | 'Manager' | 'Admin';
const employeeApps = ['mission-control', 'timekeeper', 'lms', 'vaultwarden', 'hiki-it-portal', 'hubspot'];
const optionalApps = ['canva', 'semrush', 'reqev-ats', 'dfd-timekeeper'];
const restrictedApps = ['invsync', 'reet', 'talentdirector'];
export function departmentApps(department: string): string[] {
  if (department === 'Management') return [...restrictedApps];
  if (department === 'Training Team') return ['talentdirector'];
  return [];
}
export function defaultAppIds(role: PortalRole, department: string): string[] {
  return [...new Set([...employeeApps, ...departmentApps(department), ...(role === 'Admin' ? [...restrictedApps, 'softwaretracker'] : [])])];
}
export function catalogAppIds(role: PortalRole, department: string): string[] {
  return [...defaultAppIds(role, department), ...optionalApps];
}
export function canPublishCompanyWide(role: PortalRole, department: string) {
  return role === 'Admin' || department === 'Management';
}
export function canPublishUpdates(role: PortalRole, department: string) {
  return role === 'Manager' || canPublishCompanyWide(role, department);
}
const restrictedHosts: Record<string, string> = {
  'invsync-rho.vercel.app': 'invsync',
  'reet-hikinex.vercel.app': 'reet',
  'talentdirector.dogfooddevsecure.com': 'talentdirector',
};
export function canUseShortcut(url: string, role: PortalRole, department: string) {
  try {
    const app = restrictedHosts[new URL(url).hostname.toLowerCase()];
    return !app || defaultAppIds(role, department).includes(app);
  } catch { return false; }
}
