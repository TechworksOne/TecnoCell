import { GitBranch, Search, User, AlertCircle, CheckCircle, ClipboardList, Edit, History, AlertTriangle, Smartphone, Wrench, Clock, Calendar } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Badge from "../../components/ui/Badge";
import { getAllReparaciones } from "../../services/repairService";
import { formatMoney } from "../../lib/format";
import API_URL from "../../services/config";
import axios from "axios";
import ModalActualizarEstado from "../../components/repairs/ModalActualizarEstado";
import ModalHistorialReparacion from "../../components/repairs/ModalHistorialReparacion";

interface CheckEquipo {
  id: number;
  reparacion_id: string;
  fecha_checklist: string;
}

export default function FlujoReparacionesPage() {
  const navigate = useNavigate();
  const [reparaciones, setReparaciones] = useState<any[]>([]);
  const [checksEquipo, setChecksEquipo] = useState<CheckEquipo[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchTermFlujos, setSearchTermFlujos] = useState("");
  const [modalEstadoOpen, setModalEstadoOpen] = useState(false);
  const [modalHistorialOpen, setModalHistorialOpen] = useState(false);
  const [reparacionSeleccionada, setReparacionSeleccionada] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await getAllReparaciones();
      const data = Array.isArray(response) ? response : (response as any).data || [];
      setReparaciones(data);
      
      // Cargar todos los checklists existentes
      await loadAllChecks();
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAllChecks = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/check-equipo`,
        { 
          headers: { Authorization: `Bearer ${token}` },
          validateStatus: (status) => status < 500
        }
      );
      
      if (response.data.success && Array.isArray(response.data.data)) {
        setChecksEquipo(response.data.data);
      } else {
        setChecksEquipo([]);
      }
    } catch (error) {
      console.error('Error loading checks:', error);
      setChecksEquipo([]);
    }
  };

  const getEstadoBadge = (estado: string) => {
    const estados: { [key: string]: { color: string, label: string } } = {
      'RECIBIDA': { color: 'blue', label: 'Recibida' },
      'EN_DIAGNOSTICO': { color: 'yellow', label: 'En Diagnóstico' },
      'ESPERANDO_AUTORIZACION': { color: 'yellow', label: 'Esperando Autorización' },
      'AUTORIZADA': { color: 'blue', label: 'Autorizada' },
      'EN_REPARACION': { color: 'yellow', label: 'En Reparación' },
      'ESPERANDO_PIEZA': { color: 'yellow', label: 'Esperando Pieza' },
      'COMPLETADA': { color: 'green', label: 'Completada' },
      'ENTREGADA': { color: 'green', label: 'Entregada' },
      'CANCELADA': { color: 'red', label: 'Cancelada' },
      'STAND_BY': { color: 'yellow', label: 'Stand By' },
    };
    return estados[estado] || { color: 'gray', label: estado };
  };

  const getPrioridadBadge = (prioridad: string) => {
    const prioridades: { [key: string]: { color: string, label: string } } = {
      'BAJA': { color: 'green', label: 'Baja' },
      'MEDIA': { color: 'yellow', label: 'Media' },
      'ALTA': { color: 'red', label: 'Alta' },
    };
    return prioridades[prioridad] || { color: 'gray', label: prioridad };
  };

  const handleOpenModalEstado = (reparacion: any) => {
    setReparacionSeleccionada(reparacion);
    setModalEstadoOpen(true);
  };

  const handleCloseModalEstado = () => {
    setModalEstadoOpen(false);
    setReparacionSeleccionada(null);
  };

  const handleOpenModalHistorial = (reparacion: any) => {
    setReparacionSeleccionada(reparacion);
    setModalHistorialOpen(true);
  };

  const handleCloseModalHistorial = () => {
    setModalHistorialOpen(false);
    setReparacionSeleccionada(null);
  };

  const handleEstadoActualizado = async () => {
    await loadData();
  };

  const filteredReparaciones = reparaciones.filter(r =>
    r.clienteNombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.recepcion?.marca?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.recepcion?.modelo?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredFlujos = reparaciones.filter(r =>
    r.clienteNombre?.toLowerCase().includes(searchTermFlujos.toLowerCase()) ||
    r.id?.toLowerCase().includes(searchTermFlujos.toLowerCase()) ||
    r.recepcion?.marca?.toLowerCase().includes(searchTermFlujos.toLowerCase()) ||
    r.recepcion?.modelo?.toLowerCase().includes(searchTermFlujos.toLowerCase())
  );

  // Separar reparaciones con y sin checklist
  const reparacionesSinCheck = filteredReparaciones.filter(r => 
    !checksEquipo.some(c => c.reparacion_id === r.id)
  );

  const reparacionesConCheck = filteredFlujos.filter(r => 
    checksEquipo.some(c => c.reparacion_id === r.id)
  );

  const estadisticas = {
    total: reparaciones.length,
    sinCheck: reparacionesSinCheck.length,
    conCheck: reparacionesConCheck.length,
    enProceso: reparaciones.filter(r => ['EN_DIAGNOSTICO', 'EN_REPARACION', 'ESPERANDO_PIEZA'].includes(r.estado)).length,
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div>
        <PageHeader
          title="Flujo de Equipos"
          subtitle="Gestiona el estado y progreso de cada reparación"
        />
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Total Reparaciones</p>
              <p className="text-3xl font-bold mt-1">{estadisticas.total}</p>
            </div>
            <GitBranch size={40} className="text-blue-200" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm">Sin Checklist</p>
              <p className="text-3xl font-bold mt-1">{estadisticas.sinCheck}</p>
            </div>
            <ClipboardList size={40} className="text-orange-200" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Con Checklist</p>
              <p className="text-3xl font-bold mt-1">{estadisticas.conCheck}</p>
            </div>
            <CheckCircle size={40} className="text-green-200" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">En Proceso</p>
              <p className="text-3xl font-bold mt-1">{estadisticas.enProceso}</p>
            </div>
            <User size={40} className="text-purple-200" />
          </div>
        </Card>
      </div>

      {/* TABLA 1: REPARACIONES SIN CHECKLIST */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-slate-800">Reparaciones Sin Checklist</h2>
          <Input
            placeholder="Buscar reparación..."
            value={searchTerm}
            onChange={(e: any) => setSearchTerm(e.target.value)}
            icon={<Search size={18} />}
            className="w-80"
          />
        </div>

        {loading ? (
          <Card className="py-16">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
              <p className="text-slate-600">Cargando...</p>
            </div>
          </Card>
        ) : reparacionesSinCheck.length === 0 ? (
          <Card className="py-12 bg-orange-50 border-orange-200">
            <div className="text-center">
              <ClipboardList size={48} className="text-orange-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-800 mb-2">
                {searchTerm ? 'No se encontraron reparaciones' : 'Todas las reparaciones tienen checklist'}
              </h3>
              <p className="text-slate-600">
                {searchTerm ? 'Intenta con otro término' : 'Crea una nueva reparación desde el módulo de Reparaciones'}
              </p>
              {!searchTerm && (
                <Button onClick={() => navigate('/reparaciones')} className="mt-4 bg-orange-600 hover:bg-orange-700">
                  Ir a Reparaciones
                </Button>
              )}
            </div>
          </Card>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200">
                  <th className="text-left p-4 font-semibold text-slate-700">ID</th>
                  <th className="text-left p-4 font-semibold text-slate-700">Cliente</th>
                  <th className="text-left p-4 font-semibold text-slate-700">Equipo</th>
                  <th className="text-left p-4 font-semibold text-slate-700">Estado</th>
                  <th className="text-left p-4 font-semibold text-slate-700">Fecha Ingreso</th>
                  <th className="text-center p-4 font-semibold text-slate-700">Acción</th>
                </tr>
              </thead>
              <tbody>
                {reparacionesSinCheck.map((rep) => {
                  const estado = getEstadoBadge(rep.estado);
                  return (
                    <tr key={rep.id} className="border-b border-slate-200 hover:bg-slate-50">
                      <td className="p-4 font-mono text-sm font-semibold">{rep.id}</td>
                      <td className="p-4">{rep.clienteNombre}</td>
                      <td className="p-4">{rep.recepcion?.marca} {rep.recepcion?.modelo}</td>
                      <td className="p-4">
                        <Badge color={estado.color}>{estado.label}</Badge>
                      </td>
                      <td className="p-4">
                        {new Date(rep.fechaIngreso).toLocaleDateString('es-GT')}
                      </td>
                      <td className="p-4 text-center">
                        <Button
                          size="sm"
                          onClick={() => navigate(`/flujo-reparaciones/${rep.id}`)}
                          className="bg-orange-600 hover:bg-orange-700"
                        >
                          <ClipboardList size={16} className="mr-2" />
                          Iniciar Checklist
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* TABLA 2: FLUJOS ACTIVOS (CON CHECKLIST) */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-slate-800">Flujo de Equipos</h2>
          <Input
            placeholder="Buscar flujo..."
            value={searchTermFlujos}
            onChange={(e: any) => setSearchTermFlujos(e.target.value)}
            icon={<Search size={18} />}
            className="w-80"
          />
        </div>

        {loading ? (
          <Card className="py-16">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
              <p className="text-slate-600">Cargando flujos...</p>
            </div>
          </Card>
        ) : reparacionesConCheck.length === 0 ? (
          <Card className="py-12 bg-green-50 border-green-200">
            <div className="text-center">
              <CheckCircle size={48} className="text-green-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-800 mb-2">
                {searchTermFlujos ? 'No se encontraron flujos' : 'No hay flujos activos'}
              </h3>
              <p className="text-slate-600">
                {searchTermFlujos ? 'Intenta con otro término' : 'Inicia el checklist de alguna reparación para crear un flujo'}
              </p>
            </div>
          </Card>
        ) : (
          <div className="grid gap-4">
            {reparacionesConCheck.map((rep) => {
              const estado = getEstadoBadge(rep.estado);
              const prioridad = getPrioridadBadge(rep.prioridad);
              const cambios = (rep as any).totalCambiosEstado || 0;

              // Color del borde lateral según estado
              const borderColor =
                ['COMPLETADA', 'ENTREGADA'].includes(rep.estado) ? 'border-l-emerald-500' :
                ['CANCELADA'].includes(rep.estado) ? 'border-l-red-500' :
                'border-l-amber-400';

              // Color del badge de estado
              const estadoBgMap: Record<string, string> = {
                'RECIBIDA': 'bg-blue-100 text-blue-800',
                'EN_DIAGNOSTICO': 'bg-amber-100 text-amber-800',
                'ESPERANDO_AUTORIZACION': 'bg-amber-100 text-amber-800',
                'AUTORIZADA': 'bg-blue-100 text-blue-800',
                'EN_REPARACION': 'bg-violet-100 text-violet-800',
                'ESPERANDO_PIEZA': 'bg-orange-100 text-orange-800',
                'COMPLETADA': 'bg-emerald-100 text-emerald-800',
                'ENTREGADA': 'bg-emerald-100 text-emerald-800',
                'CANCELADA': 'bg-red-100 text-red-800',
                'STAND_BY': 'bg-slate-100 text-slate-700',
              };
              const estadoClasses = estadoBgMap[rep.estado] || 'bg-slate-100 text-slate-700';

              const prioridadClasses: Record<string, string> = {
                'BAJA': 'bg-emerald-100 text-emerald-800',
                'MEDIA': 'bg-amber-100 text-amber-800',
                'ALTA': 'bg-red-100 text-red-800',
              };
              const prioridadClass = prioridadClasses[rep.prioridad] || 'bg-slate-100 text-slate-600';

              return (
                <div
                  key={rep.id}
                  className={`bg-white rounded-2xl shadow-md hover:shadow-lg transition-all duration-200 border-l-4 ${borderColor} overflow-hidden cursor-pointer`}
                  onClick={() => navigate(`/flujo-reparaciones/${rep.id}`)}
                >
                  <div className="p-5">
                    {/* ── HEADER ── */}
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-800 text-base font-mono tracking-tight">{rep.id}</span>
                        {/* Estado */}
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ${estadoClasses}`}>
                          <Clock size={11} />
                          {estado.label}
                        </span>
                        {/* Prioridad */}
                        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${prioridadClass}`}>
                          {prioridad.label}
                        </span>
                        {/* Checklist OK */}
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          <CheckCircle size={11} />
                          Checklist OK
                        </span>
                      </div>

                      {/* Badge de cambios de estado */}
                      {cambios > 0 && (
                        <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${
                          cambios >= 5 ? 'bg-red-100 text-red-700' :
                          cambios >= 3 ? 'bg-amber-100 text-amber-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          <AlertTriangle size={12} />
                          {cambios} {cambios === 1 ? 'cambio' : 'cambios'}
                        </span>
                      )}
                    </div>

                    {/* ── BODY: datos en grid ── */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3 mb-5">
                      <div>
                        <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-0.5">Cliente</p>
                        <div className="flex items-center gap-1.5">
                          <User size={13} className="text-slate-400 shrink-0" />
                          <p className="font-semibold text-slate-700 text-sm truncate">{rep.clienteNombre}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-0.5">Equipo</p>
                        <div className="flex items-center gap-1.5">
                          <Smartphone size={13} className="text-slate-400 shrink-0" />
                          <p className="font-semibold text-slate-700 text-sm truncate">
                            {rep.recepcion?.marca} {rep.recepcion?.modelo}
                          </p>
                        </div>
                      </div>
                      <div>
                        <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-0.5">Técnico</p>
                        <div className="flex items-center gap-1.5">
                          <Wrench size={13} className="text-slate-400 shrink-0" />
                          <p className="font-semibold text-slate-700 text-sm truncate">
                            {rep.tecnicoAsignado || <span className="text-slate-400 font-normal italic">Sin asignar</span>}
                          </p>
                        </div>
                      </div>
                      <div>
                        <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-0.5">Fecha ingreso</p>
                        <div className="flex items-center gap-1.5">
                          <Calendar size={13} className="text-slate-400 shrink-0" />
                          <p className="font-semibold text-slate-700 text-sm">
                            {new Date(rep.fechaIngreso).toLocaleDateString('es-GT')}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* ── FOOTER: acciones ── */}
                    <div
                      className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-4 border-t border-slate-100"
                      onClick={e => e.stopPropagation()}
                    >
                      <button
                        onClick={() => handleOpenModalHistorial(rep)}
                        className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg border border-violet-300 text-violet-700 text-xs font-semibold hover:bg-violet-50 transition-colors"
                      >
                        <History size={14} />
                        Ver historial
                      </button>
                      <button
                        onClick={() => handleOpenModalEstado(rep)}
                        className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
                      >
                        <Edit size={14} />
                        Actualizar estado
                      </button>
                      <button
                        onClick={() => navigate(`/flujo-reparaciones/${rep.id}`)}
                        className="flex items-center justify-center gap-2 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors sm:ml-auto"
                      >
                        Ver detalles
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Actualización de Estado */}
      {modalEstadoOpen && reparacionSeleccionada && (
        <ModalActualizarEstado
          isOpen={modalEstadoOpen}
          onClose={handleCloseModalEstado}
          reparacion={reparacionSeleccionada}
          onSuccess={handleEstadoActualizado}
        />
      )}

      {/* Modal de Historial */}
      {modalHistorialOpen && reparacionSeleccionada && (
        <ModalHistorialReparacion
          isOpen={modalHistorialOpen}
          onClose={handleCloseModalHistorial}
          reparacionId={reparacionSeleccionada.id}
        />
      )}
    </div>
  );
}
