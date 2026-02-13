import { createContext, useContext, useState, useCallback, useEffect, ReactNode, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User as SupabaseUser } from '@supabase/supabase-js';

// Supabase is always configured when using the official client from integrations
export const isSupabaseConfigured = true;
export const supabaseConnectionError: string | null = null;

type AppRole = 'admin' | 'operador';

interface User {
  id: string;
  email: string;
  name: string;
  role: AppRole;
  accountId: string | null;
  isSystemAdmin: boolean;
  avatarUrl: string | null;
  phone: string | null;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isSystemAdmin: boolean;
  isLoading: boolean;
  isAuthReady: boolean;
  accountId: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const initializingRef = useRef(false);

  const fetchUserData = useCallback(async (supabaseUser: SupabaseUser): Promise<User | null> => {
    try {
      // Fetch profile including account_id and is_system_admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, email, account_id, is_system_admin, avatar_url, phone')
        .eq('user_id', supabaseUser.id)
        .maybeSingle();

      // Fetch role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', supabaseUser.id)
        .maybeSingle();

      return {
        id: supabaseUser.id,
        email: profile?.email || supabaseUser.email || '',
        name: profile?.name || 'Usuário',
        role: (roleData?.role as AppRole) || 'operador',
        accountId: profile?.account_id || null,
        isSystemAdmin: profile?.is_system_admin || false,
        avatarUrl: profile?.avatar_url || null,
        phone: profile?.phone || null,
      };
    } catch (error) {
      console.error('Error fetching user data:', error);
      return null;
    }
  }, []);

  useEffect(() => {
    // Prevent double initialization in React StrictMode (effect runs mount->cleanup->mount)
    // NOTE: we reset this ref in cleanup to allow the second mount to initialize.
    if (initializingRef.current) return;
    initializingRef.current = true;

    let mounted = true;

    const withTimeout = async <T,>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
      let timeoutId: number | undefined;
      const timeoutPromise = new Promise<T>((_, reject) => {
        timeoutId = window.setTimeout(() => {
          reject(new Error(`${label} timeout after ${ms}ms`));
        }, ms);
      });

      try {
        return await Promise.race([promise, timeoutPromise]);
      } finally {
        if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      }
    };

    const finalizeAuthState = (source: string) => {
      if (!mounted) return;
      setIsLoading(false);
      setIsAuthReady(true);
      console.debug('[Auth]', 'Auth ready true', { source });
    };

    const safeFetchAndSetUser = async (supabaseUser: SupabaseUser, source: string) => {
      console.debug('[Auth]', 'fetchUserData start', { source, userId: supabaseUser.id });
      try {
        const userData = await withTimeout(fetchUserData(supabaseUser), 10000, 'fetchUserData');
        console.debug('[Auth]', 'fetchUserData ok', { source, hasUserData: Boolean(userData) });
        if (!mounted) return;

        if (!userData) {
          // If profile/role fetch fails (RLS/403/network), never block the app in loading.
          setUser(null);
          return;
        }

        setUser(userData);
      } catch (error) {
        console.debug('[Auth]', 'fetchUserData error', { source, error });
        if (!mounted) return;
        setUser(null);
      }
    };

    // Set up auth state listener — this is the SINGLE source of truth.
    // We do NOT call getSession() separately to avoid race conditions.
    // The INITIAL_SESSION event fires immediately and covers the initial load.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.debug('[Auth]', `Auth state change: ${event}`, { hasSession: !!session });
        
        if (!mounted) return;

        try {
          if (event === 'INITIAL_SESSION') {
            // First load — process session if exists
            if (session?.user) {
              await safeFetchAndSetUser(session.user, 'INITIAL_SESSION');
            } else {
              setUser(null);
            }
            // Always finalize on INITIAL_SESSION regardless of outcome
            finalizeAuthState('INITIAL_SESSION');
          } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            if (session?.user) {
              // Use setTimeout to avoid Supabase deadlock on token refresh
              // (profile fetch uses the same client that's emitting the event)
              setTimeout(async () => {
                if (!mounted) return;
                await safeFetchAndSetUser(session.user, `event:${event}`);
                finalizeAuthState(`event:${event}`);
              }, 0);
            }
          } else if (event === 'SIGNED_OUT') {
            setUser(null);
            finalizeAuthState('SIGNED_OUT');
          }
        } catch (error) {
          console.debug('[Auth]', 'Auth state change handler error', { event, error });
          if (mounted) {
            setUser(null);
            finalizeAuthState(`error:${event}`);
          }
        }
      }
    );

    // Safety net: if INITIAL_SESSION never fires within 5s, unblock the app
    const safetyTimeout = window.setTimeout(() => {
      if (mounted && !isAuthReady) {
        console.debug('[Auth]', 'Safety timeout — forcing auth ready');
        finalizeAuthState('safety-timeout');
      }
    }, 5000);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      window.clearTimeout(safetyTimeout);
      initializingRef.current = false;
    };
  }, [fetchUserData]);

  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Erro ao fazer login' };
    }
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  const resetPassword = useCallback(async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Erro ao enviar email de recuperação' };
    }
  }, []);

  const updatePassword = useCallback(async (newPassword: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Erro ao atualizar senha' };
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const userData = await fetchUserData(session.user);
      if (userData) setUser(userData);
    }
  }, [fetchUserData]);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isSystemAdmin: user?.isSystemAdmin || false,
    isLoading,
    isAuthReady,
    accountId: user?.accountId || null,
    login,
    logout,
    resetPassword,
    updatePassword,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
