
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

    const toggleStatus = () => {
        updateWorkshop(workshop.id, { estado: workshop.estado === WorkshopStatus.ACTIVE ? WorkshopStatus.INACTIVE : WorkshopStatus.ACTIVE });
        showToast('Estado actualizado', 'success');
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
        <div className="max-w-4xl mx-auto space-y-10 animate-fade-in">

            {/* Header Profile */}
            <div className="flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
                <div className="w-32 h-32 rounded-[40px] bg-[#F4EEE8] flex items-center justify-center text-[#C17D5C] shadow-xl border border-[#F1E9E2]">
                    <Icon.IdCard />
                </div>
                <div className="flex-1 space-y-2">
                    <div className="flex flex-col md:flex-row items-center gap-4">
                        <h1 className="text-4xl font-extrabold tracking-tight">{workshop.nombre}</h1>
                        <Badge variant={workshop.estado === WorkshopStatus.ACTIVE ? 'yellow' : 'outline'}>{workshop.estado}</Badge>
                    </div>
                    <p className="text-xl text-[#6B6B6B] font-medium">
                        {[workshop.ciudad, workshop.pais].filter(Boolean).join(', ') || 'Ubicación no registrada'}
                    </p>
                    <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-4">
                        <Button variant="dark" size="sm" onClick={() => navigate('/admin/talleres')}>&larr; Volver</Button>
                        <Button variant="outline" size="sm" onClick={() => navigate(`/admin/talleres/editar/${workshop.id}`)}>Editar Taller</Button>
                        <Button variant="outline" size="sm" onClick={toggleStatus}>Cambiar Estado</Button>
                    </div>
                </div>
            </div>

            {/* Grid Modules */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                <Card className="space-y-6">
                    <h3 className="text-xs font-extrabold tracking-[0.2em] text-[#111111] border-b border-[#E6E6E6] pb-4">INFORMACIÓN</h3>
                    <div className="space-y-4">
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Dirección</p>
                            <p className="font-bold">{workshop.direccion || 'No registrada'}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Email</p>
                                {workshop.emailTaller ? (
                                    <a href={`mailto:${workshop.emailTaller}`} className="font-bold truncate text-sm text-[#C17D5C] hover:underline block">{workshop.emailTaller}</a>
                                ) : (
                                    <p className="font-bold truncate text-sm text-gray-400">No registrado</p>
                                )}
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Teléfono</p>
                                {workshop.telefonoTaller ? (
                                    <a href={`tel:${workshop.telefonoTaller}`} className="font-bold text-sm text-[#C17D5C] hover:underline">{workshop.telefonoTaller}</a>
                                ) : (
                                    <p className="font-bold text-sm text-gray-400">No registrado</p>
                                )}
                            </div>
                        </div>
                    </div>
                </Card>

                <Card className="space-y-6">
                    <h3 className="text-xs font-extrabold tracking-[0.2em] text-[#111111] border-b border-[#E6E6E6] pb-4">ADMIN GENERAL</h3>
                    {adminGeneral ? (
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden shadow-sm border border-gray-200 shrink-0">
                                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${adminGeneral.nombre}`} alt={adminGeneral.nombre} className="w-full h-full" />
                            </div>
                            <div className="overflow-hidden">
                                <p className="font-bold truncate">{adminGeneral.nombre}</p>
                                <p className="text-xs text-gray-500 font-medium truncate">{adminGeneral.email}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="py-4 text-center">
                            <p className="text-sm text-gray-400 font-medium">Sin responsable asignado</p>
                        </div>
                    )}
                </Card>

                {/* Mapa real con Google Maps embed */}
                <Card className="md:col-span-2 !p-0 overflow-hidden h-72 border-none relative group">
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
