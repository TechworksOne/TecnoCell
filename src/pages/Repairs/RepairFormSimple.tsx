import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Smartphone, FileText, Save, Printer } from 'lucide-react';
import { Customer } from '../../types/customer';
import { RepairFormData } from '../../types/repair';
import PageHeader from '../../components/common/PageHeader';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import CustomerPicker from '../../components/customers/CustomerPicker';
import equipoService from '../../services/equipoService';
import type { EquipoMarca, EquipoModelo, TipoEquipo } from '../../types/equipo';
import { generarPDFRecepcion } from '../../lib/pdfGenerator';
import { createReparacion } from '../../services/repairService';

type Step = 'cliente' | 'equipo' | 'resumen';

interface EquipmentData {
  tipo: string;
  marca: string;
  modelo: string;
  color: string;
  imei?: string;
  contraseña?: string;
  diagnostico: string;
}

export default function RepairFormSimple() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<Step>('cliente');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | undefined>();
  const [equipmentData, setEquipmentData] = useState<EquipmentData>({
    tipo: 'Telefono',
    marca: '',
    modelo: '',
    color: '',
    imei: '',
    contraseña: '',
    diagnostico: ''
  });
  const [isCreatingRepair, setIsCreatingRepair] = useState(false);
  const [fechaRecepcion, setFechaRecepcion] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Estados para marcas y modelos dinámicos
  const [marcas, setMarcas] = useState<EquipoMarca[]>([]);
  const [modelos, setModelos] = useState<EquipoModelo[]>([]);
  const [loadingMarcas, setLoadingMarcas] = useState(false);
  const [loadingModelos, setLoadingModelos] = useState(false);
  const [showNuevaMarcaInput, setShowNuevaMarcaInput] = useState(false);
  const [nuevaMarca, setNuevaMarca] = useState('');
  const [showNuevoModeloInput, setShowNuevoModeloInput] = useState(false);
  const [nuevoModelo, setNuevoModelo] = useState('');

  // Cargar marcas cuando cambia el tipo de equipo
  useEffect(() => {
    loadMarcas(equipmentData.tipo as TipoEquipo);
  }, [equipmentData.tipo]);

  // Cargar modelos cuando cambia la marca
  useEffect(() => {
    if (equipmentData.marca) {
      const marcaSeleccionada = marcas.find(m => m.nombre === equipmentData.marca);
      if (marcaSeleccionada) {
        loadModelos(marcaSeleccionada.id);
      }
    } else {
      setModelos([]);
    }
  }, [equipmentData.marca, marcas]);

  const loadMarcas = async (tipoEquipo: TipoEquipo) => {
    setLoadingMarcas(true);
    try {
      const marcasData = await equipoService.getAllMarcas(tipoEquipo);
      setMarcas(marcasData);
    } catch (error) {
      console.error('Error loading marcas:', error);
    } finally {
      setLoadingMarcas(false);
    }
  };

  const loadModelos = async (marcaId: number) => {
    setLoadingModelos(true);
    try {
      const modelosData = await equipoService.getModelosByMarca(marcaId);
      setModelos(modelosData);
    } catch (error) {
      console.error('Error loading modelos:', error);
    } finally {
      setLoadingModelos(false);
    }
  };

  const handleCrearNuevaMarca = async () => {
    if (!nuevaMarca.trim()) return;
    
    try {
      const nuevaMarcaCreada = await equipoService.createMarca({
        nombre: nuevaMarca,
        tipo_equipo: equipmentData.tipo as TipoEquipo
      });
      
      // Recargar marcas
      await loadMarcas(equipmentData.tipo as TipoEquipo);
      
      // Seleccionar la nueva marca
      setEquipmentData({ ...equipmentData, marca: nuevaMarcaCreada.nombre, modelo: '' });
      setShowNuevaMarcaInput(false);
      setNuevaMarca('');
      
      alert('Marca creada exitosamente');
    } catch (error) {
      console.error('Error creating marca:', error);
      alert('Error al crear la marca. Puede que ya exista.');
    }
  };

  const handleCrearNuevoModelo = async () => {
    if (!nuevoModelo.trim()) return;
    
    const marcaSeleccionada = marcas.find(m => m.nombre === equipmentData.marca);
    if (!marcaSeleccionada) return;
    
    try {
      const nuevoModeloCreado = await equipoService.createModelo({
        marca_id: marcaSeleccionada.id,
        nombre: nuevoModelo
      });
      
      // Recargar modelos
      await loadModelos(marcaSeleccionada.id);
      
      // Seleccionar el nuevo modelo
      setEquipmentData({ ...equipmentData, modelo: nuevoModeloCreado.nombre });
      setShowNuevoModeloInput(false);
      setNuevoModelo('');
      
      alert('Modelo creado exitosamente');
    } catch (error) {
      console.error('Error creating modelo:', error);
      alert('Error al crear el modelo. Puede que ya exista.');
    }
  };

  const handleNext = () => {
    if (currentStep === 'cliente' && selectedCustomer) {
      setCurrentStep('equipo');
    } else if (currentStep === 'equipo') {
      setCurrentStep('resumen');
    }
  };

  const handleBack = () => {
    if (currentStep === 'equipo') {
      setCurrentStep('cliente');
    } else if (currentStep === 'resumen') {
      setCurrentStep('equipo');
    }
  };

  const handleSubmit = () => {
    createRepair();
  };

  const handleGenerarPDF = () => {
    if (!selectedCustomer) {
      alert('Debe seleccionar un cliente primero');
      return;
    }

    const numeroReparacion = `REP${String(Date.now()).slice(-6)}`;
    const [anio, mes, dia] = fechaRecepcion.split('-');
    const fecha = `${dia}/${mes}/${anio}`;

    generarPDFRecepcion({
      numeroReparacion,
      fecha,
      cliente: {
        nombre: selectedCustomer.nombre
          ? `${selectedCustomer.nombre}${selectedCustomer.apellido ? ' ' + selectedCustomer.apellido : ''}`.trim()
          : `${selectedCustomer.firstName || ''} ${selectedCustomer.lastName || ''}`.trim(),
        telefono: selectedCustomer.telefono || selectedCustomer.phone || '',
        email: selectedCustomer.correo || selectedCustomer.email
      },
      equipo: {
        tipo: equipmentData.tipo,
        marca: equipmentData.marca,
        modelo: equipmentData.modelo,
        color: equipmentData.color,
        imei: equipmentData.imei,
        contraseña: equipmentData.contraseña,
        diagnostico: equipmentData.diagnostico
      }
    }, false); // false = descargar directamente
  };

  const isStepCompleted = (step: Step) => {
    switch (step) {
      case 'cliente':
        return !!selectedCustomer;
      case 'equipo':
        return equipmentData.marca && equipmentData.modelo;
      case 'resumen':
        return true;
      default:
        return false;
    }
  };

  const getStepNumber = (step: Step) => {
    switch (step) {
      case 'cliente': return 1;
      case 'equipo': return 2;
      case 'resumen': return 3;
      default: return 1;
    }
  };

  const canContinue = () => {
    switch (currentStep) {
      case 'cliente':
        return !!selectedCustomer;
      case 'equipo':
        return equipmentData.marca.trim() && equipmentData.modelo.trim();
      case 'resumen':
        return true;
      default:
        return false;
    }
  };



  // Crear la nueva reparación
  const createRepair = async () => {
    if (!selectedCustomer) return;

    setIsCreatingRepair(true);
    
    try {
      // Generar ID único con timestamp
      const repairId = `REP${String(Date.now()).slice(-6)}`;
      
      const customerName = selectedCustomer.nombre || `${selectedCustomer.firstName || ''} ${selectedCustomer.lastName || ''}`.trim();
      const customerPhone = selectedCustomer.telefono || selectedCustomer.phone || '';
      const customerEmail = selectedCustomer.correo || selectedCustomer.email || '';
      const isFrequent = selectedCustomer.frecuente || (selectedCustomer.loyaltyPoints && selectedCustomer.loyaltyPoints > 100);
      
      // Preparar datos de la reparación según el tipo RepairFormData
      const repairData: RepairFormData = {
        // Datos del cliente
        clienteNombre: customerName,
        clienteTelefono: customerPhone,
        clienteEmail: customerEmail,
        clienteId: selectedCustomer.id?.toString(),
        clienteFrecuente: isFrequent || false,
        
        // Recepción del equipo
        recepcion: {
          tipoEquipo: equipmentData.tipo as any,
          marca: equipmentData.marca,
          modelo: equipmentData.modelo,
          color: equipmentData.color,
          diagnosticoInicial: equipmentData.diagnostico,
          estadoFisico: "Pendiente revisión física",
          accesoriosRecibidos: {
            chip: false,
            estuche: false,
            memoriaSD: false,
            cargador: false
          },
          fotosRecepcion: [],
          fechaRecepcion: fechaRecepcion,
          userRecepcion: "Sistema"
        },
        
        // Estado inicial
        estado: "RECIBIDA",
        prioridad: "MEDIA",
        garantiaMeses: 1, // 1 mes de garantía por defecto
        
        // Items vacíos inicialmente (se agregarán durante el diagnóstico)
        items: [],
        manoDeObra: 0,
        fotosFinales: [],
        
        // Historial inicial
        historialEstados: [{
          id: `hist-${Date.now()}`,
          estado: "RECIBIDA",
          nota: `Equipo recibido para diagnóstico`,
          fotos: [],
          timestamp: new Date().toISOString(),
          user: "Sistema"
        }]
      };

      // Guardar en el backend
      const response = await createReparacion(repairData);
      
      // Mostrar mensaje de éxito y navegar
      alert(`Reparación ${response.id} creada exitosamente`);
      navigate('/reparaciones');
      
    } catch (error) {
      console.error('Error creating repair:', error);
      alert('Error al crear la reparación');
    } finally {
      setIsCreatingRepair(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/reparaciones')}
              className="text-gray-600"
            >
              <ArrowLeft size={20} className="mr-2" />
              Volver
            </Button>
            <PageHeader
              title="Nueva Reparación"
              subtitle="Crear una nueva orden de reparación"
            />
          </div>
        </div>

        {/* Progress Steps */}
        <Card className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            {/* Step 1: Cliente */}
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                currentStep === 'cliente' 
                  ? 'bg-blue-500 text-white' 
                  : isStepCompleted('cliente')
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}>
                {isStepCompleted('cliente') && currentStep !== 'cliente' ? '✓' : '1'}
              </div>
              <span className={`font-medium ${
                currentStep === 'cliente' 
                  ? 'text-blue-600' 
                  : isStepCompleted('cliente')
                  ? 'text-green-600'
                  : 'text-gray-500'
              }`}>
                Cliente
              </span>
            </div>
            
            <div className={`flex-1 h-0.5 mx-4 ${
              isStepCompleted('cliente') ? 'bg-green-500' : 'bg-gray-200'
            }`}></div>
            
            {/* Step 2: Equipo */}
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                currentStep === 'equipo' 
                  ? 'bg-blue-500 text-white' 
                  : isStepCompleted('equipo')
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}>
                {isStepCompleted('equipo') && currentStep !== 'equipo' ? '✓' : '2'}
              </div>
              <span className={`font-medium ${
                currentStep === 'equipo' 
                  ? 'text-blue-600' 
                  : isStepCompleted('equipo')
                  ? 'text-green-600'
                  : 'text-gray-500'
              }`}>
                Equipo
              </span>
            </div>
            
            <div className={`flex-1 h-0.5 mx-4 ${
              isStepCompleted('equipo') ? 'bg-green-500' : 'bg-gray-200'
            }`}></div>
            
            {/* Step 3: Resumen */}
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                currentStep === 'resumen' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-500'
              }`}>
                3
              </div>
              <span className={`font-medium ${
                currentStep === 'resumen' ? 'text-blue-600' : 'text-gray-500'
              }`}>
                Resumen
              </span>
            </div>
          </div>
        </Card>

        {/* Step Content */}
        {currentStep === 'cliente' && (
          <Card className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <User size={16} className="text-blue-600" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900">Datos del Cliente</h4>
              <span className="text-sm text-gray-500">Selecciona el cliente para esta reparación</span>
            </div>
            
            <CustomerPicker
              value={selectedCustomer}
              onChange={setSelectedCustomer}
              allowCreate={true}
              placeholder="Buscar cliente por nombre, teléfono o email..."
            />
          </Card>
        )}

        {currentStep === 'equipo' && (
          <Card className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <Smartphone size={16} className="text-green-600" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900">Datos del Equipo</h4>
              <span className="text-sm text-gray-500">Información del dispositivo a reparar</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Equipo
                </label>
                <Select
                  value={equipmentData.tipo}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                    setEquipmentData({ 
                      ...equipmentData, 
                      tipo: e.target.value, 
                      marca: '', 
                      modelo: '' 
                    });
                  }}
                  className="w-full"
                >
                  <option value="Telefono">Teléfono</option>
                  <option value="Tablet">Tablet</option>
                  <option value="Laptop">Laptop</option>
                  <option value="Consola">Consola</option>
                  <option value="Otro">Otro</option>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Marca *
                </label>
                {!showNuevaMarcaInput ? (
                  <div className="space-y-2">
                    <Select
                      value={equipmentData.marca}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                        if (e.target.value === '__nueva__') {
                          setShowNuevaMarcaInput(true);
                        } else {
                          setEquipmentData({ ...equipmentData, marca: e.target.value, modelo: '' });
                        }
                      }}
                      className="w-full"
                      disabled={loadingMarcas}
                    >
                      <option value="">Seleccionar marca...</option>
                      {marcas.map(marca => (
                        <option key={marca.id} value={marca.nombre}>{marca.nombre}</option>
                      ))}
                      <option value="__nueva__">+ Crear nueva marca</option>
                    </Select>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      value={nuevaMarca}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNuevaMarca(e.target.value)}
                      placeholder="Nombre de la marca..."
                      className="flex-1"
                      autoFocus
                    />
                    <Button
                      variant="primary"
                      onClick={handleCrearNuevaMarca}
                      disabled={!nuevaMarca.trim()}
                      className="px-4"
                    >
                      Crear
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setShowNuevaMarcaInput(false);
                        setNuevaMarca('');
                      }}
                      className="px-4"
                    >
                      Cancelar
                    </Button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Modelo *
                </label>
                {!showNuevoModeloInput ? (
                  <div className="space-y-2">
                    <Select
                      value={equipmentData.modelo}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                        if (e.target.value === '__nuevo__') {
                          setShowNuevoModeloInput(true);
                        } else {
                          setEquipmentData({ ...equipmentData, modelo: e.target.value });
                        }
                      }}
                      className="w-full"
                      disabled={!equipmentData.marca || loadingModelos}
                    >
                      <option value="">Seleccionar modelo...</option>
                      {modelos.map(modelo => (
                        <option key={modelo.id} value={modelo.nombre}>{modelo.nombre}</option>
                      ))}
                      {equipmentData.marca && <option value="__nuevo__">+ Crear nuevo modelo</option>}
                    </Select>
                    {!equipmentData.marca && (
                      <p className="text-xs text-gray-500">
                        Selecciona una marca primero
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      value={nuevoModelo}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNuevoModelo(e.target.value)}
                      placeholder="Nombre del modelo..."
                      className="flex-1"
                      autoFocus
                    />
                    <Button
                      variant="primary"
                      onClick={handleCrearNuevoModelo}
                      disabled={!nuevoModelo.trim()}
                      className="px-4"
                    >
                      Crear
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setShowNuevoModeloInput(false);
                        setNuevoModelo('');
                      }}
                      className="px-4"
                    >
                      Cancelar
                    </Button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color *
                </label>
                <Input
                  value={equipmentData.color}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                    setEquipmentData({ ...equipmentData, color: e.target.value })
                  }
                  placeholder="Ej: Negro, Blanco, Azul"
                  className="w-full"
                />
              </div>
            </div>

            {/* Segunda fila: IMEI/Serie y Contraseña */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  IMEI / Número de Serie (opcional)
                </label>
                <Input
                  value={equipmentData.imei || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                    setEquipmentData({ ...equipmentData, imei: e.target.value })
                  }
                  placeholder="Ingresa IMEI o número de serie"
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contraseña / Patrón (opcional)
                </label>
                <Input
                  type="text"
                  value={equipmentData.contraseña || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                    setEquipmentData({ ...equipmentData, contraseña: e.target.value })
                  }
                  placeholder="Contraseña o patrón del equipo"
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Para acceder al equipo durante la reparación
                </p>
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Diagnóstico Inicial
              </label>
              <textarea
                value={equipmentData.diagnostico}
                onChange={(e) => setEquipmentData({ ...equipmentData, diagnostico: e.target.value })}
                placeholder="Describe el problema reportado por el cliente..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={4}
              />
            </div>
          </Card>
        )}

        {currentStep === 'resumen' && (
          <Card className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <FileText size={16} className="text-purple-600" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900">Resumen de la Reparación</h4>
              <span className="text-sm text-gray-500">Revisa los datos antes de crear la orden</span>
            </div>
            
            <div className="space-y-6">
              {/* Cliente */}
              <div>
                <h5 className="font-medium text-gray-700 mb-3">Cliente</h5>
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <User size={20} className="text-blue-600" />
                    <div>
                      <p className="font-medium text-blue-900">{selectedCustomer?.nombre}</p>
                      <div className="flex gap-4 text-sm text-blue-700 mt-1">
                        {selectedCustomer?.telefono && <span>📞 {selectedCustomer.telefono}</span>}
                        {selectedCustomer?.correo && <span>✉️ {selectedCustomer.correo}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Equipo */}
              <div>
                <h5 className="font-medium text-gray-700 mb-3">Equipo</h5>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <Smartphone size={20} className="text-green-600" />
                    <div>
                      <p className="font-medium text-green-900">
                        {equipmentData.tipo} {equipmentData.marca} {equipmentData.modelo}
                      </p>
                      {equipmentData.color && (
                        <p className="text-sm text-green-700 mt-1">Color: {equipmentData.color}</p>
                      )}
                      {equipmentData.imei && (
                        <p className="text-sm text-green-700 mt-1">IMEI/Serie: {equipmentData.imei}</p>
                      )}
                      {equipmentData.contraseña && (
                        <p className="text-sm text-green-700 mt-1">Contraseña: {equipmentData.contraseña}</p>
                      )}
                      {equipmentData.diagnostico && (
                        <p className="text-sm text-green-700 mt-2">
                          <strong>Problema:</strong> {equipmentData.diagnostico}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Botón para Imprimir Comprobante */}
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 border-2 border-dashed border-purple-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Printer size={24} className="text-purple-600" />
                    <div>
                      <p className="font-medium text-gray-900">Comprobante de Recepción</p>
                      <p className="text-sm text-gray-600">Genera el PDF con los términos y condiciones</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleGenerarPDF}
                    className="bg-white hover:bg-purple-50 text-purple-600 border-purple-300"
                  >
                    <Printer size={16} className="mr-2" />
                    Generar PDF
                  </Button>
                </div>
              </div>

              {/* Fecha de Recepción */}
              <div>
                <h5 className="font-medium text-gray-700 mb-3">Fecha de Recepción</h5>
                <div className="bg-gray-50 rounded-lg p-4">
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    Selecciona la fecha de ingreso del equipo
                  </label>
                  <input
                    type="date"
                    value={fechaRecepcion}
                    onChange={(e) => setFechaRecepcion(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  />
                </div>
              </div>

              {/* Anticipo - REMOVIDO TEMPORALMENTE */}
            </div>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between">
          <div>
            {currentStep !== 'cliente' && (
              <Button
                variant="ghost"
                onClick={handleBack}
                className="text-gray-600"
              >
                <ArrowLeft size={16} className="mr-2" />
                Anterior
              </Button>
            )}
          </div>
          
          <div className="flex gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/reparaciones')}
            >
              Cancelar
            </Button>
            
            {currentStep === 'resumen' ? (
              <Button
                disabled={!canContinue() || isCreatingRepair}
                onClick={handleSubmit}
                className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
              >
                {isCreatingRepair ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creando...
                  </>
                ) : (
                  <>
                    <Save size={16} className="mr-2" />
                    Crear Reparación
                  </>
                )}
              </Button>
            ) : (
              <Button
                disabled={!canContinue()}
                onClick={handleNext}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Continuar
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}