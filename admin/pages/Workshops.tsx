
import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { ListCard, SearchPill, EmptyState, Select, Card, Button, Icon, Modal } from '../components/UI';
import { WorkshopStatus } from '../types';
import { useNavigate } from 'react-router-dom';
import { countryList, countriesData } from '../data/locations';

export const Workshops: React.FC = () => {
  const { workshops, users, deleteWorkshop } = useAppContext();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [filterPais, setFilterPais] = useState('Todos');
  const [filterCiudad, setFilterCiudad] = useState('Todas');
  const [filterEstado, setFilterEstado] = useState('TODOS');

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; nombre: string; adminName: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Reiniciar ciudad si cambia el país
  useEffect(() => {
    setFilterCiudad('Todas');
  }, [filterPais]);

  const availableCities = useMemo(() => {
    if (filterPais === 'Todos') return ['Todas'];
    return ['Todas', ...(countriesData[filterPais] || [])];
  }, [filterPais]);

  const filteredWorkshops = useMemo(() => {
    return workshops.filter(w => {
      const searchLower = search.toLowerCase();
      const matchesSearch = !search ||
        w.nombre.toLowerCase().includes(searchLower) ||
        w.direccion.toLowerCase().includes(searchLower);

      const matchesPais = filterPais === 'Todos' || w.pais === filterPais;
      const matchesCiudad = filterCiudad === 'Todas' || w.ciudad === filterCiudad;
      const matchesEstado = filterEstado === 'TODOS' ||
        (filterEstado === 'ACTIVOS' && w.estado === WorkshopStatus.ACTIVE) ||
        (filterEstado === 'INACTIVOS' && w.estado === WorkshopStatus.INACTIVE);

      return matchesSearch && matchesPais && matchesCiudad && matchesEstado;
    });
  }, [workshops, search, filterPais, filterCiudad, filterEstado]);

  const handleDeleteClick = (workshopId: string) => {
    const w = workshops.find(ws => ws.id === workshopId);
    if (!w) return;
    const admin = users.find(u => u.id === w.adminGeneralUserId);
    setDeleteTarget({
      id: w.id,
      nombre: w.nombre,
      adminName: admin?.nombre || 'Sin administrador'
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    await deleteWorkshop(deleteTarget.id);
    setIsDeleting(false);
    setDeleteTarget(null);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-12 animate-fade-in">

      {/* Encabezado con Botón de Creación */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
        <div className="space-y-2">
          <p className="eyebrow">Red de Producción</p>
          <h1 className="title-huge text-[#312A2C]">Talleres</h1>
          <div className="accent-line"></div>
        </div>
        <Button
          variant="primary"
          className="shadow-2xl !py-6 gap-4"
          onClick={() => navigate('/admin/talleres/nuevo')}
        >
          NUEVA SEDE
          <Icon.ArrowUpRight />
        </Button>
      </div>

      {/* Controles de Búsqueda y Filtros */}
      <div className="space-y-6">
        <div className="flex justify-center">
          <SearchPill
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            placeholder="Busca por nombre de taller o dirección..."
          />
        </div>

        <Card className="!p-8 bg-white/50 backdrop-blur-sm border-[#F1E9E2]">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Select
              label="Filtrar por País"
              value={filterPais}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterPais(e.target.value)}
              options={[
                { label: 'Todos los Países', value: 'Todos' },
                ...countryList.map(c => ({ label: c, value: c }))
              ]}
            />

            <Select
              label="Filtrar por Ciudad"
              value={filterCiudad}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterCiudad(e.target.value)}
              disabled={filterPais === 'Todos'}
              options={availableCities.map(c => ({ label: c, value: c }))}
            />

            <Select
              label="Estado de Red"
              value={filterEstado}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterEstado(e.target.value)}
              options={[
                { label: 'Todos los Estados', value: 'TODOS' },
                { label: 'Solo Activos', value: 'ACTIVOS' },
                { label: 'Solo Inactivos', value: 'INACTIVOS' }
              ]}
            />
          </div>
        </Card>
      </div>

      {/* Listado de Talleres */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-[11px] font-extrabold tracking-[0.4em] text-gray-400 uppercase">
            RESULTADOS LOCALIZADOS ({filteredWorkshops.length})
          </h2>
          {(filterPais !== 'Todos' || filterCiudad !== 'Todas' || filterEstado !== 'TODOS' || search) && (
            <button
              onClick={() => {
                setFilterPais('Todos');
                setFilterCiudad('Todas');
                setFilterEstado('TODOS');
                setSearch('');
              }}
              className="text-[10px] font-bold text-[#C17D5C] uppercase tracking-widest hover:underline"
            >
              Limpiar Filtros
            </button>
          )}
        </div>

        {filteredWorkshops.length === 0 ? (
          <EmptyState
            title="Sin coincidencias"
            subtitle="No hemos encontrado talleres que coincidan con la selección de país o ciudad actual."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredWorkshops.map(w => {
              const admin = users.find(u => u.id === w.adminGeneralUserId);
              return (
                <ListCard
                  key={w.id}
                  title={w.nombre}
                  subtitle={`${w.ciudad}, ${w.pais}`}
                  info={admin ? `Responsable: ${admin.nombre}` : 'Sin administrador asignado'}
                  badge={w.estado === WorkshopStatus.ACTIVE ? undefined : 'INACTIVO'}
                  onView={() => navigate(`/admin/talleres/${w.id}`)}
                  onEdit={() => navigate(`/admin/talleres/editar/${w.id}`)}
                  onDelete={() => handleDeleteClick(w.id)}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Confirmación de Eliminación */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => !isDeleting && setDeleteTarget(null)}
        title="Eliminar Taller"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
              CANCELAR
            </Button>
            <Button variant="danger" size="sm" onClick={handleConfirmDelete} disabled={isDeleting}>
              {isDeleting ? 'ELIMINANDO...' : 'SÍ, ELIMINAR'}
            </Button>
          </>
        }
      >
        <div className="space-y-6 text-center">
          <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#e11d48" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div>
            <p className="text-lg font-bold text-[#312A2C] mb-2">
              ¿Estás seguro de eliminar <span className="text-rose-600">{deleteTarget?.nombre}</span>?
            </p>
            <p className="text-sm text-[#8A8481]">
              Responsable: <strong>{deleteTarget?.adminName}</strong>
            </p>
          </div>
          <div className="bg-rose-50 rounded-2xl p-4">
            <p className="text-xs text-rose-700 font-medium leading-relaxed">
              ⚠️ Esta acción eliminará permanentemente la sede y todos sus datos asociados
              (profesores, alumnos, clases, piezas). Esta acción no se puede deshacer.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
};
