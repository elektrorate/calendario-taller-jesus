
import React from 'react';
import { useAppContext } from '../context/AppContext';
import { Card, Button } from '../components/UI';

export const Reports: React.FC = () => {
    const { workshops, users, showToast } = useAppContext();

    const handleExport = (type: string) => {
        showToast(`Generando reporte CSV de ${type}...`, 'info');

        try {
            const headers = ['Nombre Taller', 'Admin General', 'Email', 'Teléfono', 'País', 'Ciudad', 'Dirección', 'Estado'];
            const rows = workshops.map(w => {
                const admin = users.find(u => u.id === w.adminGeneralUserId);
                return [
                    w.nombre || '',
                    admin?.nombre || 'Sin asignar',
                    w.emailTaller || '',
                    w.telefonoTaller || '',
                    w.pais || '',
                    w.ciudad || '',
                    w.direccion || '',
                    w.estado || 'Desconocido'
                ];
            });

            const csvContent = [
                headers.join(','),
                ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
            ].join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', `reporte_talleres_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            showToast('Reporte descargado correctamente', 'success');
        } catch (err) {
            console.error('Error exporting CSV:', err);
            showToast('Error al generar el CSV', 'error');
        }
    };

    const countriesCount = workshops.reduce((acc, curr) => {
        acc[curr.pais] = (acc[curr.pais] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
                    <p className="text-gray-500">Analiza y descarga los datos del sistema</p>
                </div>
                <div className="flex gap-3">
                    {/* Se elimina el botón de exportación de Admins según solicitud visual */}
                    <Button variant="primary" onClick={() => handleExport('Talleres')}>Exportar CSV Talleres</Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="p-6">
                    <h3 className="font-bold text-lg mb-6">Talleres por País</h3>
                    <div className="space-y-4">
                        {Object.entries(countriesCount).map(([pais, count]) => (
                            <div key={pais} className="flex items-center gap-4">
                                <span className="w-24 text-sm font-semibold">{pais}</span>
                                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-600 rounded-full" style={{ width: `${((count as number) / (workshops.length || 1)) * 100}%` }}></div>
                                </div>
                                <span className="text-sm font-bold">{count}</span>
                            </div>
                        ))}
                    </div>
                </Card>

                <Card className="p-6">
                    <h3 className="font-bold text-lg mb-6">Alertas de Datos</h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-orange-50 border border-orange-100 rounded-xl">
                            <div>
                                <p className="font-bold text-orange-800">Talleres sin admin general</p>
                                <p className="text-sm text-orange-600">Requiere atención inmediata</p>
                            </div>
                            <span className="text-2xl font-bold text-orange-800">{workshops.filter(w => !w.adminGeneralUserId).length}</span>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-100 rounded-xl">
                            <div>
                                <p className="font-bold text-blue-800">Datos incompletos</p>
                                <p className="text-sm text-blue-600">Falta email o teléfono de contacto</p>
                            </div>
                            <span className="text-2xl font-bold text-blue-800">{workshops.filter(w => !w.emailTaller || !w.telefonoTaller).length}</span>
                        </div>
                    </div>
                </Card>
            </div>

            <Card className="p-6">
                <h3 className="font-bold text-lg mb-6">Resumen de Localidades</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="border-b">
                            <tr>
                                <th className="pb-4 text-xs font-bold text-gray-400 uppercase">País</th>
                                <th className="pb-4 text-xs font-bold text-gray-400 uppercase">Ciudad</th>
                                <th className="pb-4 text-xs font-bold text-gray-400 uppercase text-right">Nº Talleres</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {workshops.reduce((acc, w) => {
                                const key = `${w.pais}-${w.ciudad}`;
                                const found = acc.find(item => item.pais === w.pais && item.ciudad === w.ciudad);
                                if (found) found.count++;
                                else acc.push({ pais: w.pais, ciudad: w.ciudad, count: 1 });
                                return acc;
                            }, [] as { pais: string, ciudad: string, count: number }[]).map((item, idx) => (
                                <tr key={idx}>
                                    <td className="py-4 text-sm font-semibold">{item.pais}</td>
                                    <td className="py-4 text-sm text-gray-600">{item.ciudad}</td>
                                    <td className="py-4 text-sm font-bold text-right">{item.count}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};
