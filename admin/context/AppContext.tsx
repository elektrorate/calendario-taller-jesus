import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { Workshop, User, WorkshopStatus, UserRole, ActivityLog, Invitation, InvitationStatus } from '../types';

interface AppContextType {
  workshops: Workshop[];
  users: User[];
  activityLogs: ActivityLog[];
  invitations: Invitation[];
  currentUser: User | null;
  login: (email: string, pass: string) => Promise<boolean>;
  logout: () => Promise<void>;
  addWorkshop: (workshop: Omit<Workshop, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateWorkshop: (id: string, updates: Partial<Workshop>) => Promise<void>;
  deleteWorkshop: (id: string) => Promise<void>;
  addUser: (user: Omit<User, 'id'>) => Promise<{ userId: string; sedeId?: string } | null>;
  updateUser: (id: string, updates: Partial<User>) => Promise<void>;
  cancelInvitation: (id: string) => Promise<void>;
  authError: string | null;
  loading: boolean;
  showOptimisticUI: boolean;
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
  clearAuthError: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Check if there's likely a session in localStorage (optimistic approach)
const hasStoredSession = (): boolean => {
  try {
    const storageKey = Object.keys(localStorage).find(key =>
      key.startsWith('sb-') && key.endsWith('-auth-token')
    );
    return storageKey ? !!localStorage.getItem(storageKey) : false;
  } catch {
    return false;
  }
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const { logout: authLogout } = useAuth();
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  // Start with optimistic loading if there's a stored session
  const [loading, setLoading] = useState(hasStoredSession());
  const [showOptimisticUI, setShowOptimisticUI] = useState(hasStoredSession());
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const fetchProfile = async (userId: string) => {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      console.error('Error fetching profile:', error);
      return null;
    }

    // Map DB profile to App User
    return {
      id: profile.id,
      nombre: profile.full_name || 'Usuario',
      email: profile.email,
      telefono: profile.phone || '',
      pais: '', // Not in DB yet
      ciudad: '', // Not in DB yet
      estado: WorkshopStatus.ACTIVE,
      rolesGlobales: profile.role === 'super_admin' ? [UserRole.SUPER_ADMIN] : [UserRole.WORKSHOP_ADMIN],
      rolesPorTaller: [] // Logic to be refined based on Sedes ownership
    } as User;
  };

  // Ref to track if initialization is in progress to prevent double firing in React Strict Mode
  const isInitializingRef = React.useRef(false);

  // Ref to track currentUser to avoid stale closures in loadInitialData
  const currentUserRef = React.useRef<User | null>(null);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  const loadInitialData = async (providedSession?: any) => {
    if (isInitializingRef.current) {
      console.log('Skipping loadInitialData: already initializing');
      return;
    }

    isInitializingRef.current = true;
    console.log('--- Loading Initial Data ---');

    // Only show full screen loading if we don't have a user yet (initial load)
    // allowing background refreshes without blocking UI
    // Use ref to check current state, as this function might be closed over initial render
    if (!currentUserRef.current) {
      setLoading(true);
    }
    setAuthError(null);

    try {
      let session = providedSession;
      if (!session) {
        const { data } = await supabase.auth.getSession();
        session = data.session;
      }

      if (session?.user) {
        console.log('User found, fetching profile...');
        const user = await fetchProfile(session.user.id);

        if (user) {
          console.log('User profile loaded, setting context...');
          setCurrentUser(user);

          console.log('Fetching workshops and users in parallel...');
          // Execute fetches in parallel
          await Promise.all([fetchWorkshops(), fetchUsers()]);
          console.log('Initial data loaded successfully.');
        } else {
          console.warn('No profile found for user');
        }
      } else {
        console.log('No active session');
        setCurrentUser(null);
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
      showToast('Error cargando datos del sistema', 'error');
    } finally {
      console.log('Cleaning up loading state...');
      setLoading(false);
      setShowOptimisticUI(false);
      isInitializingRef.current = false;
    }
  };

  const fetchWorkshops = async () => {
    try {
      const { data, error } = await supabase.from('sedes').select('*');
      if (error) {
        throw error;
      }
      if (!data) return;

      const mapped: Workshop[] = data.map((s: any) => ({
        id: s.id,
        nombre: s.name,
        pais: s.country || '',
        ciudad: s.city || '',
        direccion: s.address || '',
        lat: 0,
        lng: 0,
        emailTaller: s.contact_email,
        telefonoTaller: s.contact_phone,
        estado: s.is_active ? WorkshopStatus.ACTIVE : WorkshopStatus.INACTIVE,
        adminGeneralUserId: s.owner_id,
        adminUserIds: s.owner_id ? [s.owner_id] : [],
        createdAt: s.created_at,
        updatedAt: s.updated_at
      }));
      setWorkshops(mapped);
    } catch (error) {
      console.error('Error fetching workshops:', error);
      // Don't toast here to avoid spamming if multiple fail, or handle gracefully
    }
  };

  const fetchUsers = async () => {
    const { data, error } = await supabase.from('profiles').select('*');
    if (error) {
      console.error(error);
      return;
    }
    const mapped: User[] = data.map((p: any) => ({
      id: p.id,
      nombre: p.full_name || 'Sin nombre',
      email: p.email,
      telefono: p.phone || '',
      pais: '',
      ciudad: '',
      estado: WorkshopStatus.ACTIVE,
      rolesGlobales: p.role === 'super_admin' ? [UserRole.SUPER_ADMIN] : [UserRole.WORKSHOP_ADMIN],
      rolesPorTaller: []
    }));
    setUsers(mapped);
  };

  useEffect(() => {
    loadInitialData();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event);
      if (event === 'SIGNED_IN' && session) {
        // Prevent reload if we already have a user and the IDs match
        if (currentUserRef.current && currentUserRef.current.id === session.user.id) {
          console.log('Already logged in as', session.user.email, '- skipping reload');
          return;
        }
        await loadInitialData(session);
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        setWorkshops([]);
        setUsers([]);
        isInitializingRef.current = false;
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, pass: string): Promise<boolean> => {
    setAuthError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) {
      console.error("Login error:", error);
      let message = 'Error al iniciar sesión.';
      if (error.message.includes("Invalid login credentials") || error.message.includes("invalid_grant")) {
        message = 'Credenciales erróneas';
      } else if (error.message.includes("Email not confirmed")) {
        message = 'El correo electrónico no ha sido confirmado. Por favor revisa tu bandeja de entrada.';
      } else {
        message = error.message;
      }
      setAuthError(message);
      return false;
    }
    return true;
  };

  const logout = async () => {
    await authLogout();
    setCurrentUser(null);
    setWorkshops([]);
    setUsers([]);
    navigate('/login', { replace: true });
    showToast('Sesión cerrada', 'info');
  };

  const clearAuthError = () => setAuthError(null);

  const addWorkshop = async (workshop: Omit<Workshop, 'id' | 'createdAt' | 'updatedAt'>) => {
    // Insert into DB
    const { error } = await supabase.from('sedes').insert({
      name: workshop.nombre,
      address: workshop.direccion,
      city: workshop.ciudad,
      country: workshop.pais,
      contact_email: workshop.emailTaller,
      contact_phone: workshop.telefonoTaller,
      owner_id: workshop.adminGeneralUserId,
      slug: workshop.nombre.toLowerCase().replace(/ /g, '-') // Simple slug gen
    });

    if (error) {
      showToast('Error creando taller: ' + error.message, 'error');
      return;
    }
    showToast('Taller creado con éxito', 'success');
    fetchWorkshops();
  };

  const updateWorkshop = async (id: string, updates: Partial<Workshop>) => {
    const dbPayload: Record<string, unknown> = {};
    if (updates.nombre !== undefined) {
      dbPayload.name = updates.nombre;
      dbPayload.slug = updates.nombre.toLowerCase().replace(/ /g, '-');
    }
    if (updates.direccion !== undefined) dbPayload.address = updates.direccion;
    if (updates.ciudad !== undefined) dbPayload.city = updates.ciudad;
    if (updates.pais !== undefined) dbPayload.country = updates.pais;
    if (updates.emailTaller !== undefined) dbPayload.contact_email = updates.emailTaller;
    if (updates.telefonoTaller !== undefined) dbPayload.contact_phone = updates.telefonoTaller;
    if (updates.estado !== undefined) dbPayload.is_active = updates.estado === WorkshopStatus.ACTIVE;
    if (updates.adminGeneralUserId !== undefined) dbPayload.owner_id = updates.adminGeneralUserId;

    const { error } = await supabase.from('sedes').update(dbPayload).eq('id', id);

    if (error) {
      showToast('Error actualizando taller: ' + error.message, 'error');
      return;
    }
    showToast('Taller actualizado', 'success');
    fetchWorkshops();
  };

  const deleteWorkshop = async (id: string) => {
    try {
      // Find the owner (tallerista) of this sede
      const workshop = workshops.find(w => w.id === id);
      const ownerId = workshop?.adminGeneralUserId;

      if (!ownerId) {
        showToast('No se encontró el propietario del taller', 'error');
        return;
      }

      // Call the Edge Function that deletes EVERYTHING:
      // auth user + profile + sede + all dependent data (teachers, students, etc.)
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId: ownerId }
      });

      if (error) {
        showToast('Error al eliminar: ' + error.message, 'error');
        return;
      }

      if (data?.error) {
        showToast(data.error, 'error');
        return;
      }

      showToast('Taller y usuario eliminados correctamente', 'success');
      await Promise.all([fetchWorkshops(), fetchUsers()]);
    } catch (err: any) {
      showToast('Error inesperado: ' + (err.message || ''), 'error');
    }
  };

  const addUser = async (user: Omit<User, 'id'>): Promise<{ userId: string; sedeId?: string } | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: user.email,
          password: user.password || 'Taller123!',
          nombre: user.nombre,
          role: 'tallerista',
          telefono: user.telefono,
          pais: user.pais,
          ciudad: user.ciudad
        }
      });

      if (error) {
        const msg = error.message || 'Error desconocido';
        throw new Error(msg);
      }

      if (!data) {
        throw new Error('Respuesta vacía del servidor');
      }

      // Check for error in response body
      if (data.error) {
        throw new Error(data.error);
      }

      // Successful creation — Edge Function now returns { user, sede }
      const userId = data.id || data.user?.id;

      if (!userId) {
        console.warn('User created but no ID returned immediately', data);
        if (data.email) {
          showToast(`Usuario ${user.nombre} creado correctamente`, 'success');
          await Promise.all([fetchUsers(), fetchWorkshops()]);
          return { userId: data.id };
        }
        throw new Error('El servidor no devolvió el ID del usuario');
      }

      // Log sede creation result
      if (data.sede) {
        if (data.sede.error) {
          console.warn('Sede auto-creation had an issue:', data.sede.error);
        } else {
          console.log('Sede auto-created:', data.sede.id, data.sede.name);
        }
      }

      showToast(`Usuario ${user.nombre} creado correctamente`, 'success');
      // Refresh both users AND workshops since Edge Function now auto-creates a sede
      await Promise.all([fetchUsers(), fetchWorkshops()]);
      return { userId, sedeId: data.sede?.id };

    } catch (err: any) {
      console.error('Error creating user:', err);
      showToast(err.message || 'Error al crear usuario', 'error');
      return null;
    }
  };

  const updateUser = async (id: string, updates: Partial<User>) => {
    const { error } = await supabase.from('profiles').update({
      full_name: updates.nombre,
      phone: updates.telefono
    }).eq('id', id);

    if (error) {
      showToast('Error actualizando usuario', 'error');
      return;
    }
    showToast('Usuario actualizado', 'info');
    fetchUsers();
  };

  const cancelInvitation = async (id: string) => {
    setInvitations(prev => prev.filter(i => i.id !== id));
    showToast('Invitación cancelada', 'info');
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <AppContext.Provider value={{ workshops, users, activityLogs, invitations, currentUser, login, logout, addWorkshop, updateWorkshop, deleteWorkshop, addUser, updateUser, cancelInvitation, loading, showOptimisticUI, toast, showToast, authError, clearAuthError }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
};
