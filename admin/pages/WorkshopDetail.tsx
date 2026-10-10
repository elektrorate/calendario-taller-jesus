
import React from 'react';
import { useAppContext } from '../context/AppContext';
import { Card, Badge, Button, EmptyState, Icon } from '../components/UI';
import { useParams, useNavigate } from 'react-router-dom';
import { WorkshopStatus } from '../types';

export const WorkshopDetail: React.FC = () => {
    const { id } = useParams();
    const { workshops, users, updateWorkshop, showToast } = useAppContext();
    const navigate = useNavigate();

    const workshop = workshops.find(w => w.id === id);
    if (!workshop) return <EmptyState title="Taller no encontrado" />;

    const adminGeneral = users.find(u => u.id === workshop.adminGeneralUserId);

    // BUG 6 FIX: Use await and check result before showing success toast
    const toggleStatus = async () => {
        const newStatus = workshop.estado === WorkshopStatus.ACTIVE ? WorkshopStatus.INACTIVE : WorkshopStatus.ACTIVE;
        const success = await updateWorkshop(workshop.id, { estado: newStatus });
        if (!success) {
            showToast('Error al cambiar el estado', 'error');
        }
        // Success toast is already shown by updateWorkshop
    };

    // Build a location query for Google Maps from available data
    const buildLocationQuery = () => {
        const parts: string[] = [];
        if (workshop.direccion) parts.push(workshop.direccion);
        if (workshop.ciudad) parts.push(workshop.ciudad);
        if (workshop.pais) parts.push(workshop.pais);
        return parts.length > 0 ? parts.join(', ') : workshop.nombre;
    };

    const locationQuery = buildLocationQuery();
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationQuery)}`;
    const mapEmbedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(locationQuery)}&t=&z=13&ie=UTF8&iwloc=&output=embed`;

    const openGoogleMaps = () => {
        window.open(googleMapsUrl, '_blank', 'noopener,noreferrer');
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">

            {/* Header Profile */}
            <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8 text-center md:text-left">
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-brand-soft flex items-center justify-center text-brand border border-neutral-border shrink-0">
                    <Icon.IdCard />
                </div>
                <div className="flex-1 space-y-2">
                    <div className="flex flex-col md:flex-row items-center gap-3">
                        <h1 className="ui-page-title text-neutral-textMain">{workshop.nombre}</h1>
                        <Badge variant={workshop.estado === WorkshopStatus.ACTIVE ? 'yellow' : 'outline'}>{workshop.estado}</Badge>
                    </div>
                        <p className="ui-secondary font-medium">
                        {[workshop.ciudad, workshop.pais].filter(Boolean).join(', ') || 'Ubicación no registrada'}
                    </p>
                    <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-3">
                        <Button variant="dark" size="sm" onClick={() => navigate('/admin/talleres')}>&larr; Volver</Button>
                        <Button variant="outline" size="sm" onClick={() => navigate(`/admin/talleres/editar/${workshop.id}`)}>Editar Taller</Button>
                        <Button variant="outline" size="sm" onClick={toggleStatus}>Cambiar Estado</Button>
                    </div>
                </div>
            </div>

            {/* Grid Modules */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">

                <Card className="space-y-5">
                    <h3 className="eyebrow border-b border-neutral-border pb-3">INFORMACIÓN</h3>
                    <div className="space-y-4">
                        <div>
                            <p className="text-[12px] font-semibold text-neutral-textSec mb-1">Dirección</p>
                            <p className="text-[15px] font-semibold text-neutral-textMain">{workshop.direccion || 'No registrada'}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-[12px] font-semibold text-neutral-textSec mb-1">Email</p>
                                {workshop.emailTaller ? (
                                    <a href={`mailto:${workshop.emailTaller}`} className="text-[14px] font-semibold truncate text-brand hover:underline block">{workshop.emailTaller}</a>
                                ) : (
                                    <p className="text-[14px] font-medium truncate text-neutral-textHelper">No registrado</p>
                                )}
                            </div>
                            <div>
                                <p className="text-[12px] font-semibold text-neutral-textSec mb-1">Teléfono</p>
                                {workshop.telefonoTaller ? (
                                    <a href={`tel:${workshop.telefonoTaller}`} className="text-[14px] font-semibold text-brand hover:underline">{workshop.telefonoTaller}</a>
                                ) : (
                                    <p className="text-[14px] font-medium text-neutral-textHelper">No registrado</p>
                                )}
                            </div>
                        </div>
                    </div>
                </Card>

                <Card className="space-y-5">
                    <h3 className="eyebrow border-b border-neutral-border pb-3">ADMIN GENERAL</h3>
                    {adminGeneral ? (
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-full bg-neutral-sec flex items-center justify-center overflow-hidden border border-neutral-border shrink-0">
                                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${adminGeneral.nombre}`} alt={adminGeneral.nombre} className="w-full h-full" />
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-[15px] font-semibold text-neutral-textMain truncate">{adminGeneral.nombre}</p>
                                <p className="text-[13px] text-neutral-textSec truncate">{adminGeneral.email}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="py-4 text-center">
                            <p className="text-sm text-neutral-textHelper font-medium">Sin responsable asignado</p>
                        </div>
                    )}
                </Card>

                {/* Mapa real con Google Maps embed */}
                <Card className="md:col-span-2 !p-0 overflow-hidden h-72 relative group">
                    <iframe
                        title={`Ubicación de ${workshop.nombre}`}
                        src={mapEmbedUrl}
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        allowFullScreen
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                    />
                    <div className="absolute bottom-4 right-4 z-10">
                        <Button variant="dark" size="sm" onClick={openGoogleMaps}>
                            <span className="flex items-center gap-2">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
                                Abrir en Google Maps
                            </span>
                        </Button>
                    </div>
                </Card>

            </div>
        </div>
    );
};
