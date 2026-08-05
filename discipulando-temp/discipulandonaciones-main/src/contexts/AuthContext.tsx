import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type UserRole = 'ADMIN' | 'LIDER' | null;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: UserRole;
  leaderProfile: { id: string; full_name: string; email: string | null } | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  role: null,
  leaderProfile: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [leaderProfile, setLeaderProfile] = useState<AuthContextType['leaderProfile']>(null);
  const [loading, setLoading] = useState(true);

  const fetchRoleAndProfile = async (userId: string) => {
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);
    
    if (roles && roles.length > 0) {
      setRole(roles[0].role as UserRole);
    } else {
      setRole(null);
    }

    const { data: leader } = await supabase
      .from('leaders')
      .select('id, full_name, email')
      .eq('id', userId)
      .maybeSingle();
    
    setLeaderProfile(leader);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => fetchRoleAndProfile(session.user.id), 0);
        } else {
          setRole(null);
          setLeaderProfile(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchRoleAndProfile(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
    setLeaderProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, role, leaderProfile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
