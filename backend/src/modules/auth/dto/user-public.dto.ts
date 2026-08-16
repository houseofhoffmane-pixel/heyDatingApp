import { User } from '@prisma/client';

/**
 * The shape we return alongside tokens. Mirrors what the frontend needs:
 * id, status, visibility. Phone is omitted (spec §10: never expose).
 */
export interface UserPublic {
  id: string;
  status: User['status'];
  visibility: User['visibility'];
  email: string | null;
  createdAt: string;
}

export function toUserPublic(user: User): UserPublic {
  return {
    id: user.id,
    status: user.status,
    visibility: user.visibility,
    email: user.email ?? null,
    createdAt: user.createdAt.toISOString(),
  };
}
