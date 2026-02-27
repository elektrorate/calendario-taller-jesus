import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';

export type UserRole = 'super_admin' | 'tallerista' | 'staff';

export interface Profile {
    id: string;
    email: string;
    full_name?: string;
    phone?: string;
    avatar_url?: string;
    role: UserRole;
    created_at?: string;
    updated_at?: string;
}

interface AuthContextType {
    session: Session | null;
    user: User | null;
    profile: Profile | null;
    loading: boolean;
    error: string | null;
    sedeId: string | null;
    isSuperAdmin: boolean;
    isTallerista: boolean;
    isStaff: boolean;
    login: (email: string, password: string) => Promise<{ success: boolean; role?: UserRole; error?: string }>;
    logout: () => Promise<void>;
    clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: ReactNode;
}

// Max time (ms) to wait for auth initialization before forcing loading=false
const AUTH_TIMEOUT_MS = 8000;

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sedeId, setSedeId] = useState<string | null>(null);

    // Track if initial load is done to prevent onAuthStateChange from interfering
    const initializedRef = useRef(false);
    const profileRef = useRef<Profile | null>(null);

    useEffect(() => {
        profileRef.current = profile;
    }, [profile]);

    const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) {
                console.error('Error fetching profile:', error.message);
                return null;
            }

            return data as Profile;
        } catch (err) {
            console.error('Error in fetchProfile:', err);
            return null;
        }
    }, []);

    const fetchSedeId = useCallback(async (userId: string, role: UserRole): Promise<string | null> => {
        if (role === 'super_admin') {
            return null;
        }

        try {
            const { data: ownedSedes, error: ownedError } = await supabase
                .from('sedes')
                .select('id')
                .eq('owner_id', userId)
                .eq('is_active', true)
                .limit(1);

            if (!ownedError && ownedSedes && ownedSedes.length > 0) {
                return ownedSedes[0].id;
            }

            const { data: memberships, error: memberError } = await supabase
                .from('sede_members')
                .select('sede_id')
                .eq('user_id', userId)
                .limit(1);

            if (!memberError && memberships && memberships.length > 0) {
                return memberships[0].sede_id;
            }

            console.warn('No sede found for user', userId);
            return null;
        } catch (err) {
            console.error('Error fetching sede_id:', err);
            return null;
        }
    }, []);

    // Full load helper: sets session, user, profile, sedeId, and loading=false
    const loadUserData = useCallback(async (currentSession: Session) => {
        setSession(currentSession);
        setUser(currentSession.user);

        const userProfile = await fetchProfile(currentSession.user.id);
        if (userProfile) {
            setProfile(userProfile);
            profileRef.current = userProfile;
            const userSedeId = await fetchSedeId(currentSession.user.id, userProfile.role);
            setSedeId(userSedeId);
        }

        setLoading(false);
    }, [fetchProfile, fetchSedeId]);

    // Initialize auth on mount
    useEffect(() => {
        let isActive = true;

        // Safety timeout: if auth takes too long, force loading=false
        const timeoutId = setTimeout(() => {
            if (isActive && !initializedRef.current) {
                console.warn('Auth initialization timed out — forcing loading=false');
                initializedRef.current = true;
                setLoading(false);
            }
        }, AUTH_TIMEOUT_MS);

        const initializeAuth = async () => {
            try {
                const { data: { session: currentSession } } = await supabase.auth.getSession();

                if (!isActive) return;

                if (currentSession?.user) {
                    await loadUserData(currentSession);
                } else {
                    // No session: just stop loading
                    setLoading(false);
                }
            } catch (err) {
                console.error('Error initializing auth:', err);
                if (isActive) {
                    setLoading(false);
                }
            } finally {
                if (isActive) {
                    initializedRef.current = true;
                }
            }
        };

        initializeAuth();

        // Listen for auth changes AFTER initial load
        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, newSession) => {
            if (!isActive) return;

            // During initial load, ignore SIGNED_IN — initializeAuth handles it
            if (!initializedRef.current && event === 'SIGNED_IN') {
                return;
            }

            if (event === 'SIGNED_OUT') {
                setSession(null);
                setUser(null);
                setProfile(null);
                profileRef.current = null;
                setSedeId(null);
                setLoading(false);
                return;
            }

            if (event === 'TOKEN_REFRESHED' && newSession) {
                setSession(newSession);
                setUser(newSession.user);
                return;
            }

            if (event === 'SIGNED_IN' && newSession?.user) {
                // This fires after manual login or re-auth (not initial page load)
                await loadUserData(newSession);
            }
        });

        return () => {
            isActive = false;
            clearTimeout(timeoutId);
            authListener.subscription.unsubscribe();
        };
    }, [loadUserData]);

    const login = async (email: string, password: string): Promise<{ success: boolean; role?: UserRole; error?: string }> => {
        setError(null);

        try {
            const { data, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (authError) {
                const errorMessage = authError.message === 'Invalid login credentials'
                    ? 'Credenciales incorrectas. Verifica tu email y contraseña.'
                    : authError.message;
                setError(errorMessage);
                return { success: false, error: errorMessage };
            }

            if (!data.user) {
                setError('No se pudo obtener la información del usuario.');
                return { success: false, error: 'No se pudo obtener la información del usuario.' };
            }

            const userProfile = await fetchProfile(data.user.id);

            if (!userProfile) {
                await supabase.auth.signOut();
                setError('No se encontró el perfil del usuario.');
                return { success: false, error: 'No se encontró el perfil del usuario.' };
            }

            setSession(data.session);
            setUser(data.user);
            setProfile(userProfile);
            profileRef.current = userProfile;

            const userSedeId = await fetchSedeId(data.user.id, userProfile.role);
            setSedeId(userSedeId);
            setLoading(false);

            return { success: true, role: userProfile.role };
        } catch (err) {
            const errorMessage = 'Error inesperado al iniciar sesión.';
            setError(errorMessage);
            return { success: false, error: errorMessage };
        }
    };

    const logout = async () => {
        try {
            await supabase.auth.signOut();
            setSession(null);
            setUser(null);
            setProfile(null);
            profileRef.current = null;
            setSedeId(null);
            setError(null);
        } catch (err) {
            console.error('Error logging out:', err);
        }
    };

    const clearError = () => setError(null);

    const value: AuthContextType = {
        session,
        user,
        profile,
        loading,
        error,
        sedeId,
        isSuperAdmin: profile?.role === 'super_admin',
        isTallerista: profile?.role === 'tallerista',
        isStaff: profile?.role === 'staff',
        login,
        logout,
        clearError,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
