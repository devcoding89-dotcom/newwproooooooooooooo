import { useState, useEffect, useCallback } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../config/supabase';
import { Profile, UserRole } from '../types';

interface AuthState {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  connectionError: boolean;
}

// Check for demo mode user in localStorage
function getDemoUser(): Profile | null {
  try {
    const demo = localStorage.getItem('demo_user');
    if (demo) return JSON.parse(demo) as Profile;
  } catch { /* ignore */ }
  return null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>(() => {
    const demoUser = getDemoUser();
    if (demoUser) {
      return {
        user: null,
        profile: demoUser,
        session: null,
        isLoading: false,
        isAuthenticated: true,
        connectionError: false,
      };
    }
    return {
      user: null,
      profile: null,
      session: null,
      isLoading: true,
      isAuthenticated: false,
      connectionError: false,
    };
  });

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error) console.error('Profile fetch error:', error);
    return data as Profile | null;
  }, []);

  const checkSession = useCallback(async () => {
    // Check for demo mode first
    const demoUser = getDemoUser();
    if (demoUser) {
      setState({
        user: null,
        profile: demoUser,
        session: null,
        isLoading: false,
        isAuthenticated: true,
        connectionError: false,
      });
      return;
    }

    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Session error:', error);
        setState((s) => ({ ...s, isLoading: false, connectionError: true }));
        return;
      }
      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
        setState({
          user: session.user,
          profile,
          session,
          isLoading: false,
          isAuthenticated: true,
          connectionError: false,
        });
      } else {
        setState((s) => ({ ...s, isLoading: false, connectionError: false }));
      }
    } catch (err) {
      console.error('Network error checking session:', err);
      setState((s) => ({ ...s, isLoading: false, connectionError: true }));
    }
  }, [fetchProfile]);

  useEffect(() => {
    checkSession();

    // Only subscribe to auth changes if not in demo mode
    if (!getDemoUser()) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        (async () => {
          if (session?.user) {
            const profile = await fetchProfile(session.user.id);
            setState({
              user: session.user,
              profile,
              session,
              isLoading: false,
              isAuthenticated: true,
              connectionError: false,
            });
          } else {
            setState({ user: null, profile: null, session: null, isLoading: false, isAuthenticated: false, connectionError: false });
          }
        })();
      });
      return () => subscription.unsubscribe();
    }
  }, [fetchProfile, checkSession]);

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data;
    } catch (err) {
      if (err instanceof TypeError && err.message === 'Failed to fetch') {
        throw new Error('Cannot connect to Supabase. Please check your network connection.');
      }
      throw err;
    }
  };

  const signUp = async (email: string, password: string, metadata: {
    full_name: string;
    role: UserRole;
    phone?: string;
    department_id?: string;
    level_id?: string;
  }) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { role: metadata.role, full_name: metadata.full_name } },
      });
      if (error) throw error;

      if (data.user) {
        const approvalStatus = metadata.role === 'student' ? 'approved' : 'pending';
        const { error: profileError } = await supabase.from('profiles').insert({
          id: data.user.id,
          full_name: metadata.full_name,
          phone: metadata.phone || '',
          role: metadata.role,
          department_id: metadata.department_id || null,
          level_id: metadata.level_id || null,
          approval_status: approvalStatus,
        });
        if (profileError) throw profileError;
      }
      return data;
    } catch (err) {
      if (err instanceof TypeError && err.message === 'Failed to fetch') {
        throw new Error('Cannot connect to Supabase. Please check your network connection.');
      }
      throw err;
    }
  };

  const signOut = async () => {
    // Clear demo mode
    localStorage.removeItem('demo_user');
    setState({ user: null, profile: null, session: null, isLoading: false, isAuthenticated: false, connectionError: false });

    // Also try to sign out from Supabase if connected
    try {
      await supabase.auth.signOut();
    } catch { /* ignore */ }
  };

  const refreshProfile = async () => {
    if (state.user) {
      const profile = await fetchProfile(state.user.id);
      setState((s) => ({ ...s, profile }));
    }
  };

  return { ...state, signIn, signUp, signOut, refreshProfile, checkSession };
}
