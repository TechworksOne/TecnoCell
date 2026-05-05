import { useState, useEffect } from 'react';
import {
  Wallet, Building2, Plus, Check, Clock, X,
  ArrowUpCircle, ArrowDownCircle, ArrowRightLeft,
  RefreshCw, AlertCircle, TrendingUp, TrendingDown,
  CreditCard, Banknote, Search, Filter, ChevronDown,
  ShieldCheck, Landmark, FileText
} from 'lucide-react';
import API_URL from '../../services/config';
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
  cuenta_id?: number;
  tipo_movimiento: 'INGRESO' | 'EGRESO';
  monto: number;
  concepto: string;
  categoria: string;
  estado: 'PENDIENTE' | 'CONFIRMADO' | 'ANULADO';
  referencia_tipo?: string;
  referencia_id?: string;
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
  const [error, setError] = useState<string | null>(null);
  const [vistaActual, setVistaActual] = useState<'caja' | 'bancos'>('caja');
  const [estadoFiltro, setEstadoFiltro] = useState<'PENDIENTE' | 'CONFIRMADO' | 'ANULADO'>('PENDIENTE');

  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState<'TODOS' | 'INGRESO' | 'EGRESO'>('TODOS');
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  // Modal registrar movimiento
  const [showModal, setShowModal] = useState(false);
  const [tipoMovimiento, setTipoMovimiento] = useState<'GASTO' | 'RETIRO' | 'DEPOSITO' | 'TRANSFERENCIA' | 'INGRESO_MANUAL' | 'RETIRO_BANCO'>('GASTO');
  const [monto, setMonto] = useState('');
  const [concepto, setConcepto] = useState('');
  const [cuentaDestino, setCuentaDestino] = useState('');
  const [cuentaOrigen, setCuentaOrigen] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [aCajaChica, setACajaChica] = useState(false);

  // Modal confirmación
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [movimientoAConfirmar, setMovimientoAConfirmar] = useState<{ id: number; tipo: 'caja' | 'banco'; mov: Movimiento } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');

      if (!token) {
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

    } catch (err: any) {
      console.error('Error loading data:', err);
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      } else {
        setError('Error al cargar los datos. Intenta actualizar la página.');
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
      setShowConfirmModal(false);
      setMovimientoAConfirmar(null);
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
      setShowConfirmModal(false);
      setMovimientoAConfirmar(null);
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

  const solicitarConfirmacion = (id: number, tipo: 'caja' | 'banco', mov: Movimiento) => {
    setMovimientoAConfirmar({ id, tipo, mov });
    setShowConfirmModal(true);
  };

  const ejecutarConfirmacion = () => {
    if (!movimientoAConfirmar) return;
    if (movimientoAConfirmar.tipo === 'caja') {
      confirmarMovimientoCaja(movimientoAConfirmar.id);
    } else {
      confirmarMovimientoBanco(movimientoAConfirmar.id);
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
        await axios.post(`${API_URL}/caja/caja-chica/movimiento`, {
          tipo_movimiento: 'EGRESO',
          monto: montoNum,
          concepto,
          categoria: tipoMovimiento === 'GASTO' ? 'Gasto' : 'Retiro',
          realizado_por: usuario,
          observaciones: observaciones || null
        }, config);
      } else if (tipoMovimiento === 'INGRESO_MANUAL') {
        await axios.post(`${API_URL}/caja/caja-chica/movimiento`, {
          tipo_movimiento: 'INGRESO',
          monto: montoNum,
          concepto,
          categoria: 'Ingreso Manual',
          realizado_por: usuario,
          observaciones: observaciones || null
        }, config);
      } else if (tipoMovimiento === 'RETIRO_BANCO') {
        if (!cuentaOrigen) { alert('Selecciona la cuenta bancaria'); return; }
        await axios.post(`${API_URL}/caja/retiro-banco`, {
          cuenta_id: parseInt(cuentaOrigen),
          monto: montoNum,
          concepto,
          a_caja_chica: aCajaChica,
          realizado_por: usuario,
          observaciones: observaciones || null
        }, config);
      } else if (tipoMovimiento === 'DEPOSITO') {
        if (!cuentaDestino) { alert('Selecciona una cuenta bancaria de destino'); return; }
        await axios.post(`${API_URL}/caja/depositar-banco`, {
          cuenta_id: parseInt(cuentaDestino),
          monto: montoNum,
          concepto,
          realizado_por: usuario,
          observaciones: observaciones || null
        }, config);
      } else if (tipoMovimiento === 'TRANSFERENCIA') {
        if (!cuentaOrigen || !cuentaDestino) { alert('Selecciona ambas cuentas bancarias'); return; }
        if (cuentaOrigen === cuentaDestino) { alert('La cuenta de origen y destino deben ser diferentes'); return; }
        await axios.post(`${API_URL}/caja/transferencia-bancos`, {
          cuenta_origen_id: parseInt(cuentaOrigen),
          cuenta_destino_id: parseInt(cuentaDestino),
          monto: montoNum,
          concepto,
          realizado_por: usuario,
          observaciones: observaciones || null
        }, config);
      }

      setShowModal(false);
      setMonto(''); setConcepto(''); setObservaciones('');
      setCuentaDestino(''); setCuentaOrigen(''); setACajaChica(false);
      loadData();
    } catch (error: any) {
      console.error('Error registrando movimiento:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      } else if (error.response?.data?.message) {
        alert(error.response.data.message);
      } else {
        alert('Error al registrar movimiento');
      }
    }
  };

  const totalBancos = cuentasBancarias.reduce((sum, c) => sum + Number(c.saldo_actual || 0), 0);

  const pendientesCaja = movimientosCaja.filter(m => m.estado === 'PENDIENTE').length;
  const pendientesBancos = movimientosBancos.filter(m => m.estado === 'PENDIENTE').length;
  const anuladosCaja = movimientosCaja.filter(m => m.estado === 'ANULADO').length;
  const anuladosBancos = movimientosBancos.filter(m => m.estado === 'ANULADO').length;

  const aplicarFiltros = (movs: Movimiento[]) =>
    movs.filter(m => {
      const matchEstado = m.estado === estadoFiltro;
      const matchTipo = tipoFiltro === 'TODOS' || m.tipo_movimiento === tipoFiltro;
      const matchBusqueda = !busqueda || m.concepto.toLowerCase().includes(busqueda.toLowerCase());
      return matchEstado && matchTipo && matchBusqueda;
    });

  const movsCajaFiltrados = aplicarFiltros(movimientosCaja);
  const movsBancosFiltrados = aplicarFiltros(movimientosBancos);

  const abrirModal = (tipo: typeof tipoMovimiento) => {
    setTipoMovimiento(tipo);
    setMonto(''); setConcepto(''); setObservaciones('');
    setCuentaDestino(''); setCuentaOrigen(''); setACajaChica(false);
    setShowModal(true);
  };

  // ─── Loading skeleton ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-16 bg-slate-200 rounded-xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-slate-200 rounded-xl" />)}
        </div>
        <div className="h-64 bg-slate-200 rounded-xl" />
      </div>
    );
  }

  // ─── Error state ─────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <AlertCircle size={48} className="text-red-400" />
        <p className="text-slate-600">{error}</p>
        <Button onClick={loadData}><RefreshCw size={16} className="mr-2" />Reintentar</Button>
      </div>
    );
  }

  // ─── JSX ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

        {/* ── HEADER ─────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800">Caja y Bancos</h1>
            <p className="text-slate-500 text-sm mt-1">Control de efectivo, cuentas bancarias y movimientos financieros</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={loadData} className="text-sm">
              <RefreshCw size={15} className="mr-1.5" />Actualizar
            </Button>
            <Button
              onClick={() => abrirModal('GASTO')}
              className="bg-slate-800 hover:bg-slate-900 text-sm"
            >
              <Plus size={16} className="mr-1.5" />Registrar movimiento
            </Button>
          </div>
        </div>

        {/* ── TARJETAS RESUMEN ───────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Caja Chica</p>
                <p className="text-xl md:text-2xl font-bold text-slate-800 mt-1">
                  Q{Number(saldoCajaChica.saldo || 0).toFixed(2)}
                </p>
                <p className="text-xs text-slate-400 mt-1">Saldo confirmado</p>
              </div>
              <div className="bg-emerald-50 p-2 rounded-xl">
                <Wallet size={20} className="text-emerald-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 md:p-5 border border-amber-200 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-amber-600 uppercase tracking-wide">Pendientes Caja</p>
                <p className="text-xl md:text-2xl font-bold text-amber-700 mt-1">{pendientesCaja}</p>
                <p className="text-xs text-slate-400 mt-1">Por confirmar</p>
              </div>
              <div className="bg-amber-50 p-2 rounded-xl">
                <Clock size={20} className="text-amber-500" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Bancos</p>
                <p className="text-xl md:text-2xl font-bold text-slate-800 mt-1">Q{totalBancos.toFixed(2)}</p>
                <p className="text-xs text-slate-400 mt-1">{cuentasBancarias.length} cuenta{cuentasBancarias.length !== 1 ? 's' : ''}</p>
              </div>
              <div className="bg-blue-50 p-2 rounded-xl">
                <Landmark size={20} className="text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Pendientes Bancos</p>
                <p className="text-xl md:text-2xl font-bold text-slate-800 mt-1">{pendientesBancos}</p>
                <p className="text-xs text-slate-400 mt-1">Por confirmar</p>
              </div>
              <div className="bg-violet-50 p-2 rounded-xl">
                <Clock size={20} className="text-violet-500" />
              </div>
            </div>
          </div>
        </div>

        {/* ── ACCIONES RÁPIDAS ──────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Acciones rápidas</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            {[
              { label: 'Registrar gasto', icon: <ArrowDownCircle size={18} />, color: 'hover:bg-red-50 hover:border-red-200 hover:text-red-700', tipo: 'GASTO' as const },
              { label: 'Registrar retiro', icon: <TrendingDown size={18} />, color: 'hover:bg-orange-50 hover:border-orange-200 hover:text-orange-700', tipo: 'RETIRO' as const },
              { label: 'Retiro de banco', icon: <Building2 size={18} />, color: 'hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700', tipo: 'RETIRO_BANCO' as const },
              { label: 'Depósito a banco', icon: <ArrowUpCircle size={18} />, color: 'hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700', tipo: 'DEPOSITO' as const },
              { label: 'Transferencia', icon: <ArrowRightLeft size={18} />, color: 'hover:bg-violet-50 hover:border-violet-200 hover:text-violet-700', tipo: 'TRANSFERENCIA' as const },
              { label: 'Ingreso manual', icon: <Banknote size={18} />, color: 'hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700', tipo: 'INGRESO_MANUAL' as const },
            ].map(({ label, icon, color, tipo }) => (
              <button
                key={tipo}
                onClick={() => abrirModal(tipo)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 text-xs font-medium transition-all ${color} active:scale-95`}
              >
                {icon}
                <span className="text-center leading-tight">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── NAVEGACIÓN PRINCIPAL ──────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Pestañas principales */}
          <div className="flex border-b border-slate-200">
            {[
              { key: 'caja', label: 'Caja Chica', icon: <Wallet size={16} />, badge: pendientesCaja },
              { key: 'bancos', label: 'Bancos', icon: <Landmark size={16} />, badge: pendientesBancos },
            ].map(({ key, label, icon, badge }) => (
              <button
                key={key}
                onClick={() => setVistaActual(key as 'caja' | 'bancos')}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition-colors flex-1 sm:flex-none justify-center sm:justify-start ${
                  vistaActual === key
                    ? 'border-slate-800 text-slate-800 bg-slate-50'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                {icon}
                {label}
                {badge > 0 && (
                  <span className="bg-amber-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                    {badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Sub-pestañas estado */}
          <div className="flex gap-1 p-3 border-b border-slate-100 bg-slate-50 flex-wrap">
            {([
              { key: 'PENDIENTE', label: 'Pendientes de confirmar', icon: <Clock size={14} />, activeClass: 'bg-amber-100 text-amber-800 border border-amber-300', count: vistaActual === 'caja' ? pendientesCaja : pendientesBancos },
              { key: 'CONFIRMADO', label: 'Confirmados', icon: <ShieldCheck size={14} />, activeClass: 'bg-emerald-100 text-emerald-800 border border-emerald-300', count: null },
              { key: 'ANULADO', label: 'Anulados', icon: <X size={14} />, activeClass: 'bg-red-100 text-red-700 border border-red-300', count: vistaActual === 'caja' ? anuladosCaja : anuladosBancos },
            ] as const).map(({ key, label, icon, activeClass, count }) => (
              <button
                key={key}
                onClick={() => setEstadoFiltro(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  estadoFiltro === key
                    ? activeClass
                    : 'text-slate-500 hover:bg-white border border-transparent hover:border-slate-200'
                }`}
              >
                {icon}{label}
                {count != null && count > 0 && (
                  <span className="ml-1 font-bold">({count})</span>
                )}
              </button>
            ))}

            {/* Filtros */}
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => setMostrarFiltros(v => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:bg-white border border-transparent hover:border-slate-200 transition-all"
              >
                <Filter size={13} />Filtros
                <ChevronDown size={13} className={`transition-transform ${mostrarFiltros ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>

          {/* Barra de filtros expandible */}
          {mostrarFiltros && (
            <div className="flex flex-col sm:flex-row gap-2 p-3 border-b border-slate-100 bg-white">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por concepto..."
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-slate-300 focus:border-transparent outline-none"
                />
              </div>
              <select
                value={tipoFiltro}
                onChange={e => setTipoFiltro(e.target.value as typeof tipoFiltro)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-slate-300 outline-none bg-white"
              >
                <option value="TODOS">Todos los tipos</option>
                <option value="INGRESO">Solo ingresos</option>
                <option value="EGRESO">Solo egresos</option>
              </select>
              {(busqueda || tipoFiltro !== 'TODOS') && (
                <button
                  onClick={() => { setBusqueda(''); setTipoFiltro('TODOS'); }}
                  className="flex items-center gap-1 px-3 py-2 text-xs text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg"
                >
                  <X size={13} />Limpiar
                </button>
              )}
            </div>
          )}

          {/* ── VISTA CAJA CHICA ─────────────────────────────────────── */}
          {vistaActual === 'caja' && (
            <MovimientosPanel
              movimientos={movsCajaFiltrados}
              estadoFiltro={estadoFiltro}
              onConfirmar={(mov) => solicitarConfirmacion(mov.id, 'caja', mov)}
            />
          )}

          {/* ── VISTA BANCOS ─────────────────────────────────────────── */}
          {vistaActual === 'bancos' && (
            <div>
              {/* Cards de cuentas bancarias */}
              <div className="p-4 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Cuentas bancarias</p>
                {cuentasBancarias.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4">No hay cuentas bancarias registradas.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {cuentasBancarias.map(cuenta => (
                      <div key={cuenta.id} className={`rounded-xl border p-4 ${cuenta.activa ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-slate-50 opacity-60'}`}>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="bg-blue-100 p-1.5 rounded-lg">
                              <CreditCard size={16} className="text-blue-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-sm text-slate-800">{cuenta.nombre}</p>
                              <p className="text-xs text-slate-500">{cuenta.tipo_cuenta}</p>
                            </div>
                          </div>
                          {cuenta.activa ? (
                            <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Activa</span>
                          ) : (
                            <span className="text-[10px] font-semibold bg-slate-200 text-slate-500 px-2 py-0.5 rounded-full">Inactiva</span>
                          )}
                        </div>
                        {cuenta.numero_cuenta && (
                          <p className="text-xs text-slate-500 mb-1">N°: {cuenta.numero_cuenta}</p>
                        )}
                        {cuenta.pos_asociado && (
                          <p className="text-xs text-slate-500 mb-2">POS: {cuenta.pos_asociado}</p>
                        )}
                        <div className="border-t border-blue-200 pt-2 mt-2">
                          <p className="text-xs text-slate-500">Saldo confirmado</p>
                          <p className="text-lg font-bold text-blue-700">Q{Number(cuenta.saldo_actual || 0).toFixed(2)}</p>
                          {(() => {
                            const pendMonto = movimientosBancos
                              .filter(m => m.cuenta_id === cuenta.id && m.estado === 'PENDIENTE' && m.tipo_movimiento === 'INGRESO')
                              .reduce((sum, m) => sum + Number(m.monto || 0), 0);
                            return pendMonto > 0 ? (
                              <p className="text-xs text-amber-600 font-medium mt-0.5">+ Q{pendMonto.toFixed(2)} pendiente por confirmar</p>
                            ) : null;
                          })()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Movimientos bancos */}
              <MovimientosPanel
                movimientos={movsBancosFiltrados}
                estadoFiltro={estadoFiltro}
                onConfirmar={(mov) => solicitarConfirmacion(mov.id, 'banco', mov)}
                mostrarBanco
              />
            </div>
          )}
        </div>

      {/* ── MODAL REGISTRAR MOVIMIENTO ──────────────────────────────────────── */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={
          tipoMovimiento === 'GASTO' ? 'Registrar Gasto' :
          tipoMovimiento === 'RETIRO' ? 'Registrar Retiro de Caja' :
          tipoMovimiento === 'RETIRO_BANCO' ? 'Retiro de Banco' :
          tipoMovimiento === 'DEPOSITO' ? 'Depósito de Caja a Banco' :
          tipoMovimiento === 'TRANSFERENCIA' ? 'Transferencia entre Bancos' :
          'Ingreso Manual'
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Monto (Q)</label>
            <Input type="number" step="0.01" value={monto} onChange={e => setMonto(e.target.value)} placeholder="0.00" className="w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Concepto</label>
            <Input type="text" value={concepto} onChange={e => setConcepto(e.target.value)} placeholder="Descripción del movimiento" className="w-full" />
          </div>

          {tipoMovimiento === 'DEPOSITO' && (
            <>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-sm text-emerald-700 font-medium">
                Saldo caja chica disponible: <span className="font-bold">Q{Number(saldoCajaChica.saldo || 0).toFixed(2)}</span>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cuenta bancaria de destino</label>
                <Select value={cuentaDestino} onChange={e => setCuentaDestino(e.target.value)} className="w-full">
                  <option value="">Seleccione una cuenta...</option>
                  {cuentasBancarias.map(c => <option key={c.id} value={c.id}>{c.nombre} {c.pos_asociado ? `(${c.pos_asociado})` : ''}</option>)}
                </Select>
              </div>
            </>
          )}

          {tipoMovimiento === 'RETIRO_BANCO' && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cuenta bancaria</label>
                <Select value={cuentaOrigen} onChange={e => setCuentaOrigen(e.target.value)} className="w-full">
                  <option value="">Seleccione una cuenta...</option>
                  {cuentasBancarias.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} — Q{Number(c.saldo_actual || 0).toFixed(2)}
                    </option>
                  ))}
                </Select>
              </div>
              {cuentaOrigen && (() => {
                const cuenta = cuentasBancarias.find(c => c.id === parseInt(cuentaOrigen));
                return cuenta ? (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 text-sm text-blue-700 font-medium">
                    Saldo disponible: <span className="font-bold">Q{Number(cuenta.saldo_actual || 0).toFixed(2)}</span>
                  </div>
                ) : null;
              })()}
              <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700 font-medium select-none">
                <input
                  type="checkbox"
                  checked={aCajaChica}
                  onChange={e => setACajaChica(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-emerald-600"
                />
                Ingresar monto a caja chica
              </label>
            </>
          )}

          {tipoMovimiento === 'TRANSFERENCIA' && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cuenta de origen</label>
                <Select value={cuentaOrigen} onChange={e => setCuentaOrigen(e.target.value)} className="w-full">
                  <option value="">Seleccione cuenta origen...</option>
                  {cuentasBancarias.map(c => <option key={c.id} value={c.id}>{c.nombre} — Q{Number(c.saldo_actual || 0).toFixed(2)}</option>)}
                </Select>
              </div>
              <div className="flex items-center justify-center text-slate-400"><ArrowRightLeft size={20} /></div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cuenta de destino</label>
                <Select value={cuentaDestino} onChange={e => setCuentaDestino(e.target.value)} className="w-full">
                  <option value="">Seleccione cuenta destino...</option>
                  {cuentasBancarias.filter(c => c.id.toString() !== cuentaOrigen).map(c => <option key={c.id} value={c.id}>{c.nombre} — Q{Number(c.saldo_actual || 0).toFixed(2)}</option>)}
                </Select>
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Observaciones (opcional)</label>
            <textarea
              value={observaciones}
              onChange={e => setObservaciones(e.target.value)}
              placeholder="Notas adicionales..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              rows={2}
            />
          </div>

          {/* Resumen */}
          {monto && parseFloat(monto) > 0 && (
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Tipo</span>
                <span className="font-medium">
                  {tipoMovimiento === 'GASTO' && 'Gasto de Caja Chica'}
                  {tipoMovimiento === 'RETIRO' && 'Retiro de Caja Chica'}
                  {tipoMovimiento === 'RETIRO_BANCO' && 'Retiro de Banco'}
                  {tipoMovimiento === 'DEPOSITO' && 'Depósito a Banco'}
                  {tipoMovimiento === 'TRANSFERENCIA' && 'Transferencia Bancaria'}
                  {tipoMovimiento === 'INGRESO_MANUAL' && 'Ingreso Manual'}
                </span>
              </div>
              <div className="flex justify-between items-center border-t border-slate-200 pt-1 mt-1">
                <span className="text-slate-500">Monto</span>
                <span className="font-bold text-lg text-slate-800">Q{parseFloat(monto).toFixed(2)}</span>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowModal(false)} className="flex-1">Cancelar</Button>
            <Button
              onClick={handleRegistrarMovimiento}
              className={`flex-1 ${
                tipoMovimiento === 'GASTO' ? 'bg-red-600 hover:bg-red-700' :
                tipoMovimiento === 'RETIRO' ? 'bg-orange-600 hover:bg-orange-700' :
                tipoMovimiento === 'RETIRO_BANCO' ? 'bg-rose-600 hover:bg-rose-700' :
                tipoMovimiento === 'DEPOSITO' ? 'bg-blue-600 hover:bg-blue-700' :
                tipoMovimiento === 'TRANSFERENCIA' ? 'bg-violet-600 hover:bg-violet-700' :
                'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              Confirmar registro
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── MODAL CONFIRMAR MOVIMIENTO ──────────────────────────────────────── */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => { setShowConfirmModal(false); setMovimientoAConfirmar(null); }}
        title="¿Confirmar este movimiento?"
      >
        {movimientoAConfirmar && (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
              Al confirmar, el monto afectará el saldo disponible y no podrá revertirse desde esta pantalla.
            </div>
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Concepto</span>
                <span className="font-medium text-right max-w-[60%]">{movimientoAConfirmar.mov.concepto}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tipo</span>
                <span className={`font-semibold ${movimientoAConfirmar.mov.tipo_movimiento === 'INGRESO' ? 'text-emerald-600' : 'text-red-600'}`}>
                  {movimientoAConfirmar.mov.tipo_movimiento}
                </span>
              </div>
              <div className="flex justify-between items-center border-t border-slate-200 pt-2">
                <span className="text-slate-500">Monto</span>
                <span className="font-bold text-lg">Q{Number(movimientoAConfirmar.mov.monto || 0).toFixed(2)}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => { setShowConfirmModal(false); setMovimientoAConfirmar(null); }} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={ejecutarConfirmacion} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                <Check size={16} className="mr-1.5" />Confirmar movimiento
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ─── Subcomponente: panel de movimientos (tabla en desktop, cards en móvil) ───
interface MovimientosPanelProps {
  movimientos: Movimiento[];
  estadoFiltro: 'PENDIENTE' | 'CONFIRMADO' | 'ANULADO';
  onConfirmar: (mov: Movimiento) => void;
  mostrarBanco?: boolean;
}

function MovimientosPanel({ movimientos, estadoFiltro, onConfirmar, mostrarBanco }: MovimientosPanelProps) {
  const fmtFecha = (fecha: string) => new Date(fecha).toLocaleDateString('es-GT', { day: '2-digit', month: 'short', year: 'numeric' });

  if (movimientos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-14 px-4 text-center">
        <FileText size={40} className="text-slate-300 mb-3" />
        <p className="text-slate-500 font-medium">
          {estadoFiltro === 'PENDIENTE'
            ? 'No hay movimientos pendientes de confirmar'
            : estadoFiltro === 'ANULADO'
            ? 'No hay movimientos anulados'
            : 'No hay movimientos confirmados'}
        </p>
        <p className="text-slate-400 text-sm mt-1">Los movimientos aparecerán aquí cuando se registren.</p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop: tabla */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Fecha</th>
              {mostrarBanco && <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Banco</th>}
              <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Concepto</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Categoría</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Tipo</th>
              <th className="text-right px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Monto</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Estado</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Realizado por</th>
              {estadoFiltro === 'PENDIENTE' && <th className="px-4 py-3" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {movimientos.map(mov => (
              <tr key={mov.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{fmtFecha(mov.fecha_movimiento)}</td>
                {mostrarBanco && <td className="px-4 py-3 font-medium text-slate-700">{mov.cuenta_nombre || '—'}</td>}
                <td className="px-4 py-3 max-w-xs">
                  <p className="font-medium text-slate-800 truncate">{mov.concepto}</p>
                  {mov.venta_id && <p className="text-xs text-slate-400">Venta #{mov.venta_id}</p>}
                  {mov.numero_referencia && <p className="text-xs text-slate-400">Ref: {mov.numero_referencia}</p>}
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">{mov.categoria || '—'}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md ${
                    mov.tipo_movimiento === 'INGRESO'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-red-50 text-red-700'
                  }`}>
                    {mov.tipo_movimiento === 'INGRESO' ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                    {mov.tipo_movimiento}
                  </span>
                </td>
                <td className={`px-4 py-3 text-right font-bold tabular-nums ${
                  mov.tipo_movimiento === 'INGRESO' ? 'text-emerald-600' : 'text-red-600'
                }`}>
                  {mov.tipo_movimiento === 'INGRESO' ? '+' : '−'}Q{Number(mov.monto || 0).toFixed(2)}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                    mov.estado === 'PENDIENTE'
                      ? 'bg-amber-50 text-amber-700'
                      : mov.estado === 'ANULADO'
                      ? 'bg-red-50 text-red-600'
                      : 'bg-emerald-50 text-emerald-700'
                  }`}>
                    {mov.estado}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">{mov.realizado_por || '—'}</td>
                {estadoFiltro === 'PENDIENTE' && (
                  <td className="px-4 py-3">
                    <button
                      onClick={() => onConfirmar(mov)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors"
                    >
                      <Check size={13} />Confirmar
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: cards */}
      <div className="md:hidden divide-y divide-slate-100">
        {movimientos.map(mov => (
          <div key={mov.id} className="p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 text-sm truncate">{mov.concepto}</p>
                {mostrarBanco && mov.cuenta_nombre && (
                  <p className="text-xs text-slate-500">{mov.cuenta_nombre}</p>
                )}
                <p className="text-xs text-slate-400 mt-0.5">{fmtFecha(mov.fecha_movimiento)}</p>
              </div>
              <div className="text-right shrink-0">
                <p className={`font-bold text-base tabular-nums ${mov.tipo_movimiento === 'INGRESO' ? 'text-emerald-600' : 'text-red-600'}`}>
                  {mov.tipo_movimiento === 'INGRESO' ? '+' : '−'}Q{Number(mov.monto || 0).toFixed(2)}
                </p>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${
                  mov.estado === 'PENDIENTE' ? 'bg-amber-50 text-amber-700' : mov.estado === 'ANULADO' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'
                }`}>
                  {mov.estado}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                mov.tipo_movimiento === 'INGRESO' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
              }`}>
                {mov.tipo_movimiento === 'INGRESO' ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                {mov.tipo_movimiento}
              </span>
              {mov.categoria && (
                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">{mov.categoria}</span>
              )}
              {mov.realizado_por && (
                <span className="text-[10px] text-slate-400">{mov.realizado_por}</span>
              )}
            </div>
            {estadoFiltro === 'PENDIENTE' && (
              <button
                onClick={() => onConfirmar(mov)}
                className="w-full flex items-center justify-center gap-1.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors active:scale-95"
              >
                <Check size={14} />Confirmar movimiento
              </button>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

