/**
 * String-enums voor User.role en User.status. We houden ze in TypeScript
 * (i.p.v. echte Prisma-enums) omdat PostgreSQL-enum-migraties op
 * bestaande data risicovol zijn — één rij met een afwijkende waarde
 * laat de migratie falen. Deze const-tuples geven compile-time
 * safety zonder DB-changes.
 *
 * Schrijf altijd via `USER_ROLES.user` / `USER_STATUSES.approved` etc.
 * in plaats van losse string-literals; dan vangt TypeScript een typo
 * meteen.
 */

export const USER_ROLES = {
  user: "user",
  admin: "admin",
} as const;
export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];
export const ALL_USER_ROLES: readonly UserRole[] = Object.values(USER_ROLES);

export const USER_STATUSES = {
  pending: "pending",
  approved: "approved",
  suspended: "suspended",
} as const;
export type UserStatus = (typeof USER_STATUSES)[keyof typeof USER_STATUSES];
export const ALL_USER_STATUSES: readonly UserStatus[] =
  Object.values(USER_STATUSES);

export function isUserRole(v: unknown): v is UserRole {
  return typeof v === "string" && (ALL_USER_ROLES as readonly string[]).includes(v);
}

export function isUserStatus(v: unknown): v is UserStatus {
  return (
    typeof v === "string" &&
    (ALL_USER_STATUSES as readonly string[]).includes(v)
  );
}
