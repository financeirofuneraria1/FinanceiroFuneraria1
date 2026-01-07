import { createContext, useContext, useState, useEffect, ReactNode, createElement } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'user';
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  signUp: (email: string, password: string, name: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        
        if (!isMounted) return;

        if (data.session?.user) {
          const userRole = await fetchUserRole(data.session.user.id);
          setUser({
            id: data.session.user.id,
            email: data.session.user.email || '',
            role: userRole,
          });
        }
      } catch (error) {
        console.error('Error getting session:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;

        if (session?.user) {
          const userRole = await fetchUserRole(session.user.id);
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            role: userRole,
          });
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    return () => {
      isMounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const fetchUserRole = async (userId: string): Promise<'admin' | 'user'> => {
    try {
      const { data } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (!data) {
        // Se não existe profile, criar um
        await supabase.rpc('init_user_profile');
        return 'user';
      }

      return (data.role as 'admin' | 'user') || 'user';
    } catch (error) {
      console.error('Error fetching user role:', error);
      // Tentar criar profile se não existir
      try {
        await supabase.rpc('init_user_profile');
      } catch (rpcError) {
        console.error('Error initializing profile:', rpcError);
      }
      return 'user';
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
        },
      });

      if (error) {
        return { error };
      }

      return { error: null };
    } catch (error) {
      return { error: error instanceof Error ? error : new Error('Unknown error') };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Sign in error:', error);
        return { error };
      }

      return { error: null };
    } catch (error) {
      console.error('Sign in exception:', error);
      return { error: error instanceof Error ? error : new Error('Unknown error') };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const isAdmin = user?.role === 'admin';

  const value: AuthContextType = {
    user,
    loading,
    isAdmin,
    signUp,
    signIn,
    signOut,
  };

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
}
