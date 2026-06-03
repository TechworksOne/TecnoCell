/** Roles del sistema */
export const ROLES = {
  ADMINISTRADOR: 'ADMINISTRADOR',
  TECNICO: 'TECNICO',
  VENTAS: 'VENTAS',
} as const;

/** Rutas exclusivas de ADMINISTRADOR */
export const ADMIN_ONLY_ROUTES = [
  '/compras',
  '/stickers-garantia',
  '/proveedores',
  '/admin-usuarios',
  '/reportes',
  '/caja-bancos',
  '/deudores',
];

/** Verifica si el usuario tiene el rol indicado */
export function hasRole(roles: string[] | undefined, role: string): boolean {
  return Array.isArray(roles) && roles.includes(role);
}

/** Verifica si el usuario tiene alguno de los roles indicados */
export function hasAnyRole(roles: string[] | undefined, allowedRoles: string[]): boolean {
  return Array.isArray(roles) && allowedRoles.some(r => roles.includes(r));
}

/** El usuario es administrador (soporta el rol legacy 'admin' y el nuevo 'ADMINISTRADOR') */
export function isAdmin(roles: string[] | undefined, legacyRole?: string): boolean {
  const lower = legacyRole?.toLowerCase();
  return (
    hasRole(roles, ROLES.ADMINISTRADOR) ||
    hasRole(roles, 'admin') ||
    lower === 'admin' ||
    lower === 'administrador'
  );
}

/** El usuario puede ver datos de costos */
export function canViewCosts(roles: string[] | undefined): boolean {
  return isAdmin(roles);
}

/** Verifica si el usuario puede acceder a una ruta */
export function canAccessRoute(roles: string[] | undefined, pathname: string): boolean {
  const isAdminUser = isAdmin(roles);
  // Las rutas admin-only sólo son accesibles por ADMINISTRADOR
  const restricted = ADMIN_ONLY_ROUTES.some(route => pathname.startsWith(route));
  if (restricted) return isAdminUser;
  return true;
}
