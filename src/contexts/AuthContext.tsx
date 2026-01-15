/**
 * AuthContext.tsx - Authentication State Management
 * 
 * This context provides global authentication state and methods for the app.
 * It handles:
 * - User session management via Supabase Auth
 * - Profile data fetching from the profiles table
 * - Role management from the user_roles table
 * - Login, signup, and logout functionality
 * 
 * Security Notes:
 * - Roles are stored in a separate table (user_roles) to prevent privilege escalation
 * - Profile data includes sensitive fields (phone, email) that are only visible to admins
 * - The has_role() database function is used for secure role checking
 * 
 * Usage:
 * ```tsx
 * const { user, profile, role, login, signup, logout } = useAuth();
 * ```
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { secureLog } from '@/lib/secure-logger';

// Application roles - stored in user_roles table with RLS
type AppRole = 'customer' | 'washer' | 'admin';

/**
 * Profile interface matching the profiles table schema.
 * Note: phone and email are only visible to admins via RLS policies.
 */
interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  phone: string | null;      // Admin-only visible
  email: string | null;      // Admin-only visible
  avatar_url: string | null;
  address: string | null;
  rating: number;
  completed_jobs: number;
}

/**
 * AuthContext type definition - all values and methods exposed by the context.
 */
interface AuthContextType {
  user: User | null;              // Supabase auth user object
  session: Session | null;        // Current auth session with JWT
  profile: Profile | null;        // User's profile data
  role: AppRole | null;           // User's role (customer/washer/admin)
  isAuthenticated: boolean;       // Quick check if user is logged in
  isLoading: boolean;             // Loading state during auth operations
  isAdmin: boolean;               // Quick check if user is admin
  login: (email: string, password: string) => Promise<{ error: Error | null }>;
  signup: (name: string, email: string, password: string, role: AppRole) => Promise<{ error: Error | null }>;
  logout: () => Promise<void>;
}

// Create the context with undefined default (will be provided by AuthProvider)
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * AuthProvider - Wraps the app and provides authentication state.
 * Must be placed high in the component tree (typically in App.tsx).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Fetches user's profile and role data from the database.
   * Called after successful authentication.
   * 
   * @param userId - The authenticated user's ID
   */
  const fetchUserData = async (userId: string) => {
    try {
      // Fetch profile from profiles table
      // RLS ensures users can only see their own full profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError) {
        secureLog.error('Error fetching profile:', profileError.message);
      } else {
        setProfile(profileData);
      }

      // Fetch role from user_roles table
      // Roles are stored separately for security (prevents privilege escalation)
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      if (roleError) {
        secureLog.error('Error fetching role:', roleError.message);
      } else {
        setRole(roleData?.role as AppRole);
      }
    } catch (error) {
      secureLog.error('Error fetching user data');
    }
  };

  /**
   * Set up auth state listener on mount.
   * This handles session persistence and auth state changes.
   */
  useEffect(() => {
    // Set up auth state listener FIRST to avoid race conditions
    // This is the recommended pattern from Supabase docs
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Defer Supabase calls with setTimeout to avoid deadlock
          // This prevents issues with simultaneous auth state updates
          setTimeout(() => {
            fetchUserData(session.user.id);
          }, 0);
        } else {
          // Clear user data on logout
          setProfile(null);
          setRole(null);
        }
        setIsLoading(false);
      }
    );

    // THEN check for existing session (page refresh scenario)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserData(session.user.id);
      }
      setIsLoading(false);
    });

    // Cleanup subscription on unmount
    return () => subscription.unsubscribe();
  }, []);

  /**
   * Login with email and password.
   * After successful login, the auth state listener will fetch user data.
   */
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setIsLoading(false);
    return { error };
  };

  /**
   * Sign up a new user with role selection.
   * The role is passed as user metadata and used by the database trigger
   * (handle_new_user) to create the profile and assign the role.
   */
  const signup = async (name: string, email: string, password: string, role: AppRole) => {
    setIsLoading(true);
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          // This metadata is used by the handle_new_user trigger
          // to create the profile and assign the role automatically
          full_name: name,
          role: role,
        },
      },
    });
    setIsLoading(false);
    return { error };
  };

  /**
   * Logout the current user and clear all state.
   */
  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        role,
        isAuthenticated: !!user,
        isLoading,
        isAdmin: role === 'admin',
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Custom hook to access auth context.
 * Must be used within an AuthProvider.
 * 
 * @throws Error if used outside of AuthProvider
 * @returns AuthContextType - All auth state and methods
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
