
import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { supabase } from '../../supabaseClient';
import { Button, Input, Modal } from '../components/UI';

/* ───────────────────────────────────────────────
   Tipos auxiliares
   ─────────────────────────────────────────────── */
interface TeamMember {
    id: string;
    email: string;
    full_name: string;
    phone: string;
    role: string;
    sede_name: string;
}

/* ───────────────────────────────────────────────
   Helper: call manage-staff edge function
   ─────────────────────────────────────────────── */
async function callManageStaff(body: Record<string, any>): Promise<any> {
    const { data, error } = await supabase.functions.invoke('manage-staff', { body });
    if (error) throw new Error(error.message || 'Error de conexión con el servidor.');
    if (data?.error) throw new Error(data.error);
    return data;
}

/* ───────────────────────────────────────────────
   Standalone load function — NO React dependencies
   ─────────────────────────────────────────────── */
async function fetchTeamMembers(): Promise<TeamMember[]> {
    // 1) Get all tallerista + staff profiles
    const { data: profiles, error: profError } = await supabase
        .from('profiles')
        .select('id, email, full_name, phone, role')
        .in('role', ['tallerista', 'staff'])
        .order('full_name');

    if (profError) {
        console.error('[TeamManagement] profiles query error:', profError);
        throw new Error('Error cargando perfiles: ' + profError.message);
    }

    if (!profiles || profiles.length === 0) {
        console.warn('[TeamManagement] No profiles found with role tallerista/staff');
        return [];
    }

    console.log(`[TeamManagement] Found ${profiles.length} team members`);

    // 2) Try to get sede names (non-critical — if fails, we still show members)
    let sedeMap: Record<string, string> = {};
    try {
        const { data: sedes } = await supabase
            .from('sedes')
            .select('id, owner_id, name');

        if (sedes) {
            // Map talleristas to their sede by owner_id
            sedes.forEach((s: any) => {
                if (s.owner_id) sedeMap[s.owner_id] = s.name;
            });

            // Map staff to their sede via sede_members
            const { data: memberships } = await supabase
                .from('sede_members')
                .select('user_id, sede_id');

            if (memberships) {
                const sedeIdMap: Record<string, string> = {};
                sedes.forEach((s: any) => { sedeIdMap[s.id] = s.name; });
                memberships.forEach((m: any) => {
                    if (!sedeMap[m.user_id] && sedeIdMap[m.sede_id]) {
                        sedeMap[m.user_id] = sedeIdMap[m.sede_id];
                    }
                });
            }
        }
    } catch (sedeErr) {
        // Non-critical — members still show without sede names
        console.warn('[TeamManagement] sede lookup failed (non-critical):', sedeErr);
    }

    return profiles.map(p => ({
        id: p.id,
        email: p.email || '',
        full_name: p.full_name || 'Sin nombre',
        phone: p.phone || '',
        role: p.role || 'tallerista',
        sede_name: sedeMap[p.id] || ''
    }));
}

/* ───────────────────────────────────────────────
   Page Component
   ─────────────────────────────────────────────── */
export const TeamManagement: React.FC = () => {
    const { currentUser, showToast } = useAppContext();
    const showToastRef = useRef(showToast);
    showToastRef.current = showToast;

    /* ── Admin profile state ── */
    const [adminForm, setAdminForm] = useState({ nombre: '', telefono: '' });
    const [adminSaving, setAdminSaving] = useState(false);

    /* ── Password state ── */
    const [pwForm, setPwForm] = useState({ newPassword: '', confirmPassword: '' });
    const [pwSaving, setPwSaving] = useState(false);

    /* ── Team list state ── */
    const [team, setTeam] = useState<TeamMember[]>([]);
    const [teamLoading, setTeamLoading] = useState(true);

    /* ── Edit member modal ── */
    const [editMember, setEditMember] = useState<TeamMember | null>(null);
    const [editForm, setEditForm] = useState({ nombre: '', telefono: '', newPassword: '' });
    const [editSaving, setEditSaving] = useState(false);

    /* ── Search ── */
    const [search, setSearch] = useState('');

    /* ── Seed admin form from currentUser ── */
    useEffect(() => {
        if (currentUser) {
            setAdminForm({
                nombre: currentUser.nombre || '',
                telefono: currentUser.telefono || ''
            });
        }
    }, [currentUser]);

    /* ── Load team on mount — no deps, runs once ── */
    const loadTeam = async () => {
        setTeamLoading(true);
        try {
            const members = await fetchTeamMembers();
            setTeam(members);
        } catch (err: any) {
            console.error('[TeamManagement] loadTeam failed:', err);
            showToastRef.current(err.message || 'Error cargando equipo', 'error');
        } finally {
            setTeamLoading(false);
        }
    };

    useEffect(() => {
        loadTeam();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /* ────────────────────────────────
       Handlers
       ──────────────────────────────── */

    const handleSaveAdmin = async () => {
        if (!currentUser) return;
        if (!adminForm.nombre.trim()) {
            showToast('El nombre es obligatorio', 'error');
            return;
        }
        setAdminSaving(true);
        try {
            await callManageStaff({
                action: 'update_profile',
                targetUserId: currentUser.id,
                full_name: adminForm.nombre.trim(),
                phone: adminForm.telefono.trim()
            });
            showToast('Datos del administrador actualizados ✓', 'success');
        } catch (err: any) {
            showToast(err.message || 'Error inesperado', 'error');
        } finally {
            setAdminSaving(false);
        }
    };

    const handleChangePassword = async () => {
        if (pwForm.newPassword !== pwForm.confirmPassword) {
            showToast('Las contraseñas no coinciden', 'error');
            return;
        }
        if (pwForm.newPassword.length < 6) {
            showToast('La contraseña debe tener al menos 6 caracteres', 'error');
            return;
        }
        setPwSaving(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: pwForm.newPassword });
            if (error) {
                showToast(error.message || 'Error al cambiar contraseña', 'error');
            } else {
                showToast('Contraseña actualizada exitosamente ✓', 'success');
                setPwForm({ newPassword: '', confirmPassword: '' });
            }
        } catch (err: any) {
            showToast(err.message || 'Error inesperado', 'error');
        } finally {
            setPwSaving(false);
        }
    };

    const openEditMember = (member: TeamMember) => {
        setEditMember(member);
        setEditForm({ nombre: member.full_name, telefono: member.phone, newPassword: '' });
    };

    const handleSaveMember = async () => {
        if (!editMember) return;
        if (!editForm.nombre.trim()) {
            showToast('El nombre es obligatorio', 'error');
            return;
        }
        setEditSaving(true);
        try {
            // 1. Update profile
            await callManageStaff({
                action: 'update_profile',
                targetUserId: editMember.id,
                full_name: editForm.nombre.trim(),
                phone: editForm.telefono.trim()
            });

            // 2. Update password if provided
            if (editForm.newPassword.trim()) {
                if (editForm.newPassword.trim().length < 6) {
                    showToast('Perfil guardado, pero la contraseña necesita mínimo 6 caracteres', 'error');
                    setEditMember(null);
                    await loadTeam();
                    setEditSaving(false);
                    return;
                }
                await callManageStaff({
                    action: 'update_password',
                    staffUserId: editMember.id,
                    password: editForm.newPassword.trim()
                });
                showToast('Perfil y contraseña actualizados ✓', 'success');
            } else {
                showToast('Perfil actualizado correctamente ✓', 'success');
            }

            setEditMember(null);
            await loadTeam();
        } catch (err: any) {
            showToast(err.message || 'Error inesperado', 'error');
        } finally {
            setEditSaving(false);
        }
    };

    /* ── Filtered members ── */
    const filtered = team.filter(m => {
        const q = search.toLowerCase();
        if (!q) return true;
        return m.full_name.toLowerCase().includes(q) ||
            m.email.toLowerCase().includes(q) ||
            m.role.toLowerCase().includes(q);
    });

    const roleLabel = (r: string) => {
        if (r === 'tallerista') return 'TALLERISTA';
        if (r === 'staff') return 'STAFF';
        return r.toUpperCase();
    };

    /* ────────────────────────────────
       RENDER
       ──────────────────────────────── */
    return (
        <div className="animate-fade-in max-w-5xl mx-auto space-y-16">

            {/* ── HEADER ── */}
            <div>
                <h2 className="text-[52px] font-extrabold tracking-tight text-[#312A2C] leading-none uppercase">
                    Gestión del <span className="text-[#C17D5C]">Equipo</span>
                </h2>
                <p className="text-[16px] font-medium text-[#8A8481] mt-4 max-w-xl">
                    Edita tus datos de administrador, cambia tu contraseña y gestiona las credenciales de talleristas y staff.
                </p>
            </div>

            {/* ── SECCIÓN 1: Datos del Administrador ── */}
            <section className="bg-white rounded-[48px] border border-[#F1E9E2] p-10 md:p-14 space-y-8">
                <div>
                    <p className="text-[11px] font-extrabold text-[#C17D5C] uppercase tracking-[0.2em] mb-2">MI PERFIL</p>
                    <h3 className="text-[28px] font-extrabold text-[#312A2C] uppercase tracking-tight">Datos del Administrador</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input
                        label="Nombre completo"
                        value={adminForm.nombre}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAdminForm({ ...adminForm, nombre: e.target.value })}
                        placeholder="Tu nombre"
                    />
                    <Input
                        label="Teléfono"
                        value={adminForm.telefono}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAdminForm({ ...adminForm, telefono: e.target.value })}
                        placeholder="+34 600 000 000"
                    />
                </div>

                <div className="flex items-center gap-4 rounded-[24px] bg-[#F4EEE8]/60 p-5 border border-[#F1E9E2]">
                    <div className="w-3 h-3 bg-[#C17D5C] rounded-full shrink-0"></div>
                    <p className="text-[13px] text-[#8A8481] font-medium">
                        Email: <span className="font-bold text-[#312A2C]">{currentUser?.email || '—'}</span>
                        <span className="ml-2 text-[11px] text-[#8A8481] uppercase">(no editable)</span>
                    </p>
                </div>

                <Button variant="dark" size="md" onClick={handleSaveAdmin} disabled={adminSaving}>
                    {adminSaving ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}
                </Button>
            </section>

            {/* ── SECCIÓN 2: Cambiar Contraseña ── */}
            <section className="bg-white rounded-[48px] border border-[#F1E9E2] p-10 md:p-14 space-y-8">
                <div>
                    <p className="text-[11px] font-extrabold text-[#C17D5C] uppercase tracking-[0.2em] mb-2">SEGURIDAD</p>
                    <h3 className="text-[28px] font-extrabold text-[#312A2C] uppercase tracking-tight">Cambiar Contraseña</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input label="Nueva contraseña" type="password" value={pwForm.newPassword}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPwForm({ ...pwForm, newPassword: e.target.value })}
                        placeholder="Mínimo 6 caracteres" />
                    <Input label="Confirmar contraseña" type="password" value={pwForm.confirmPassword}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
                        placeholder="Repite la contraseña" />
                </div>
                <Button variant="dark" size="md" onClick={handleChangePassword} disabled={pwSaving}>
                    {pwSaving ? 'ACTUALIZANDO...' : 'ACTUALIZAR CONTRASEÑA'}
                </Button>
            </section>

            {/* ── SECCIÓN 3: Credenciales del Equipo ── */}
            <section className="bg-white rounded-[48px] border border-[#F1E9E2] p-10 md:p-14 space-y-8">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <p className="text-[11px] font-extrabold text-[#C17D5C] uppercase tracking-[0.2em] mb-2">CREDENCIALES</p>
                        <h3 className="text-[28px] font-extrabold text-[#312A2C] uppercase tracking-tight">Equipo de Trabajo</h3>
                        <p className="text-[13px] text-[#8A8481] font-medium mt-1">Talleristas y Staff — edita sus datos o restablece contraseñas.</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                        <span className="px-5 py-2 bg-[#F4EEE8] rounded-full text-[11px] font-extrabold text-[#8A8481] uppercase tracking-widest">
                            {team.length} miembro{team.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                </div>

                {/* Search */}
                <div className="relative max-w-md">
                    <svg className="absolute left-5 top-1/2 -translate-y-1/2 text-[#8A8481]" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16" y2="16" />
                    </svg>
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Buscar por nombre, email o rol..."
                        className="w-full h-14 pl-14 pr-6 rounded-full bg-[#F7F1EB] border border-[#F1E9E2] focus:border-[#C17D5C] focus:ring-4 focus:ring-[#C17D5C]/10 outline-none transition-all font-medium text-sm" />
                </div>

                {/* List */}
                {teamLoading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="w-8 h-8 border-3 border-[#C17D5C] border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="py-16 text-center bg-[#F7F1EB]/50 border-2 border-dashed border-[#F1E9E2] rounded-[32px]">
                        <p className="text-[13px] font-extrabold text-[#8A8481] uppercase tracking-widest">
                            {search ? 'Sin resultados para tu búsqueda' : 'No hay miembros del equipo registrados'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filtered.map(member => (
                            <div key={member.id}
                                className="flex flex-col md:flex-row md:items-center gap-4 p-6 md:p-8 bg-[#F7F1EB]/40 hover:bg-[#F7F1EB] rounded-[28px] border border-[#F1E9E2] transition-all group">
                                <div className="w-14 h-14 rounded-full border-2 border-white overflow-hidden shadow-sm shrink-0 bg-white">
                                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${member.email}`} alt={member.full_name} className="w-full h-full" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[16px] font-extrabold text-[#312A2C] uppercase tracking-tight truncate leading-tight">{member.full_name}</p>
                                    <p className="text-[12px] text-[#8A8481] font-medium truncate mt-0.5">{member.email}</p>
                                    {member.phone && <p className="text-[11px] text-[#8A8481] font-medium mt-0.5">📞 {member.phone}</p>}
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        <span className={`px-3 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-widest ${member.role === 'tallerista' ? 'bg-[#C17D5C]/10 text-[#C17D5C]' : 'bg-[#312A2C]/10 text-[#312A2C]'}`}>
                                            {roleLabel(member.role)}
                                        </span>
                                        {member.sede_name && (
                                            <span className="px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest bg-white border border-[#F1E9E2] text-[#8A8481]">
                                                {member.sede_name}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <Button variant="dark" size="sm" className="!px-6 !py-3 shrink-0" onClick={() => openEditMember(member)}>
                                    EDITAR
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* ── MODAL: Editar miembro ── */}
            <Modal isOpen={!!editMember} onClose={() => setEditMember(null)}
                title={`Editar ${editMember?.role === 'tallerista' ? 'Tallerista' : 'Staff'}`}
                footer={
                    <>
                        <Button variant="outline" size="sm" onClick={() => setEditMember(null)}>CANCELAR</Button>
                        <Button variant="dark" size="sm" onClick={handleSaveMember} disabled={editSaving}>
                            {editSaving ? 'GUARDANDO...' : 'GUARDAR'}
                        </Button>
                    </>
                }>
                <div className="space-y-6">
                    <div className="flex items-center gap-4 p-5 bg-[#F7F1EB] rounded-[24px] border border-[#F1E9E2]">
                        <div className="w-12 h-12 rounded-full border-2 border-white overflow-hidden shadow-sm bg-white shrink-0">
                            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${editMember?.email}`} alt="" className="w-full h-full" />
                        </div>
                        <div>
                            <p className="text-[14px] font-extrabold text-[#312A2C] uppercase tracking-tight">{editMember?.full_name}</p>
                            <p className="text-[12px] text-[#8A8481]">{editMember?.email} <span className="text-[10px] uppercase">(no editable)</span></p>
                        </div>
                    </div>
                    <Input label="Nombre completo" value={editForm.nombre}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm({ ...editForm, nombre: e.target.value })} />
                    <Input label="Teléfono" value={editForm.telefono}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm({ ...editForm, telefono: e.target.value })} />
                    <div className="border-t border-[#F1E9E2] pt-6">
                        <p className="text-[10px] font-extrabold text-[#C17D5C] uppercase tracking-widest mb-4">RESTABLECER CONTRASEÑA</p>
                        <Input label="Nueva contraseña (dejar vacío para no cambiar)" type="password" value={editForm.newPassword}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm({ ...editForm, newPassword: e.target.value })}
                            placeholder="Mínimo 6 caracteres" />
                    </div>
                </div>
            </Modal>
        </div>
    );
};
