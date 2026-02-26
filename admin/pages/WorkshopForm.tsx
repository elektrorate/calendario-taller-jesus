
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Card, Button, Badge, Icon, Input } from '../components/UI';
import { WorkshopStatus, UserRole } from '../types';
import { useNavigate, useParams } from 'react-router-dom';
import { countryList, countriesData } from '../data/locations';

export const WorkshopForm: React.FC = () => {
  const { id } = useParams();
  const { addWorkshop, updateWorkshop, addUser, users, workshops, showToast } = useAppContext();
  const navigate = useNavigate();

  const isEdit = !!id;
  const existingWorkshop = workshops.find(w => w.id === id);

  // Estados del flujo
  const [currentStep, setCurrentStep] = useState<1 | 2>(isEdit ? 2 : 1);
  const [adminConfirmed, setAdminConfirmed] = useState(isEdit);
  const [autoCreatedSedeId, setAutoCreatedSedeId] = useState<string | null>(null);

  // Datos del administrador (Paso 1)
  const [adminData, setAdminData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    password: '',
    id: ''
  });

  // Datos del taller (Paso 2)
  const [workshopData, setWorkshopData] = useState({
    nombre: '',
    pais: '',
    ciudad: '',
    direccion: '',
    emailTaller: '',
    telefonoTaller: '',
    adminGeneralUserId: '',
    lat: 41.3851,
    lng: 2.1734,
    estado: WorkshopStatus.ACTIVE
  });

  useEffect(() => {
    if (isEdit && existingWorkshop) {
      setWorkshopData({
        nombre: existingWorkshop.nombre,
        pais: existingWorkshop.pais,
        ciudad: existingWorkshop.ciudad,
        direccion: existingWorkshop.direccion,
        emailTaller: existingWorkshop.emailTaller || '',
        telefonoTaller: existingWorkshop.telefonoTaller || '',
        adminGeneralUserId: existingWorkshop.adminGeneralUserId || '',
        lat: existingWorkshop.lat,
        lng: existingWorkshop.lng,
        estado: existingWorkshop.estado
      });
      const admin = users.find(u => u.id === existingWorkshop.adminGeneralUserId);
      if (admin) {
        setAdminData({
          nombre: admin.nombre,
          email: admin.email,
          telefono: admin.telefono,
          password: '••••••••', // Placeholder para edición
          id: admin.id
        });
      }
    }
  }, [isEdit, existingWorkshop, users]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminData.nombre || !adminData.email || (!isEdit && !adminData.password)) {
      showToast('Nombre, Email y Contraseña son obligatorios', 'error');
      return;
    }

    setIsSubmitting(true);
    // Crear el perfil del administrador REALMENTE
    const result = await addUser({
      nombre: adminData.nombre,
      email: adminData.email,
      telefono: adminData.telefono,
      pais: '',
      ciudad: '',
      estado: WorkshopStatus.ACTIVE,
      rolesGlobales: [UserRole.WORKSHOP_ADMIN],
      rolesPorTaller: [],
      password: adminData.password
    });
    setIsSubmitting(false);

    if (!result) return; // Error happened
    const { userId, sedeId } = result;

    if (sedeId) setAutoCreatedSedeId(sedeId);

    setAdminData(prev => ({ ...prev, id: userId }));
    setWorkshopData(prev => ({ ...prev, adminGeneralUserId: userId }));
    setAdminConfirmed(true);
    setCurrentStep(2);
    // showToast handled in addUser
  };

  const handleFinalizeWorkshop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workshopData.nombre || !workshopData.pais || !workshopData.ciudad || !workshopData.direccion) {
      showToast('Por favor, completa los datos de la sede', 'error');
      return;
    }

    if (isEdit && id) {
      // EDIT MODE: Update existing sede by its ID
      await updateWorkshop(id, {
        ...workshopData,
        adminUserIds: [workshopData.adminGeneralUserId]
      });
    } else {
      // NEW MODE: The Edge Function already auto-created a sede for this user.
      // Find the auto-created sede by owner_id and UPDATE it with the real details.
      const autoCreatedSede = workshops.find(w => w.adminGeneralUserId === workshopData.adminGeneralUserId);
      const targetId = autoCreatedSede?.id || autoCreatedSedeId;

      if (targetId) {
        // Update the auto-created sede with the real workshop details
        await updateWorkshop(targetId, {
          ...workshopData,
          adminUserIds: [workshopData.adminGeneralUserId]
        });
      } else {
        // Fallback: if for some reason the auto-created sede is not found, create one
        await addWorkshop({
          ...workshopData,
          adminUserIds: [workshopData.adminGeneralUserId]
        });
      }
    }
    navigate('/admin/talleres');
  };

  const labelClass = "block text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-2 ml-4";
  const selectClass = "w-full h-14 px-6 rounded-[20px] bg-gray-50 border border-[#E6E6E6] focus:bg-white focus:border-[#F4D000] focus:ring-4 focus:ring-[#F4D000]/10 outline-none transition-all font-medium text-sm appearance-none";

  return (
    <div className="max-w-3xl mx-auto space-y-12 animate-fade-in pb-20">

      {/* Header Visual */}
      <div className="text-center space-y-4">
        <Badge variant={adminConfirmed ? 'success' : 'yellow'}>
          {adminConfirmed ? 'PASO 1 COMPLETADO' : 'CONFIGURACIÓN INICIAL'}
        </Badge>
        <h1 className="text-5xl font-extrabold tracking-tighter">
          {isEdit ? 'Actualizar Sede' : 'Nuevo Registro'}
        </h1>
        <div className="flex justify-center items-center gap-4 text-gray-400 font-bold uppercase text-[10px] tracking-[0.2em]">
          <span className={currentStep === 1 ? 'text-[#111111]' : ''}>01 RESPONSABLE</span>
          <div className="w-8 h-px bg-gray-200"></div>
          <span className={currentStep === 2 ? 'text-[#111111]' : ''}>02 TALLER</span>
        </div>
      </div>

      <div className="space-y-8">

        {/* PASO 1: ADMINISTRADOR */}
        <Card className={`relative transition-all duration-500 ${currentStep === 2 && !isEdit ? 'opacity-40 grayscale-[0.5]' : ''}`}>
          <div className="flex items-center gap-4 border-b border-gray-100 pb-6 mb-8">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold transition-colors ${adminConfirmed ? 'bg-green-500 text-white shadow-lg' : 'bg-[#1A1A1A] text-[#F4D000]'}`}>
              {adminConfirmed ? '✓' : '01'}
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-extrabold tracking-[0.2em] uppercase">Registro de Administrador Taller</h3>
                {adminConfirmed && currentStep === 2 && (
                  <button
                    type="button"
                    onClick={() => { setAdminConfirmed(false); setCurrentStep(1); }}
                    className="text-[10px] font-bold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1 uppercase tracking-widest"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    Editar
                  </button>
                )}
              </div>
              <p className="text-[10px] text-gray-400 font-bold">DATOS DEL ADMINISTRADOR DEL CENTRO</p>
            </div>
          </div>

          <form onSubmit={handleCreateAdmin} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Nombre y Apellidos *"
                placeholder="Ej: David Casals"
                value={adminData.nombre}
                onChange={e => setAdminData({ ...adminData, nombre: e.target.value })}
                disabled={adminConfirmed && currentStep === 2}
              />
              <Input
                label="Correo Electrónico *"
                type="email"
                placeholder="d.casals@barro.com"
                value={adminData.email}
                onChange={e => setAdminData({ ...adminData, email: e.target.value })}
                disabled={adminConfirmed && currentStep === 2}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Teléfono Móvil"
                placeholder="+34 600 000 000"
                value={adminData.telefono}
                onChange={e => setAdminData({ ...adminData, telefono: e.target.value })}
                disabled={adminConfirmed && currentStep === 2}
              />
              <Input
                label="Contraseña de Acceso *"
                type="password"
                placeholder="••••••••"
                value={adminData.password}
                onChange={e => setAdminData({ ...adminData, password: e.target.value })}
                disabled={adminConfirmed && currentStep === 2}
              />
            </div>

            {!adminConfirmed && (
              <div className="flex justify-end pt-4">
                <Button type="submit" variant="dark" className="w-full md:w-auto shadow-2xl" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                      <span>CREANDO...</span>
                    </div>
                  ) : 'Crear Perfil Administrador'}
                </Button>
              </div>
            )}

            {adminConfirmed && currentStep === 2 && !isEdit && (
              <div className="flex items-center gap-3 p-4 bg-green-50 rounded-2xl border border-green-100">
                <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-xs">✓</div>
                <p className="text-xs font-bold text-green-700 uppercase tracking-tight truncate flex-1">
                  Responsable confirmado: <span className="underline ml-1">{adminData.nombre}</span>
                </p>
              </div>
            )}
          </form>
        </Card>

        {/* PASO 2: TALLER */}
        {(currentStep === 2 || isEdit) && (
          <Card className="animate-fade-in-up shadow-2xl border-[#F4D000]/20">
            <div className="flex items-center gap-4 border-b border-gray-100 pb-6 mb-8">
              <div className="w-12 h-12 bg-[#F4D000] text-[#111111] rounded-full flex items-center justify-center font-bold shadow-lg">
                02
              </div>
              <div>
                <h3 className="text-sm font-extrabold tracking-[0.2em] uppercase">Configuración de Sede</h3>
                <p className="text-[10px] text-gray-400 font-bold">DATOS FÍSICOS Y CONTACTO DEL TALLER</p>
              </div>
            </div>

            <form onSubmit={handleFinalizeWorkshop} className="space-y-8">
              <div className="space-y-6">
                <Input
                  label="Nombre Comercial del Centro *"
                  placeholder="Ej: Terracotta Studio BCN"
                  value={workshopData.nombre}
                  onChange={e => setWorkshopData({ ...workshopData, nombre: e.target.value })}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={labelClass}>País de Operación *</label>
                    <select
                      className={selectClass}
                      value={workshopData.pais}
                      onChange={e => setWorkshopData({ ...workshopData, pais: e.target.value, ciudad: '' })}
                    >
                      <option value="">Selecciona...</option>
                      {countryList.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Ciudad *</label>
                    <select
                      className={selectClass}
                      value={workshopData.ciudad}
                      onChange={e => setWorkshopData({ ...workshopData, ciudad: e.target.value })}
                      disabled={!workshopData.pais}
                    >
                      <option value="">Selecciona...</option>
                      {(countriesData[workshopData.pais] || []).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <Input
                  label="Dirección Completa *"
                  placeholder="Carrer de Valencia, 123, Local 2"
                  value={workshopData.direccion}
                  onChange={e => setWorkshopData({ ...workshopData, direccion: e.target.value })}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    label="Email Público del Taller"
                    placeholder="info@terracotta.com"
                    value={workshopData.emailTaller}
                    onChange={e => setWorkshopData({ ...workshopData, emailTaller: e.target.value })}
                  />
                  <Input
                    label="Teléfono del Centro"
                    placeholder="932 000 000"
                    value={workshopData.telefonoTaller}
                    onChange={e => setWorkshopData({ ...workshopData, telefonoTaller: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-4 pt-6">
                {!isEdit && (
                  <Button type="button" variant="outline" className="flex-1 !py-6" onClick={() => setCurrentStep(1)}>
                    VOLVER AL PASO 1
                  </Button>
                )}
                <Button type="submit" variant="primary" size="lg" className="flex-[2] shadow-[0_20px_40px_rgba(244,208,0,0.3)] !py-6 text-xs tracking-widest uppercase">
                  {isEdit ? 'GUARDAR CAMBIOS' : 'CONFIRMAR Y CREAR TALLER'}
                </Button>
              </div>
            </form>
          </Card>
        )}
      </div>

      <div className="flex justify-center pt-8">
        <button
          type="button"
          onClick={() => navigate('/admin/talleres')}
          className="text-[10px] font-extrabold text-gray-400 uppercase tracking-[0.2em] hover:text-black transition-colors"
        >
          CANCELAR PROCESO DE REGISTRO
        </button>
      </div>
    </div>
  );
};
