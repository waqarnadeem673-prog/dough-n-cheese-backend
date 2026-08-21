import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { withTimeout } from '@/utils/withTimeout';
import type { AdminProfile, AdminRole } from '@/types/database';

export type AuthContextType = {
  session: Session | null;
  user: User | null;
  profile: AdminProfile | null;
  role: AdminRole | null;
  loading: boolean;
  isInitializingAuth: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [isInitializingAuth, setIsInitializingAuth] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchAdminProfile = async (
    userId: string
  ): Promise<{ profile: AdminProfile | null; error: Error | null }> => {
    try {
      const { data, error } = await withTimeout(
        supabase
          .from('admin_profiles')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle(),
        8_000,
        'Admin profile lookup'
      );

      if (error) {
        console.error('Error fetching admin profile:', error.message);
        return {
          profile: null,
          error: new Error(`Database error fetching admin profile: ${error.message}`),
        };
      }

      if (!data) {
        return {
          profile: null,
          error: new Error('No administrator profile found for this account. Please contact an owner.'),
        };
      }

      if (!data.is_active) {
        return {
          profile: null,
          error: new Error('This administrator account has been deactivated. Please contact an owner.'),
        };
      }

      return { profile: data as AdminProfile, error: null };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unexpected error fetching admin profile';
      console.error('Error fetching admin profile:', msg);
      return { profile: null, error: new Error(msg) };
    }
  };

  const refreshProfile = async () => {
    if (!user) {
      setProfile(null);
      return;
    }
    const { profile: adminData } = await fetchAdminProfile(user.id);
    setProfile(adminData);
  };

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        const { data, error } = await withTimeout(
          supabase.auth.getSession(),
          10_000,
          'Session verification'
        );

        if (!mounted) return;

        if (error) {
          console.error('Session retrieval error:', error.message);
          setSession(null);
          setUser(null);
          setProfile(null);
          return;
        }

        const currentSession = data.session;
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          const { profile: adminData } = await fetchAdminProfile(currentSession.user.id);
          if (mounted) setProfile(adminData);
        } else {
          if (mounted) setProfile(null);
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        if (mounted) {
          setIsInitializingAuth(false);
          setLoading(false);
        }
      }
    }

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;

        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setProfile(null);
          setLoading(false);
          setIsInitializingAuth(false);
          return;
        }

        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          const { profile: adminData } = await fetchAdminProfile(newSession.user.id);
          if (mounted) setProfile(adminData);
        } else {
          if (mounted) setProfile(null);
        }

        if (mounted) {
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string): Promise<{ error: Error | null }> => {
    try {
      const { data, error } = await withTimeout(
        supabase.auth.signInWithPassword({
          email,
          password,
        }),
        10_000,
        'Authentication'
      );

      if (error) {
        return { error: new Error(error.message) };
      }

      if (!data?.user || !data?.session) {
        return { error: new Error('Authentication failed: No user session was returned.') };
      }

      // Update session and user immediately
      setSession(data.session);
      setUser(data.user);

      // Verify active admin profile and role
      const { profile: adminData, error: profileErr } = await fetchAdminProfile(data.user.id);

      if (profileErr || !adminData) {
        // If auth succeeded but admin profile verification failed, cleanly sign out
        await supabase.auth.signOut().catch(() => {});
        setSession(null);
        setUser(null);
        setProfile(null);
        return {
          error: profileErr || new Error('Unauthorized. This account is not registered as an active administrator.'),
        };
      }

      setProfile(adminData);
      return { error: null };
    } catch (err) {
      return {
        error: err instanceof Error ? err : new Error('An unexpected error occurred during sign in.'),
      };
    }
  };

  const signOut = async () => {
    try {
      await withTimeout(supabase.auth.signOut(), 5_000, 'Sign out').catch(() => {});
    } finally {
      setSession(null);
      setUser(null);
      setProfile(null);
    }
  };

  const value: AuthContextType = {
    session,
    user,
    profile,
    role: profile?.role ?? null,
    loading,
    isInitializingAuth,
    signIn,
    signOut,
    refreshProfile,
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
