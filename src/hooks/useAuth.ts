import { createContext, useContext, useState, useEffect, useRef, ReactNode, createElement } from 'react';
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
  const loadingTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    let isMounted = true;
    let hasSetUser = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;

        // Só atualiza se houver mudança real
        const newUser = session?.user ? {
          id: session.user.id,
          email: session.user.email || '',
          role: await fetchUserRole(session.user.id),
        } : null;

        if (!hasSetUser) {
          hasSetUser = true;
          setUser(newUser);
          
          // Garante que loading seja desativado após 5 segundos no máximo
          loadingTimeoutRef.current = setTimeout(() => {
            if (isMounted) setLoading(false);
          }, 5000);
          
          // Desativa loading imediatamente quando há sessão
          if (session?.user || !session) {
            if (isMounted) {
              setLoading(false);
            }
            if (loadingTimeoutRef.current) {
              clearTimeout(loadingTimeoutRef.current);
            }
          }
        }
      }
    );

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, []);

  const fetchUserRole = async (userId: string): Promise<'admin' | 'user'> => {
    try {
      const { data } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle();

      return (data?.role as 'admin' | 'user') || 'user';
    } catch (error) {
      console.error('Error fetching user role:', error);
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
