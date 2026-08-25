/**
 * Navigation items configuration for the admin sidebar.
 *
 * Each item defines a section page accessible from the sidebar/drawer.
 * Items are grouped visually by the `group` field.
 *
 * @typedef {'dashboard'|'reports'|'rules'|'evaluations'|'users'|'monitor'|'logs'} PageId
 * @typedef {{id: PageId, label: string, icon: string, group: 'Overview'|'Content'|'System'}} NavItem
 */

/** @type {NavItem[]} */
export const NAV_ITEMS = [
  { id: 'dashboard',   label: 'Dashboard',   icon: '📊', group: 'Overview' },
  { id: 'reports',     label: 'Reports',     icon: '⚑',  group: 'Content' },
  { id: 'rules',       label: 'Rules',       icon: '🛠',  group: 'Content' },
  { id: 'evaluations', label: 'Evaluations', icon: '⭐', group: 'Content' },
  { id: 'users',       label: 'Users',       icon: '👥', group: 'System' },
  { id: 'monitor',     label: 'Monitor',     icon: '📡', group: 'System' },
  { id: 'logs',        label: 'Logs',        icon: '📜', group: 'System' },
];
