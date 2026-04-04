import { useState, useEffect } from 'react';
import { Tag, Search, Package, CheckCircle, Calendar, User } from 'lucide-react';
import API_URL from '../../services/config';
import PageHeader from '../../components/common/PageHeader';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import axios from 'axios';

export default function StickersGarantiaPage() {
  const [searchTermDisponibles, setSearchTermDisponibles] = useState('');
  const [searchTermAsignados, setSearchTermAsignados] = useState('');
  const [stickersDisponibles, setStickersDisponibles] = useState<any[]>([]);
  const [stickersAsignados, setStickersAsignados] = useState<any[]>([]);
  const [estadisticas, setEstadisticas] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [vistaActiva, setVistaActiva] = useState<'disponibles' | 'asignados'>('disponibles');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [disponiblesRes, asignadosRes, statsRes] = await Promise.all([
        axios.get(`${API_URL}/stickers/disponibles`, { headers }),
        axios.get(`${API_URL}/stickers/asignados`, { headers }),
        axios.get(`${API_URL}/stickers/estadisticas`, { headers })
      ]);

      if (disponiblesRes.data.success) {
        setStickersDisponibles(disponiblesRes.data.data);
      }
      if (asignadosRes.data.success) {
        setStickersAsignados(asignadosRes.data.data);
      }
      if (statsRes.data.success) {
        setEstadisticas(statsRes.data.data);
      }
    } catch (error) {
      console.error('Error loading stickers:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDisponibles = stickersDisponibles.filter(s =>
    s.numero_sticker.toLowerCase().includes(searchTermDisponibles.toLowerCase())
  );

  const filteredAsignados = stickersAsignados.filter(s =>
    s.numero_sticker.toLowerCase().includes(searchTermAsignados.toLowerCase()) ||
    s.reparacion_id?.toLowerCase().includes(searchTermAsignados.toLowerCase()) ||
    s.clienteNombre?.toLowerCase().includes(searchTermAsignados.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 ml-64 p-8">
      <div className="mb-8">
        <PageHeader
          title="Stickers de Garantía"
          subtitle="Gestiona el inventario de stickers de garantía (G-436591 a G-437570)"
        />

        {/* Info Card */}
        <Card className="mt-4 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
          <div className="flex items-start gap-4">
            <div className="bg-purple-100 p-3 rounded-lg">
              <Tag size={24} className="text-purple-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-800 mb-1">Inventario de Stickers</h3>
              <p className="text-sm text-slate-600">
                Sistema de control de 980 stickers de garantía pre-numerados. 
                Asigna stickers desde el flujo de reparaciones al completar un equipo.
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Total Stickers</p>
              <p className="text-3xl font-bold mt-1">{estadisticas.total || 0}</p>
            </div>
            <Tag size={40} className="text-blue-200" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Disponibles</p>
              <p className="text-3xl font-bold mt-1">{estadisticas.disponibles || 0}</p>
            </div>
            <Package size={40} className="text-green-200" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Asignados</p>
              <p className="text-3xl font-bold mt-1">{estadisticas.asignados || 0}</p>
            </div>
            <CheckCircle size={40} className="text-purple-200" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-slate-500 to-slate-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-100 text-sm">Usados</p>
              <p className="text-3xl font-bold mt-1">{estadisticas.usados || 0}</p>
            </div>
            <Tag size={40} className="text-slate-200" />
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setVistaActiva('disponibles')}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            vistaActiva === 'disponibles'
              ? 'bg-green-600 text-white'
              : 'bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Package size={18} className="inline mr-2" />
          Disponibles ({filteredDisponibles.length})
        </button>
        <button
          onClick={() => setVistaActiva('asignados')}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            vistaActiva === 'asignados'
              ? 'bg-purple-600 text-white'
              : 'bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          <CheckCircle size={18} className="inline mr-2" />
          Asignados ({filteredAsignados.length})
        </button>
      </div>

      {/* Contenido según vista activa */}
      {vistaActiva === 'disponibles' ? (
        <>
          <div className="mb-4">
            <Input
              placeholder="Buscar sticker disponible..."
              value={searchTermDisponibles}
              onChange={(e: any) => setSearchTermDisponibles(e.target.value)}
              icon={<Search size={18} />}
              className="w-96"
            />
          </div>

          {loading ? (
            <Card className="py-16">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
                <p className="text-slate-600">Cargando stickers...</p>
              </div>
            </Card>
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                        Número de Sticker
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                        Estado
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                        Fecha Creación
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredDisponibles.map((sticker) => (
                      <tr key={sticker.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm font-mono font-semibold text-slate-800">
                          {sticker.numero_sticker}
                        </td>
                        <td className="px-4 py-3">
                          <Badge color="green">Disponible</Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {new Date(sticker.created_at).toLocaleDateString('es-GT')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredDisponibles.length === 0 && (
                  <div className="text-center py-12">
                    <Package size={48} className="text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-500">No hay stickers disponibles</p>
                  </div>
                )}
              </div>
            </Card>
          )}
        </>
      ) : (
        <>
          <div className="mb-4">
            <Input
              placeholder="Buscar por sticker, reparación o cliente..."
              value={searchTermAsignados}
              onChange={(e: any) => setSearchTermAsignados(e.target.value)}
              icon={<Search size={18} />}
              className="w-96"
            />
          </div>

          {loading ? (
            <Card className="py-16">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
                <p className="text-slate-600">Cargando stickers...</p>
              </div>
            </Card>
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                        Sticker
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                        Reparación
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                        Cliente
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                        Ubicación
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                        Fecha Asignación
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                        Estado
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredAsignados.map((sticker) => (
                      <tr key={sticker.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm font-mono font-semibold text-slate-800">
                          {sticker.numero_sticker}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {sticker.reparacion_id || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {sticker.clienteNombre || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {sticker.ubicacion_sticker || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600 flex items-center gap-1">
                          <Calendar size={14} />
                          {sticker.fecha_asignacion 
                            ? new Date(sticker.fecha_asignacion).toLocaleDateString('es-GT')
                            : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <Badge color={sticker.estado === 'ASIGNADO' ? 'purple' : 'gray'}>
                            {sticker.estado}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredAsignados.length === 0 && (
                  <div className="text-center py-12">
                    <CheckCircle size={48} className="text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-500">No hay stickers asignados</p>
                  </div>
                )}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
