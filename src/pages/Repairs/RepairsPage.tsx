import React, { useState, useEffect } from 'react';
import { Plus, Search, Eye, Clock, AlertCircle, CheckCircle, Package, FileText, History, Printer, FileSearch } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useRepairs } from '../../store/useRepairs';
import { RepairStatus, RepairPriority, StateChangeRequest, Repair } from '../../types/repair';
import PageHeader from '../../components/common/PageHeader';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import Modal from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { StateChangeModal } from '../../components/repairs/StateChangeModal';
import { StateHistory } from '../../components/repairs/StateHistory';
import { EditRepairModal } from '../../components/repairs/EditRepairModal';
import { generarPDFRecepcion } from '../../lib/pdfGenerator';
import { getAllReparaciones } from '../../services/repairService';

const STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'RECIBIDA', label: 'Recibida' },
  { value: 'EN_PROCESO', label: 'En Proceso' },
  { value: 'ESPERANDO_PIEZA', label: 'Esperando Pieza' },
  { value: 'COMPLETADA', label: 'Completada' },
  { value: 'ENTREGADA', label: 'Entregada' },
  { value: 'CANCELADA', label: 'Cancelada' }
];

const PRIORITY_OPTIONS = [
  { value: '', label: 'Todas las prioridades' },
  { value: 'BAJA', label: 'Baja' },
  { value: 'MEDIA', label: 'Media' },
  { value: 'ALTA', label: 'Alta' }
];

export default function RepairsPage() {
  const navigate = useNavigate();
  const { 
    repairs, 
    deleteRepair, 
    changeRepairState, 
    updateRepair,
    searchRepairs, 
    isLoading,
    validateStickerUniqueness
  } = useRepairs();

  // Estados del componente
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [selectedRepair, setSelectedRepair] = useState<Repair | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState<string | null>(null);
  const [loadingRepairs, setLoadingRepairs] = useState(true);
  const [backendRepairs, setBackendRepairs] = useState<Repair[]>([]);

  // Cargar reparaciones del backend
  useEffect(() => {
    loadRepairs();
  }, []);

  const loadRepairs = async () => {
    try {
      setLoadingRepairs(true);
      const data = await getAllReparaciones();
      setBackendRepairs(data);
    } catch (error) {
      console.error('Error cargando reparaciones:', error);
    } finally {
      setLoadingRepairs(false);
    }
  };

  // Filtros aplicados
  const filteredRepairs = backendRepairs.filter(repair => {
    const matchesSearch = searchQuery === '' || 
      repair.clienteNombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      repair.recepcion.marca.toLowerCase().includes(searchQuery.toLowerCase()) ||
      repair.recepcion.modelo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (repair.recepcion.imei && repair.recepcion.imei.toLowerCase().includes(searchQuery.toLowerCase())) ||
      repair.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === '' || repair.estado === statusFilter;
    const matchesPriority = priorityFilter === '' || repair.prioridad === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const handleViewDetail = (repair: Repair) => {
    setSelectedRepair(repair);
    setShowDetailModal(true);
  };

  const handleGeneratePDF = (repair: Repair) => {
    generarPDFRecepcion({
      cliente: {
        nombre: repair.clienteNombre,
        telefono: repair.clienteTelefono,
        email: repair.clienteEmail
      },
      equipo: {
        tipo: repair.recepcion.tipoEquipo,
        marca: repair.recepcion.marca,
        modelo: repair.recepcion.modelo,
        color: repair.recepcion.color,
        imei: repair.recepcion.imei,
        contraseña: repair.recepcion.contraseña,
        diagnostico: repair.recepcion.diagnosticoInicial
      },
      numeroReparacion: repair.id,
      fecha: repair.recepcion.fechaRecepcion || new Date().toISOString().split('T')[0]
    }, false); // false = descargar directamente
  };

  const handlePreviewPDF = (repair: Repair) => {
    generarPDFRecepcion({
      cliente: {
        nombre: repair.clienteNombre,
        telefono: repair.clienteTelefono,
        email: repair.clienteEmail
      },
      equipo: {
        tipo: repair.recepcion.tipoEquipo,
        marca: repair.recepcion.marca,
        modelo: repair.recepcion.modelo,
        color: repair.recepcion.color,
        imei: repair.recepcion.imei,
        contraseña: repair.recepcion.contraseña,
        diagnostico: repair.recepcion.diagnosticoInicial
      },
      numeroReparacion: repair.id,
      fecha: repair.recepcion.fechaRecepcion || new Date().toISOString().split('T')[0]
    }, true); // true = vista previa
  };

  const getStatusIcon = (status: RepairStatus) => {
    switch (status) {
      case 'RECIBIDA':
        return <Clock size={16} />;
      case 'EN_PROCESO':
        return <AlertCircle size={16} />;
      case 'ESPERANDO_PIEZA':
        return <Package size={16} />;
      case 'COMPLETADA':
        return <CheckCircle size={16} />;
      case 'ENTREGADA':
        return <CheckCircle size={16} />;
      case 'CANCELADA':
        return <AlertCircle size={16} />;
      default:
        return <Clock size={16} />;
    }
  };

  const getStatusColor = (status: RepairStatus): 'blue' | 'yellow' | 'orange' | 'green' | 'gray' | 'red' => {
    switch (status) {
      case 'RECIBIDA':
        return 'blue';
      case 'EN_PROCESO':
        return 'yellow';
      case 'ESPERANDO_PIEZA':
        return 'orange';
      case 'COMPLETADA':
        return 'green';
      case 'ENTREGADA':
        return 'gray';
      case 'CANCELADA':
        return 'red';
      default:
        return 'gray';
    }
  };

  const getPriorityColor = (priority: RepairPriority): 'green' | 'yellow' | 'red' => {
    switch (priority) {
      case 'BAJA':
        return 'green';
      case 'MEDIA':
        return 'yellow';
      case 'ALTA':
        return 'red';
      default:
        return 'yellow';
    }
  };

  const formatCurrency = (amount: number) => {
    return `Q${amount.toFixed(2)}`;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader 
        title="Reparaciones" 
        subtitle="Gestión de reparaciones de equipos"
      />

      {/* Barra de acciones */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex flex-1 gap-4 w-full sm:w-auto">
          {/* Buscador */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <Input
              placeholder="Buscar por cliente, equipo, IMEI..."
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filtros */}
          <Select
            value={statusFilter}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value)}
            className="w-48"
          >
            <option value="">Todos los estados</option>
            <option value="RECIBIDA">Recibida</option>
            <option value="EN_PROCESO">En Proceso</option>
            <option value="ESPERANDO_PIEZA">Esperando Pieza</option>
            <option value="COMPLETADA">Completada</option>
            <option value="ENTREGADA">Entregada</option>
            <option value="CANCELADA">Cancelada</option>
          </Select>

          <Select
            value={priorityFilter}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPriorityFilter(e.target.value)}
            className="w-48"
          >
            <option value="">Todas las prioridades</option>
            <option value="BAJA">Baja</option>
            <option value="MEDIA">Media</option>
            <option value="ALTA">Alta</option>
          </Select>
        </div>

        <Button
          onClick={() => navigate('/reparaciones/nueva')}
          className="whitespace-nowrap"
        >
          <Plus size={20} className="mr-2" />
          Nueva Reparación
        </Button>
      </div>

      {/* Lista de reparaciones */}
      <div className="grid gap-4">
        {loadingRepairs ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-500">Cargando reparaciones...</p>
          </div>
        ) : filteredRepairs.length === 0 ? (
          <Card className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <FileText size={48} className="mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No se encontraron reparaciones
            </h3>
            <p className="text-gray-500 mb-4">
              {searchQuery || statusFilter || priorityFilter
                ? 'Intenta ajustar los filtros de búsqueda'
                : 'Comienza creando tu primera reparación'
              }
            </p>
            {!searchQuery && !statusFilter && !priorityFilter && (
              <Button onClick={() => navigate('/reparaciones/nueva')}>
                <Plus size={20} className="mr-2" />
                Nueva Reparación
              </Button>
            )}
          </Card>
        ) : (
          filteredRepairs.map((repair) => (
            <Card key={repair.id} className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                {/* Información principal */}
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {repair.id}
                    </h3>
                    <Badge color={getStatusColor(repair.estado)}>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(repair.estado)}
                        {STATUS_OPTIONS.find(opt => opt.value === repair.estado)?.label}
                      </div>
                    </Badge>
                    {repair.subEtapa && (
                      <Badge color="gray" className="text-xs">
                        {repair.subEtapa}
                      </Badge>
                    )}
                    <Badge color={getPriorityColor(repair.prioridad)}>
                      {repair.prioridad}
                    </Badge>
                    {repair.stickerSerieInterna && (
                      <Badge color="purple">
                        {repair.stickerSerieInterna}
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Cliente:</span>
                      <p className="font-medium">{repair.clienteNombre}</p>
                      <p className="text-gray-600">{repair.clienteTelefono}</p>
                    </div>

                    <div>
                      <span className="text-gray-500">Equipo:</span>
                      <p className="font-medium">
                        {repair.recepcion.marca} {repair.recepcion.modelo}
                      </p>
                      <p className="text-gray-600">{repair.recepcion.color}</p>
                    </div>

                    <div>
                      <span className="text-gray-500">Total:</span>
                      <p className="font-medium text-green-600 text-lg">
                        {formatCurrency(repair.total)}
                      </p>
                      
                      {/* Anticipo recibido */}
                      {repair.recepcion.montoAnticipo && repair.recepcion.montoAnticipo > 0 && (
                        <div className="mt-1">
                          <span className="text-gray-500 text-xs">Anticipo recibido:</span>
                          <p className="font-medium text-sm text-blue-600">
                            Q{repair.recepcion.montoAnticipo.toFixed(2)} ({repair.recepcion.metodoAnticipo})
                          </p>
                        </div>
                      )}
                      
                      {/* Total Ganancia */}
                      {repair.totalGanancia !== undefined && (
                        <div className="mt-1">
                          <span className="text-gray-500 text-xs">Total ganancia:</span>
                          <p className={`font-medium text-sm ${repair.totalGanancia >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            Q{repair.totalGanancia.toFixed(2)}
                          </p>
                        </div>
                      )}
                      
                      {/* Total Invertido */}
                      {repair.totalInvertido !== undefined && repair.totalInvertido > 0 && (
                        <div className="mt-1">
                          <span className="text-gray-500 text-xs">Total invertido:</span>
                          <p className="font-medium text-red-600 text-sm">
                            -Q{repair.totalInvertido.toFixed(2)}
                          </p>
                        </div>
                      )}
                      
                      {repair.tecnicoAsignado && (
                        <p className="text-gray-600 text-xs mt-1">
                          Técnico: {repair.tecnicoAsignado}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 text-sm text-gray-600">
                    <p className="line-clamp-2">{repair.recepcion.diagnosticoInicial}</p>
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex flex-col sm:flex-row gap-2 lg:flex-col lg:w-auto">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleViewDetail(repair)}
                    className="justify-center text-blue-600 hover:text-blue-700"
                  >
                    <Eye size={16} className="mr-1" />
                    Ver Detalle
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleGeneratePDF(repair)}
                    className="justify-center text-purple-600 hover:text-purple-700"
                  >
                    <Printer size={16} className="mr-1" />
                    Imprimir PDF
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowHistoryModal(repair.id)}
                    className="justify-center text-green-600 hover:text-green-700"
                  >
                    <History size={16} className="mr-1" />
                    Ver Historial
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/flujo-reparaciones')}
                    className="justify-center text-orange-600 hover:text-orange-700"
                  >
                    <Clock size={16} className="mr-1" />
                    Gestionar Flujo
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Modal de historial */}
      {showHistoryModal && (
        <Modal
          open={!!showHistoryModal}
          onClose={() => setShowHistoryModal(null)}
          title="Historial de Estados"
        >
          <StateHistory 
            history={backendRepairs.find(r => r.id === showHistoryModal)?.historialEstados || []}
          />
        </Modal>
      )}

      {/* Modal de detalle de reparación */}
      {showDetailModal && selectedRepair && (
        <Modal
          open={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedRepair(null);
          }}
          title={`Detalle de Reparación - ${selectedRepair.id}`}
        >
          <div className="space-y-6">
            {/* Información del Cliente */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                <AlertCircle size={18} />
                Información del Cliente
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-600">Nombre:</span>
                  <p className="font-medium">{selectedRepair.clienteNombre}</p>
                </div>
                <div>
                  <span className="text-gray-600">Teléfono:</span>
                  <p className="font-medium">{selectedRepair.clienteTelefono}</p>
                </div>
                {selectedRepair.clienteEmail && (
                  <div className="col-span-2">
                    <span className="text-gray-600">Email:</span>
                    <p className="font-medium">{selectedRepair.clienteEmail}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Información del Equipo */}
            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
                <Package size={18} />
                Información del Equipo
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-600">Tipo:</span>
                  <p className="font-medium">{selectedRepair.recepcion.tipoEquipo}</p>
                </div>
                <div>
                  <span className="text-gray-600">Marca:</span>
                  <p className="font-medium">{selectedRepair.recepcion.marca}</p>
                </div>
                <div>
                  <span className="text-gray-600">Modelo:</span>
                  <p className="font-medium">{selectedRepair.recepcion.modelo}</p>
                </div>
                <div>
                  <span className="text-gray-600">Color:</span>
                  <p className="font-medium">{selectedRepair.recepcion.color}</p>
                </div>
                {selectedRepair.recepcion.imei && (
                  <div>
                    <span className="text-gray-600">IMEI/Serie:</span>
                    <p className="font-medium">{selectedRepair.recepcion.imei}</p>
                  </div>
                )}
                {selectedRepair.recepcion.contraseña && (
                  <div>
                    <span className="text-gray-600">Contraseña:</span>
                    <p className="font-medium">{selectedRepair.recepcion.contraseña}</p>
                  </div>
                )}
                <div className="col-span-2">
                  <span className="text-gray-600">Diagnóstico Inicial:</span>
                  <p className="font-medium mt-1">{selectedRepair.recepcion.diagnosticoInicial}</p>
                </div>
              </div>
            </div>

            {/* Estado y Prioridad */}
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                <CheckCircle size={18} />
                Estado Actual
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-600">Estado:</span>
                  <div className="mt-1">
                    <Badge color={getStatusColor(selectedRepair.estado)}>
                      {STATUS_OPTIONS.find(opt => opt.value === selectedRepair.estado)?.label}
                    </Badge>
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Prioridad:</span>
                  <div className="mt-1">
                    <Badge color={getPriorityColor(selectedRepair.prioridad)}>
                      {selectedRepair.prioridad}
                    </Badge>
                  </div>
                </div>
                {selectedRepair.tecnicoAsignado && (
                  <div className="col-span-2">
                    <span className="text-gray-600">Técnico Asignado:</span>
                    <p className="font-medium">{selectedRepair.tecnicoAsignado}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Totales */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-3">Resumen Económico</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">Q{selectedRepair.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Impuestos:</span>
                  <span className="font-medium">Q{selectedRepair.impuestos.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total:</span>
                  <span className="text-green-600">Q{selectedRepair.total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex gap-3 pt-4 border-t">
              <Button
                onClick={() => handlePreviewPDF(selectedRepair)}
                variant="secondary"
                className="flex-1"
              >
                <FileSearch size={18} className="mr-2" />
                Vista Previa PDF
              </Button>
              <Button
                onClick={() => handleGeneratePDF(selectedRepair)}
                className="flex-1"
              >
                <Printer size={18} className="mr-2" />
                Imprimir PDF
              </Button>
              <Button
                onClick={() => navigate('/flujo-reparaciones')}
                variant="secondary"
                className="flex-1"
              >
                <Clock size={18} className="mr-2" />
                Gestionar Flujo
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}