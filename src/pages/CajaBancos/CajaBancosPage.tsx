import { useState, useEffect } from 'react';
import { Wallet, TrendingUp, TrendingDown, DollarSign, Building2, Plus, Check, Clock, X, ArrowUpCircle, ArrowDownCircle, ArrowRightLeft } from 'lucide-react';
import API_URL from '../../services/config';
import PageHeader from '../../components/common/PageHeader';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';
import axios from 'axios';

interface CuentaBancaria {
  id: number;
  nombre: string;
  numero_cuenta: string;
  tipo_cuenta: string;
  saldo_actual: number;
  pos_asociado: string | null;
  activa: boolean;
}

interface Movimiento {
  id: number;
  tipo_movimiento: 'INGRESO' | 'EGRESO';
  monto: number;
  concepto: string;
  categoria: string;
  estado: 'PENDIENTE' | 'CONFIRMADO';
  fecha_movimiento: string;
  realizado_por: string;
  cuenta_nombre?: string;
  venta_id?: string;
  numero_referencia?: string;
}

export default function CajaBancosPage() {
  const [saldoCajaChica, setSaldoCajaChica] = useState({ saldo: 0, ingresos: 0, egresos: 0, pendientes: 0 });
  const [cuentasBancarias, setCuentasBancarias] = useState<CuentaBancaria[]>([]);
  const [movimientosCaja, setMovimientosCaja] = useState<Movimiento[]>([]);
  const [movimientosBancos, setMovimientosBancos] = useState<Movimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [vistaActual, setVistaActual] = useState<'caja' | 'bancos'>('caja');
  const [estadoFiltro, setEstadoFiltro] = useState<'PENDIENTE' | 'CONFIRMADO'>('PENDIENTE');

  // Estados para modal de registro
  const [showModal, setShowModal] = useState(false);
  const [tipoMovimiento, setTipoMovimiento] = useState<'GASTO' | 'RETIRO' | 'DEPOSITO' | 'TRANSFERENCIA'>('GASTO');
  const [monto, setMonto] = useState('');
  const [concepto, setConcepto] = useState('');
  const [cuentaDestino, setCuentaDestino] = useState('');
  const [cuentaOrigen, setCuentaOrigen] = useState('');
  const [observaciones, setObservaciones] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.error('No hay token de autenticación');
        window.location.href = '/login';
        return;
      }

      const config = { headers: { Authorization: `Bearer ${token}` } };

      const cajaSaldo = await axios.get(`${API_URL}/caja/caja-chica/saldo`, config);
      setSaldoCajaChica(cajaSaldo.data.data);

      const cajaMovs = await axios.get(`${API_URL}/caja/caja-chica/movimientos`, config);
      setMovimientosCaja(cajaMovs.data.data);

      const bancos = await axios.get(`${API_URL}/caja/bancos`, config);
      setCuentasBancarias(bancos.data.data);

      const bancosMovs = await axios.get(`${API_URL}/caja/bancos/movimientos`, config);
      setMovimientosBancos(bancosMovs.data.data);

    } catch (error: any) {
      console.error('Error loading data:', error);
      
      // Si es error 401, el token expiró - redirigir a login
      if (error.response?.status === 401) {
        console.error('Token expirado o inválido. Redirigiendo al login...');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    } finally {
      setLoading(false);
    }
  };

  const confirmarMovimientoCaja = async (id: number) => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.put(`${API_URL}/caja/caja-chica/confirmar/${id}`, {}, config);
      loadData();
    } catch (error: any) {
      console.error('Error confirmando movimiento:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
  };

  const confirmarMovimientoBanco = async (id: number) => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.put(`${API_URL}/caja/bancos/confirmar/${id}`, {}, config);
      loadData();
    } catch (error: any) {
      console.error('Error confirmando movimiento:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
  };

  const handleRegistrarMovimiento = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const montoNum = parseFloat(monto);

      if (!montoNum || montoNum <= 0) {
        alert('Ingresa un monto válido');
        return;
      }

      if (!concepto.trim()) {
        alert('Ingresa un concepto');
        return;
      }

      const usuario = localStorage.getItem('userName') || 'Usuario';

      if (tipoMovimiento === 'GASTO' || tipoMovimiento === 'RETIRO') {
        // Registrar EGRESO en caja chica
        await axios.post(`${API_URL}/caja/caja-chica/movimiento`, {
          tipo_movimiento: 'EGRESO',
          monto: montoNum,
          concepto: concepto,
          categoria: tipoMovimiento === 'GASTO' ? 'Gasto' : 'Retiro',
          realizado_por: usuario,
          observaciones: observaciones || null
        }, config);

        alert(`${tipoMovimiento} registrado exitosamente`);
      } else if (tipoMovimiento === 'DEPOSITO') {
        // Registrar EGRESO en caja chica e INGRESO en banco
        if (!cuentaDestino) {
          alert('Selecciona una cuenta bancaria de destino');
          return;
        }

        // Egreso de caja chica
        await axios.post(`${API_URL}/caja/caja-chica/movimiento`, {
          tipo_movimiento: 'EGRESO',
          monto: montoNum,
          concepto: `Depósito a ${cuentasBancarias.find(c => c.id === parseInt(cuentaDestino))?.nombre} - ${concepto}`,
          categoria: 'Otro',
          realizado_por: usuario,
          observaciones: observaciones || null
        }, config);

        // Ingreso en banco
        await axios.post(`${API_URL}/caja/bancos/movimiento`, {
          cuenta_id: parseInt(cuentaDestino),
          tipo_movimiento: 'INGRESO',
          monto: montoNum,
          concepto: `Depósito desde Caja Chica - ${concepto}`,
          categoria: 'Deposito',
          realizado_por: usuario,
          observaciones: observaciones || null
        }, config);

        alert('Depósito registrado exitosamente');
      } else if (tipoMovimiento === 'TRANSFERENCIA') {
        // Transferencia entre cuentas bancarias
        if (!cuentaOrigen || !cuentaDestino) {
          alert('Selecciona ambas cuentas bancarias');
          return;
        }

        if (cuentaOrigen === cuentaDestino) {
          alert('La cuenta de origen y destino deben ser diferentes');
          return;
        }

        const nombreOrigen = cuentasBancarias.find(c => c.id === parseInt(cuentaOrigen))?.nombre;
        const nombreDestino = cuentasBancarias.find(c => c.id === parseInt(cuentaDestino))?.nombre;

        // Egreso de cuenta origen
        await axios.post(`${API_URL}/caja/bancos/movimiento`, {
          cuenta_id: parseInt(cuentaOrigen),
          tipo_movimiento: 'EGRESO',
          monto: montoNum,
          concepto: `Transferencia a ${nombreDestino} - ${concepto}`,
          categoria: 'Transferencia',
          realizado_por: usuario,
          observaciones: observaciones || null
        }, config);

        // Ingreso en cuenta destino
        await axios.post(`${API_URL}/caja/bancos/movimiento`, {
          cuenta_id: parseInt(cuentaDestino),
          tipo_movimiento: 'INGRESO',
          monto: montoNum,
          concepto: `Transferencia desde ${nombreOrigen} - ${concepto}`,
          categoria: 'Transferencia',
          realizado_por: usuario,
          observaciones: observaciones || null
        }, config);

        alert('Transferencia registrada exitosamente');
      }

      // Limpiar formulario y recargar datos
      setShowModal(false);
      setMonto('');
      setConcepto('');
      setObservaciones('');
      setCuentaDestino('');
      setCuentaOrigen('');
      loadData();
    } catch (error: any) {
      console.error('Error registrando movimiento:', error);
      
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      } else {
        alert('Error al registrar movimiento');
      }
    }
  };

  const totalBancos = cuentasBancarias.reduce((sum, c) => sum + Number(c.saldo_actual || 0), 0);

  const movsCajaFiltrados = movimientosCaja.filter(m => m.estado === estadoFiltro);
  const movsBancosFiltrados = movimientosBancos.filter(m => m.estado === estadoFiltro);

  const pendientesCaja = movimientosCaja.filter(m => m.estado === 'PENDIENTE').length;
  const pendientesBancos = movimientosBancos.filter(m => m.estado === 'PENDIENTE').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 ml-64 p-8">
      <div className="mb-8">
        <PageHeader
          title="Caja Chica y Bancos"
          subtitle="Control de efectivo y cuentas bancarias con confirmación de pagos"
        />

        <Card className="mt-4 bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
          <div className="flex items-start gap-4">
            <div className="bg-amber-100 p-3 rounded-lg">
              <Clock size={24} className="text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-800 mb-1">Sistema de Confirmación de Pagos</h3>
              <p className="text-sm text-slate-600">
                Los ingresos por ventas se registran como <strong>PENDIENTES</strong> hasta que confirmes haber recibido el pago.
                Una vez confirmados, se suman al saldo y aparecen en la pestaña de Confirmados.
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Resumen General */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Caja Chica (Confirmado)</p>
              <p className="text-3xl font-bold mt-1">Q{Number(saldoCajaChica.saldo || 0).toFixed(2)}</p>
              <p className="text-xs text-green-100 mt-1">Efectivo disponible</p>
            </div>
            <Wallet size={48} className="text-green-200" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-amber-100 text-sm">Pendientes Caja</p>
              <p className="text-3xl font-bold mt-1">{pendientesCaja}</p>
              <p className="text-xs text-amber-100 mt-1">Por confirmar</p>
            </div>
            <Clock size={48} className="text-amber-200" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Total Bancos</p>
              <p className="text-3xl font-bold mt-1">Q{totalBancos.toFixed(2)}</p>
              <p className="text-xs text-blue-100 mt-1">{cuentasBancarias.length} cuentas</p>
            </div>
            <Building2 size={48} className="text-blue-200" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Pendientes Bancos</p>
              <p className="text-3xl font-bold mt-1">{pendientesBancos}</p>
              <p className="text-xs text-purple-100 mt-1">Por confirmar</p>
            </div>
            <Clock size={48} className="text-purple-200" />
          </div>
        </Card>
      </div>

      {/* Pestañas de Vista */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={vistaActual === 'caja' ? 'primary' : 'outline'}
          onClick={() => setVistaActual('caja')}
          className={vistaActual === 'caja' ? 'bg-green-600' : ''}
        >
          <Wallet size={20} className="mr-2" />
          Caja Chica
          {pendientesCaja > 0 && (
            <Badge color="red" className="ml-2">{pendientesCaja}</Badge>
          )}
        </Button>
        <Button
          variant={vistaActual === 'bancos' ? 'primary' : 'outline'}
          onClick={() => setVistaActual('bancos')}
          className={vistaActual === 'bancos' ? 'bg-blue-600' : ''}
        >
          <Building2 size={20} className="mr-2" />
          Bancos
          {pendientesBancos > 0 && (
            <Badge color="red" className="ml-2">{pendientesBancos}</Badge>
          )}
        </Button>
      </div>

      {/* Pestañas de Estado */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={estadoFiltro === 'PENDIENTE' ? 'primary' : 'outline'}
          onClick={() => setEstadoFiltro('PENDIENTE')}
          className={estadoFiltro === 'PENDIENTE' ? 'bg-amber-600' : ''}
        >
          <Clock size={20} className="mr-2" />
          Pendientes de Confirmar
          {estadoFiltro === 'PENDIENTE' && (
            <Badge color="white" className="ml-2">
              {vistaActual === 'caja' ? pendientesCaja : pendientesBancos}
            </Badge>
          )}
        </Button>
        <Button
          variant={estadoFiltro === 'CONFIRMADO' ? 'primary' : 'outline'}
          onClick={() => setEstadoFiltro('CONFIRMADO')}
          className={estadoFiltro === 'CONFIRMADO' ? 'bg-green-600' : ''}
        >
          <Check size={20} className="mr-2" />
          Confirmados
        </Button>
      </div>

      {/* VISTA CAJA CHICA */}
      {vistaActual === 'caja' && (
        <Card>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">
              Movimientos {estadoFiltro === 'PENDIENTE' ? 'Pendientes' : 'Confirmados'} - Caja Chica
            </h3>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                className="bg-red-600 hover:bg-red-700"
                onClick={() => {
                  setTipoMovimiento('GASTO');
                  setShowModal(true);
                }}
              >
                <ArrowDownCircle size={16} className="mr-2" />
                Registrar Gasto
              </Button>
              <Button 
                size="sm" 
                className="bg-orange-600 hover:bg-orange-700"
                onClick={() => {
                  setTipoMovimiento('RETIRO');
                  setShowModal(true);
                }}
              >
                <ArrowDownCircle size={16} className="mr-2" />
                Registrar Retiro
              </Button>
              <Button 
                size="sm" 
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => {
                  setTipoMovimiento('DEPOSITO');
                  setShowModal(true);
                }}
              >
                <ArrowUpCircle size={16} className="mr-2" />
                Depósito a Banco
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 text-sm font-semibold text-slate-600">Fecha</th>
                  <th className="text-left p-3 text-sm font-semibold text-slate-600">Concepto</th>
                  <th className="text-left p-3 text-sm font-semibold text-slate-600">Categoría</th>
                  <th className="text-left p-3 text-sm font-semibold text-slate-600">Tipo</th>
                  <th className="text-right p-3 text-sm font-semibold text-slate-600">Monto</th>
                  {estadoFiltro === 'PENDIENTE' && (
                    <th className="text-center p-3 text-sm font-semibold text-slate-600">Acciones</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {movsCajaFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={estadoFiltro === 'PENDIENTE' ? 6 : 5} className="text-center p-8 text-slate-500">
                      {estadoFiltro === 'PENDIENTE' 
                        ? 'No hay movimientos pendientes de confirmar' 
                        : 'No hay movimientos confirmados'}
                    </td>
                  </tr>
                ) : (
                  movsCajaFiltrados.map((mov) => (
                    <tr key={mov.id} className="border-b hover:bg-slate-50">
                      <td className="p-3 text-sm">
                        {new Date(mov.fecha_movimiento).toLocaleDateString()}
                      </td>
                      <td className="p-3">
                        <p className="font-medium">{mov.concepto}</p>
                        {mov.venta_id && (
                          <p className="text-xs text-slate-500">Venta: {mov.venta_id}</p>
                        )}
                      </td>
                      <td className="p-3">
                        <Badge color="blue">{mov.categoria}</Badge>
                      </td>
                      <td className="p-3">
                        <Badge color={mov.tipo_movimiento === 'INGRESO' ? 'green' : 'red'}>
                          {mov.tipo_movimiento}
                        </Badge>
                      </td>
                      <td className={`p-3 text-right font-semibold ${
                        mov.tipo_movimiento === 'INGRESO' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {mov.tipo_movimiento === 'INGRESO' ? '+' : '-'}Q{Number(mov.monto || 0).toFixed(2)}
                      </td>
                      {estadoFiltro === 'PENDIENTE' && (
                        <td className="p-3 text-center">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => confirmarMovimientoCaja(mov.id)}
                          >
                            <Check size={16} className="mr-1" />
                            Confirmar
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* VISTA BANCOS */}
      {vistaActual === 'bancos' && (
        <>
          {estadoFiltro === 'CONFIRMADO' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {cuentasBancarias.map((cuenta) => (
                <Card key={cuenta.id}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-lg">{cuenta.nombre}</h4>
                    {cuenta.pos_asociado && (
                      <Badge color="purple">{cuenta.pos_asociado}</Badge>
                    )}
                  </div>
                  <div className="mt-4">
                    <p className="text-sm text-slate-600">Saldo Actual</p>
                    <p className="text-2xl font-bold text-blue-600">Q{Number(cuenta.saldo_actual || 0).toFixed(2)}</p>
                  </div>
                </Card>
              ))}
            </div>
          )}

          <Card>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                Movimientos {estadoFiltro === 'PENDIENTE' ? 'Pendientes' : 'Confirmados'} - Bancos
              </h3>
              <Button 
                size="sm" 
                className="bg-purple-600 hover:bg-purple-700"
                onClick={() => {
                  setTipoMovimiento('TRANSFERENCIA');
                  setShowModal(true);
                }}
              >
                <ArrowRightLeft size={16} className="mr-2" />
                Transferencia entre Bancos
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 text-sm font-semibold text-slate-600">Fecha</th>
                    <th className="text-left p-3 text-sm font-semibold text-slate-600">Banco</th>
                    <th className="text-left p-3 text-sm font-semibold text-slate-600">Concepto</th>
                    <th className="text-left p-3 text-sm font-semibold text-slate-600">Categoría</th>
                    <th className="text-left p-3 text-sm font-semibold text-slate-600">Tipo</th>
                    <th className="text-right p-3 text-sm font-semibold text-slate-600">Monto</th>
                    {estadoFiltro === 'PENDIENTE' && (
                      <th className="text-center p-3 text-sm font-semibold text-slate-600">Acciones</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {movsBancosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={estadoFiltro === 'PENDIENTE' ? 7 : 6} className="text-center p-8 text-slate-500">
                        {estadoFiltro === 'PENDIENTE' 
                          ? 'No hay movimientos pendientes de confirmar' 
                          : 'No hay movimientos confirmados'}
                      </td>
                    </tr>
                  ) : (
                    movsBancosFiltrados.map((mov) => (
                      <tr key={mov.id} className="border-b hover:bg-slate-50">
                        <td className="p-3 text-sm">
                          {new Date(mov.fecha_movimiento).toLocaleDateString()}
                        </td>
                        <td className="p-3 font-medium">
                          {mov.cuenta_nombre || 'N/A'}
                        </td>
                        <td className="p-3">
                          <p className="font-medium">{mov.concepto}</p>
                          {mov.venta_id && (
                            <p className="text-xs text-slate-500">Venta: {mov.venta_id}</p>
                          )}
                          {mov.numero_referencia && (
                            <p className="text-xs text-slate-500">Ref: {mov.numero_referencia}</p>
                          )}
                        </td>
                        <td className="p-3">
                          <Badge color="blue">{mov.categoria}</Badge>
                        </td>
                        <td className="p-3">
                          <Badge color={mov.tipo_movimiento === 'INGRESO' ? 'green' : 'red'}>
                            {mov.tipo_movimiento}
                          </Badge>
                        </td>
                        <td className={`p-3 text-right font-semibold ${
                          mov.tipo_movimiento === 'INGRESO' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {mov.tipo_movimiento === 'INGRESO' ? '+' : '-'}Q{Number(mov.monto || 0).toFixed(2)}
                        </td>
                        {estadoFiltro === 'PENDIENTE' && (
                          <td className="p-3 text-center">
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => confirmarMovimientoBanco(mov.id)}
                            >
                              <Check size={16} className="mr-1" />
                              Confirmar
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* MODAL DE REGISTRO DE MOVIMIENTOS */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={
          tipoMovimiento === 'GASTO' ? 'Registrar Gasto' :
          tipoMovimiento === 'RETIRO' ? 'Registrar Retiro' :
          tipoMovimiento === 'DEPOSITO' ? 'Depósito a Banco' :
          'Transferencia entre Bancos'
        }
      >
        <div className="space-y-4">
          {/* Monto */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Monto (Q)
            </label>
            <Input
              type="number"
              step="0.01"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder="0.00"
              className="w-full"
            />
          </div>

          {/* Concepto */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Concepto
            </label>
            <Input
              type="text"
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              placeholder="Descripción del movimiento"
              className="w-full"
            />
          </div>

          {/* Cuenta Destino (para depósitos) */}
          {tipoMovimiento === 'DEPOSITO' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Cuenta Bancaria de Destino
              </label>
              <Select
                value={cuentaDestino}
                onChange={(e) => setCuentaDestino(e.target.value)}
                className="w-full"
              >
                <option value="">Seleccione una cuenta...</option>
                {cuentasBancarias.map((cuenta) => (
                  <option key={cuenta.id} value={cuenta.id}>
                    {cuenta.nombre} {cuenta.pos_asociado ? `(${cuenta.pos_asociado})` : ''}
                  </option>
                ))}
              </Select>
            </div>
          )}

          {/* Cuentas Origen y Destino (para transferencias) */}
          {tipoMovimiento === 'TRANSFERENCIA' && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Cuenta de Origen
                </label>
                <Select
                  value={cuentaOrigen}
                  onChange={(e) => setCuentaOrigen(e.target.value)}
                  className="w-full"
                >
                  <option value="">Seleccione cuenta origen...</option>
                  {cuentasBancarias.map((cuenta) => (
                    <option key={cuenta.id} value={cuenta.id}>
                      {cuenta.nombre} - Q{Number(cuenta.saldo_actual || 0).toFixed(2)}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="text-center text-slate-500">
                <ArrowRightLeft size={24} className="mx-auto" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Cuenta de Destino
                </label>
                <Select
                  value={cuentaDestino}
                  onChange={(e) => setCuentaDestino(e.target.value)}
                  className="w-full"
                >
                  <option value="">Seleccione cuenta destino...</option>
                  {cuentasBancarias
                    .filter(cuenta => cuenta.id.toString() !== cuentaOrigen)
                    .map((cuenta) => (
                      <option key={cuenta.id} value={cuenta.id}>
                        {cuenta.nombre} - Q{Number(cuenta.saldo_actual || 0).toFixed(2)}
                      </option>
                    ))}
                </Select>
              </div>
            </>
          )}

          {/* Observaciones */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Observaciones (opcional)
            </label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Notas adicionales..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
            />
          </div>

          {/* Resumen */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <h4 className="font-semibold text-sm text-slate-700 mb-2">Resumen</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Tipo:</span>
                <span className="font-medium">
                  {tipoMovimiento === 'GASTO' && 'Gasto de Caja Chica'}
                  {tipoMovimiento === 'RETIRO' && 'Retiro de Caja Chica'}
                  {tipoMovimiento === 'DEPOSITO' && 'Depósito a Banco'}
                  {tipoMovimiento === 'TRANSFERENCIA' && 'Transferencia Bancaria'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Monto:</span>
                <span className="font-bold text-lg text-blue-600">
                  Q{parseFloat(monto || '0').toFixed(2)}
                </span>
              </div>
              {tipoMovimiento === 'DEPOSITO' && cuentaDestino && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Destino:</span>
                  <span className="font-medium">
                    {cuentasBancarias.find(c => c.id === parseInt(cuentaDestino))?.nombre}
                  </span>
                </div>
              )}
              {tipoMovimiento === 'TRANSFERENCIA' && cuentaOrigen && cuentaDestino && (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Desde:</span>
                    <span className="font-medium">
                      {cuentasBancarias.find(c => c.id === parseInt(cuentaOrigen))?.nombre}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Hacia:</span>
                    <span className="font-medium">
                      {cuentasBancarias.find(c => c.id === parseInt(cuentaDestino))?.nombre}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowModal(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleRegistrarMovimiento}
              className={`flex-1 ${
                tipoMovimiento === 'GASTO' ? 'bg-red-600 hover:bg-red-700' :
                tipoMovimiento === 'RETIRO' ? 'bg-orange-600 hover:bg-orange-700' :
                tipoMovimiento === 'DEPOSITO' ? 'bg-blue-600 hover:bg-blue-700' :
                'bg-purple-600 hover:bg-purple-700'
              }`}
            >
              Registrar {tipoMovimiento}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
