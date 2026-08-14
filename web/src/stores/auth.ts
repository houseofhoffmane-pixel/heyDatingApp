import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AuthUser {
  id: string;
  status: 'onboarding' | 'pending_verification' | 'active' | 'paused' | 'hidden' | 'banned' | 'deleted';
  visibility: 'everyone' | 'liked_only' | 'spot_only';
  email: string | null;
  createdAt: string;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  setSession: (opts: { accessToken: string; refreshToken: string; user: AuthUser }) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: AuthUser) => void;
  clear: () => void;
}

/**
 * Persisted in localStorage so a page refresh keeps you signed in.
 * The api client reads `accessToken` on every request and rotates via
 * `setTokens` on a 401 refresh.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setSession: ({ accessToken, refreshToken, user }) =>
        set({ accessToken, refreshToken, user }),
      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      setUser: (user) => set({ user }),
      clear: () => set({ accessToken: null, refreshToken: null, user: null }),
    }),
    { name: 'hey-auth' },
  ),
);
