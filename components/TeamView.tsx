import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

interface StaffMember {
    id: string;
    memberId: string;
    email: string;
    name: string;
    role: string;
    joinedAt: string;
    createdAt: string;
}

const TeamView: React.FC = () => {
    const { session } = useAuth();
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const [createForm, setCreateForm] = useState({ nombre: '', email: '', password: '' });

    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_PROJECT_URL || '';

    const callManageStaff = useCallback(async (body: Record<string, any>) => {
        const token = session?.access_token;
        if (!token) throw new Error('No hay sesión activa.');

        const res = await fetch(`${SUPABASE_URL}/functions/v1/manage-staff`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(body)
        });
        return res.json();
    }, [session, SUPABASE_URL]);

    const loadStaff = useCallback(async () => {
        try {
            setLoading(true);
            const data = await callManageStaff({ action: 'list' });
            if (data.success) {
                setStaff(data.staff || []);
            } else {
                console.error('List error:', data.error);
            }
        } catch (err) {
            console.error('Failed to load staff:', err);
        } finally {
            setLoading(false);
        }
    }, [callManageStaff]);

    useEffect(() => { loadStaff(); }, [loadStaff]);

    const showFeedback = (type: 'success' | 'error', message: string) => {
        setFeedback({ type, message });
        setTimeout(() => setFeedback(null), 4000);
    };

    const handleCreateStaff = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!createForm.nombre.trim() || !createForm.email.trim() || !createForm.password.trim()) {
            showFeedback('error', 'Todos los campos son obligatorios.');
            return;
        }
        if (createForm.password.length < 6) {
            showFeedback('error', 'La contraseña debe tener al menos 6 caracteres.');
            return;
        }
        try {
            setActionLoading(true);
            const data = await callManageStaff({ action: 'create', ...createForm });
            if (data.success) {
                showFeedback('success', data.message || 'Colaborador creado exitosamente.');
                setShowCreateModal(false);
                setCreateForm({ nombre: '', email: '', password: '' });
                await loadStaff();
            } else {
                showFeedback('error', data.error || 'Error al crear colaborador.');
            }
        } catch (err: any) {
            showFeedback('error', err.message || 'Error de conexión.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteStaff = async (staffUserId: string, staffName: string) => {
        if (!confirm(`¿Estás seguro de que deseas eliminar a "${staffName}" del equipo? Esta acción no se puede deshacer.`)) return;
        try {
            setActionLoading(true);
            const data = await callManageStaff({ action: 'delete', staffUserId });
            if (data.success) {
                showFeedback('success', data.message || 'Colaborador eliminado.');
                await loadStaff();
            } else {
                showFeedback('error', data.error || 'Error al eliminar.');
            }
        } catch (err: any) {
            showFeedback('error', err.message || 'Error de conexión.');
        } finally {
            setActionLoading(false);
        }
    };



    const formatDate = (dateStr: string) => {
        if (!dateStr) return '—';
        try {
            return new Date(dateStr).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
        } catch { return dateStr; }
    };

    const currentUserEmail = session?.user?.email || '';

    return (
        <div className="h-full flex flex-col overflow-hidden bg-neutral-base">
            <div className="flex-1 overflow-y-auto custom-scrollbar px-6 md:px-12 pt-8 pb-32">

                {/* Feedback toast */}
                {feedback && (
                    <div className={`fixed top-6 right-6 z-[200] px-6 py-4 rounded-2xl shadow-xl text-[13px] font-extrabold uppercase tracking-widest animate-fade-in ${feedback.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                        {feedback.message}
                    </div>
                )}

                {/* Header */}
                <header className="mb-12 animate-fade-in text-center md:text-left">
                    <p className="text-[11px] font-extrabold text-neutral-textHelper uppercase tracking-[0.2em] mb-4">GESTIÓN DE EQUIPO</p>
                    <h1 className="text-[36px] md:text-[52px] font-black text-neutral-textMain leading-none uppercase tracking-tighter">
                        Equipo de <span className="text-brand">Trabajo</span>
                    </h1>
                    <p className="text-[14px] md:text-[16px] font-light text-neutral-textSec mt-5 max-w-xl mx-auto md:mx-0">
                        Gestiona los colaboradores de tu taller. Ellos tendrán acceso similar al tuyo, pero no podrán crear otros colaboradores.
                    </p>
                </header>

                {/* Actions bar */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-10">
                    <div className="flex gap-3 w-full md:w-auto">
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="flex-1 md:flex-none px-8 py-4 bg-neutral-textMain text-white rounded-full text-[12px] font-extrabold shadow-lg uppercase tracking-widest hover:bg-black active:scale-95 transition-all"
                        >
                            + NUEVO COLABORADOR
                        </button>

                    </div>
                    <div className="text-[11px] font-extrabold text-neutral-textHelper uppercase tracking-widest">
                        {staff.length} COLABORADOR{staff.length !== 1 ? 'ES' : ''} REGISTRADO{staff.length !== 1 ? 'S' : ''}
                    </div>
                </div>

                {/* Staff list */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-8 h-8 border-3 border-brand border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : staff.length === 0 ? (
                    <div className="bg-white/40 border-2 border-dashed border-neutral-border p-16 rounded-[2.5rem] text-center">
                        <svg className="w-16 h-16 mx-auto text-neutral-border mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                        <p className="text-neutral-textHelper font-light uppercase text-[12px] tracking-widest mb-2">Aún no tienes colaboradores</p>
                        <p className="text-neutral-textSec text-[11px] font-light">Agrega miembros a tu equipo para que te ayuden a gestionar el taller.</p>
                    </div>
                ) : (
                    <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                        {staff.map((member) => {
                            const isMe = member.email === currentUserEmail;
                            return (
                                <div
                                    key={member.id}
                                    className="p-8 bg-white rounded-[2.5rem] border border-neutral-border soft-shadow hover:border-brand-light transition-all flex flex-col h-full animate-fade-in"
                                >
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-14 h-14 rounded-2xl bg-brand flex items-center justify-center text-white font-extrabold text-[22px] shadow-inner shrink-0">
                                            {member.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="overflow-hidden">
                                            <h4 className="font-extrabold text-neutral-textMain text-[18px] leading-tight uppercase tracking-tight truncate">
                                                {member.name}
                                                {isMe && <span className="text-[10px] ml-2 text-brand font-bold">( TÚ )</span>}
                                            </h4>
                                            <p className="text-[12px] font-light text-neutral-textSec truncate mt-0.5">{member.email}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-3 flex-1">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-extrabold text-neutral-textHelper uppercase tracking-widest">ROL</span>
                                            <span className={`px-3 py-1 rounded-lg text-[9px] font-extrabold uppercase tracking-widest border ${member.role === 'tallerista' ? 'bg-brand/10 text-brand border-brand/20' : 'bg-purple-50 text-purple-600 border-purple-100'}`}>
                                                {member.role === 'tallerista' ? 'TALLERISTA' : 'STAFF'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-extrabold text-neutral-textHelper uppercase tracking-widest">INGRESO</span>
                                            <span className="text-[12px] font-bold text-neutral-textMain">{formatDate(member.joinedAt)}</span>
                                        </div>
                                    </div>

                                    {!isMe && (
                                        <div className="pt-6 mt-6 border-t border-neutral-border">
                                            <button
                                                onClick={() => handleDeleteStaff(member.id, member.name)}
                                                disabled={actionLoading}
                                                className="w-full text-red-400 hover:text-red-600 font-extrabold uppercase text-[10px] tracking-[0.2em] transition-colors py-2 disabled:opacity-50"
                                            >
                                                ELIMINAR DEL EQUIPO
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ─── CREATE STAFF MODAL ─── */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-neutral-textMain/40 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-lg rounded-[3rem] soft-shadow relative animate-fade-in border border-neutral-border overflow-hidden">
                        <button onClick={() => setShowCreateModal(false)} className="absolute top-8 right-8 text-neutral-textHelper hover:text-brand transition-colors z-20">
                            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        <div className="p-10 md:p-12">
                            <h3 className="text-[28px] font-black text-neutral-textMain uppercase tracking-tight leading-none mb-2">Nuevo Colaborador</h3>
                            <p className="text-neutral-textSec text-[14px] mb-8 font-light">Agrega un miembro a tu equipo de trabajo.</p>

                            <form onSubmit={handleCreateStaff} className="space-y-5">
                                <div>
                                    <label className="block text-[10px] font-extrabold text-neutral-textHelper uppercase tracking-widest mb-2">NOMBRE COMPLETO</label>
                                    <input
                                        required
                                        value={createForm.nombre}
                                        onChange={(e) => setCreateForm({ ...createForm, nombre: e.target.value })}
                                        placeholder="Ej: María García"
                                        className="w-full px-5 py-4 bg-neutral-sec border border-neutral-border rounded-2xl text-[15px] font-light focus:border-brand outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-extrabold text-neutral-textHelper uppercase tracking-widest mb-2">EMAIL</label>
                                    <input
                                        required
                                        type="email"
                                        value={createForm.email}
                                        onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                                        placeholder="colaborador@email.com"
                                        className="w-full px-5 py-4 bg-neutral-sec border border-neutral-border rounded-2xl text-[15px] font-light focus:border-brand outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-extrabold text-neutral-textHelper uppercase tracking-widest mb-2">CONTRASEÑA</label>
                                    <input
                                        required
                                        type="password"
                                        value={createForm.password}
                                        onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                                        placeholder="Mínimo 6 caracteres"
                                        className="w-full px-5 py-4 bg-neutral-sec border border-neutral-border rounded-2xl text-[15px] font-light focus:border-brand outline-none transition-all"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={actionLoading}
                                    className="w-full py-5 bg-brand text-white rounded-full font-black uppercase tracking-[0.2em] text-[15px] hover:bg-brand-hover active:scale-[0.98] transition-all soft-shadow mt-4 disabled:opacity-50"
                                >
                                    {actionLoading ? 'CREANDO...' : 'CREAR COLABORADOR'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}


        </div>
    );
};

export default TeamView;
