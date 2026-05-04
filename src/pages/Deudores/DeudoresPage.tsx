import { useEffect, useState } from 'react';
import {
  Users, Plus, Search, RefreshCw, AlertCircle,
  DollarSign, CheckCircle, Clock, TrendingDown,
  Eye, Ban, CreditCard, X, ChevronDown,
} from 'lucide-react';
import { deudoresService, Deudor, DeudoresResumen } from '../../services/deudoresService';
import { useAuth } from '../../store/useAuth';
import CustomerPicker from '../../components/customers/CustomerPicker';
import type { Customer } from '../../types/customer';

// ── Helpers ───────────────────────────────────────────────────────────────
const fmt = (v: number | string) =>
  `Q${Number(v || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const ESTADO_BADGE: Record<string, string> = {
  PENDIENTE: 'bg-amber-100 text-amber-700',
  PARCIAL:   'bg-blue-100 text-blue-700',
  PAGADO:    'bg-emerald-100 text-emerald-700',
  ANULADO:   'bg-slate-100 text-slate-500',
};

// ── Modal Nuevo Crédito ───────────────────────────────────────────────────
function ModalNuevo({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { user } = useAuth();
  const [cliente, setCliente] = useState<Customer | undefined>();
  const [form, setForm] = useState({ descripcion: '', monto_total: '', fecha_vencimiento: '', notas: '' });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const handleSubmit = async () => {
    if (!cliente) { setErr('Selecciona un cliente'); return; }
    if (!form.monto_total || parseFloat(form.monto_total) <= 0) { setErr('El monto debe ser mayor a 0'); return; }
    setLoading(true); setErr('');
    try {
      await deudoresService.create({
        cliente_id: cliente.id ? parseInt(String(cliente.id)) : null,
        cliente_nombre: cliente.nombre || `${cliente.firstName || ''} ${cliente.lastName || ''}`.trim(),
        cliente_telefono: cliente.telefono || cliente.phone,
        descripcion: form.descripcion,
        monto_total: parseFloat(form.monto_total),
        fecha_vencimiento: form.fecha_vencimiento || undefined,
        notas: form.notas,
        created_by: user?.username || user?.nombre || 'Sistema',
      });
      onCreated();
      onClose();
    } catch (e: any) {
      setErr(e?.response?.data?.error || 'Error al crear el crédito');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">Nuevo crédito interno</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          {err && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}

          <div>
            <label className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-1 block">Cliente *</label>
            <CustomerPicker value={cliente} onChange={setCliente} allowCreate placeholder="Buscar cliente..." />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-1 block">Descripción</label>
            <input
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Ej: Venta a crédito, Reparación fiada..."
              value={form.descripcion}
              onChange={e => setForm({ ...form, descripcion: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-1 block">Monto total (Q) *</label>
              <input
                type="number" min="0" step="0.01"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="0.00"
                value={form.monto_total}
                onChange={e => setForm({ ...form, monto_total: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-1 block">Fecha vencimiento</label>
              <input
                type="date"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 text-slate-800 bg-white"
                value={form.fecha_vencimiento}
                onChange={e => setForm({ ...form, fecha_vencimiento: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-1 block">Notas</label>
            <textarea
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              rows={2} placeholder="Observaciones opcionales..."
              value={form.notas}
              onChange={e => setForm({ ...form, notas: e.target.value })}
            />
          </div>
        </div>
        <div className="flex gap-3 px-6 pb-5">
          <button onClick={onClose} className="flex-1 border border-slate-300 rounded-xl py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancelar</button>
          <button
            onClick={handleSubmit} disabled={loading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50"
          >
            {loading ? 'Guardando...' : 'Crear crédito'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal Registrar Pago ──────────────────────────────────────────────────
function ModalPago({ deudor, onClose, onPaid }: { deudor: Deudor; onClose: () => void; onPaid: () => void }) {
  const { user } = useAuth();
  const [monto, setMonto] = useState(String(Number(deudor.saldo_pendiente).toFixed(2)));
  const [metodo, setMetodo] = useState('EFECTIVO');
  const [referencia, setReferencia] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const handlePagar = async () => {
    const montoNum = parseFloat(monto);
    if (!montoNum || montoNum <= 0) { setErr('Ingresa un monto válido'); return; }
    setLoading(true); setErr('');
    try {
      await deudoresService.registrarPago(deudor.id, {
        monto: montoNum,
        metodo_pago: metodo,
        referencia,
        realizado_por: user?.username || user?.nombre || 'Sistema',
      });
      onPaid(); onClose();
    } catch (e: any) {
      setErr(e?.response?.data?.error || 'Error al registrar el pago');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">Registrar pago</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          {err && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
          <div className="bg-slate-50 rounded-xl p-3 text-sm">
            <p className="font-medium text-slate-800">{deudor.cliente_nombre}</p>
            <p className="text-slate-500 mt-0.5">Saldo pendiente: <span className="font-semibold text-red-600">{fmt(deudor.saldo_pendiente)}</span></p>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-1 block">Monto a abonar (Q)</label>
            <input
              type="number" min="0.01" step="0.01"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              value={monto}
              onChange={e => setMonto(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-1 block">Método</label>
              <select
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
                value={metodo} onChange={e => setMetodo(e.target.value)}
              >
                <option value="EFECTIVO">Efectivo</option>
                <option value="TRANSFERENCIA">Transferencia</option>
                <option value="TARJETA_BAC">Tarjeta BAC</option>
                <option value="TARJETA_NEONET">Tarjeta Neonet</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-1 block">Referencia</label>
              <input
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                placeholder="Opcional"
                value={referencia} onChange={e => setReferencia(e.target.value)}
              />
            </div>
          </div>
        </div>
        <div className="flex gap-3 px-6 pb-5">
          <button onClick={onClose} className="flex-1 border border-slate-300 rounded-xl py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancelar</button>
          <button
            onClick={handlePagar} disabled={loading}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50"
          >
            {loading ? 'Registrando...' : 'Registrar pago'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal Detalle ─────────────────────────────────────────────────────────
function ModalDetalle({ deudor: initial, onClose, onAction }: { deudor: Deudor; onClose: () => void; onAction: () => void }) {
  const [deudor, setDeudor] = useState<Deudor>(initial);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    deudoresService.getById(initial.id).then(d => { setDeudor(d); setLoading(false); }).catch(() => setLoading(false));
  }, [initial.id]);

  const porcentaje = deudor.monto_total > 0
    ? Math.min(100, (Number(deudor.monto_pagado) / Number(deudor.monto_total)) * 100)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white">
          <h2 className="text-lg font-semibold text-slate-800">{deudor.numero_credito}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X size={18} /></button>
        </div>
        {loading ? (
          <div className="p-10 text-center text-slate-400">Cargando...</div>
        ) : (
          <div className="p-6 space-y-5">
            {/* Info cliente */}
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="font-semibold text-slate-800">{deudor.cliente_nombre}</p>
              {deudor.cliente_telefono && <p className="text-sm text-slate-500 mt-0.5">📞 {deudor.cliente_telefono}</p>}
              {deudor.descripcion && <p className="text-sm text-slate-600 mt-1">{deudor.descripcion}</p>}
            </div>

            {/* Montos */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs text-slate-500 uppercase tracking-wide">Total</p>
                <p className="font-bold text-slate-800 mt-1">{fmt(deudor.monto_total)}</p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-3">
                <p className="text-xs text-emerald-600 uppercase tracking-wide">Pagado</p>
                <p className="font-bold text-emerald-700 mt-1">{fmt(deudor.monto_pagado)}</p>
              </div>
              <div className="bg-red-50 rounded-xl p-3">
                <p className="text-xs text-red-500 uppercase tracking-wide">Pendiente</p>
                <p className="font-bold text-red-600 mt-1">{fmt(deudor.saldo_pendiente)}</p>
              </div>
            </div>

            {/* Progreso */}
            <div>
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Progreso de pago</span>
                <span>{porcentaje.toFixed(0)}%</span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${porcentaje}%` }} />
              </div>
            </div>

            {/* Historial pagos */}
            {deudor.pagos && deudor.pagos.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Historial de pagos</p>
                <div className="space-y-2">
                  {deudor.pagos.map(p => (
                    <div key={p.id} className="flex items-center justify-between text-sm bg-slate-50 rounded-lg px-3 py-2">
                      <div>
                        <span className="font-medium text-slate-800">{fmt(p.monto)}</span>
                        <span className="text-slate-400 ml-2">— {p.metodo_pago}</span>
                        {p.referencia && <span className="text-slate-400 ml-1">#{p.referencia}</span>}
                      </div>
                      <span className="text-xs text-slate-400">{new Date(p.fecha_pago).toLocaleDateString('es-GT')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {deudor.notas && (
              <div className="bg-amber-50 rounded-xl p-3">
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Notas</p>
                <p className="text-sm text-amber-800 whitespace-pre-line">{deudor.notas}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Página Principal ──────────────────────────────────────────────────────
export default function DeudoresPage() {
  const [deudores, setDeudores] = useState<Deudor[]>([]);
  const [resumen, setResumen] = useState<DeudoresResumen | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');

  const [showNuevo, setShowNuevo] = useState(false);
  const [pagoTarget, setPagoTarget] = useState<Deudor | null>(null);
  const [detalleTarget, setDetalleTarget] = useState<Deudor | null>(null);

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [data, stats] = await Promise.all([
        deudoresService.getAll({ estado: filtroEstado || undefined, search: search || undefined }),
        deudoresService.getResumen(),
      ]);
      setDeudores(data);
      setResumen(stats);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filtroEstado]);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); load(); };

  const handleAnular = async (d: Deudor) => {
    const motivo = window.prompt(`Motivo para anular el crédito de ${d.cliente_nombre}:`);
    if (!motivo) return;
    try {
      await deudoresService.anular(d.id, motivo);
      load();
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Error al anular');
    }
  };

  const vencido = (d: Deudor) =>
    d.fecha_vencimiento && d.estado !== 'PAGADO' && d.estado !== 'ANULADO' &&
    new Date(d.fecha_vencimiento) < new Date();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800">Deudores / Crédito interno</h1>
          <p className="text-slate-500 text-sm mt-1">Control de créditos y cuentas por cobrar</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="flex items-center gap-1.5 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
            <RefreshCw size={15} />Actualizar
          </button>
          <button
            onClick={() => setShowNuevo(true)}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2 text-sm font-semibold"
          >
            <Plus size={16} />Nuevo crédito
          </button>
        </div>
      </div>

      {/* Resumen cards */}
      {resumen && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total pendiente</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{fmt(resumen.total_pendiente)}</p>
            <p className="text-xs text-slate-400 mt-0.5">{resumen.pendientes + resumen.parciales} créditos activos</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total cobrado</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{fmt(resumen.total_cobrado)}</p>
            <p className="text-xs text-slate-400 mt-0.5">{resumen.pagados} créditos pagados</p>
          </div>
          <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-4">
            <p className="text-xs font-medium text-amber-600 uppercase tracking-wide">Pendientes</p>
            <p className="text-2xl font-bold text-amber-700 mt-1">{resumen.pendientes}</p>
            <p className="text-xs text-slate-400 mt-0.5">Sin abonos</p>
          </div>
          <div className="bg-white rounded-2xl border border-blue-200 shadow-sm p-4">
            <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">Parciales</p>
            <p className="text-2xl font-bold text-blue-700 mt-1">{resumen.parciales}</p>
            <p className="text-xs text-slate-400 mt-0.5">Con abonos</p>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              placeholder="Buscar cliente, número..."
              value={search} onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button type="submit" className="bg-blue-600 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-blue-700">Buscar</button>
        </form>
        <div className="relative">
          <select
            className="appearance-none border border-slate-200 rounded-xl px-4 py-2 pr-8 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 text-slate-700"
            value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
          >
            <option value="">Todos los estados</option>
            <option value="PENDIENTE">Pendientes</option>
            <option value="PARCIAL">Parciales</option>
            <option value="PAGADO">Pagados</option>
            <option value="ANULADO">Anulados</option>
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-slate-400 animate-pulse">Cargando...</div>
        ) : error ? (
          <div className="p-10 text-center flex flex-col items-center gap-2 text-slate-500">
            <AlertCircle size={36} className="text-red-400" />
            <p>{error}</p>
            <button onClick={load} className="text-blue-600 underline text-sm">Reintentar</button>
          </div>
        ) : deudores.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <TrendingDown size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No hay créditos registrados</p>
            <p className="text-sm mt-1">Crea el primero con el botón "Nuevo crédito"</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">N° Crédito</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Cliente</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Total</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Pagado</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Pendiente</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Estado</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Vence</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {deudores.map(d => (
                  <tr key={d.id} className={`hover:bg-slate-50 ${vencido(d) ? 'bg-red-50' : ''}`}>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{d.numero_credito}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{d.cliente_nombre}</p>
                      {d.cliente_telefono && <p className="text-xs text-slate-400">{d.cliente_telefono}</p>}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-700">{fmt(d.monto_total)}</td>
                    <td className="px-4 py-3 text-right text-emerald-600 font-medium">{fmt(d.monto_pagado)}</td>
                    <td className="px-4 py-3 text-right text-red-600 font-semibold">{fmt(d.saldo_pendiente)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${ESTADO_BADGE[d.estado] || 'bg-slate-100 text-slate-500'}`}>
                        {d.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-slate-500">
                      {d.fecha_vencimiento ? (
                        <span className={vencido(d) ? 'text-red-600 font-semibold' : ''}>
                          {new Date(d.fecha_vencimiento).toLocaleDateString('es-GT')}
                          {vencido(d) && ' ⚠️'}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          title="Ver detalle"
                          onClick={() => setDetalleTarget(d)}
                          className="p-1.5 rounded hover:bg-indigo-50 text-indigo-600"
                        ><Eye size={14} /></button>
                        {(d.estado === 'PENDIENTE' || d.estado === 'PARCIAL') && (
                          <button
                            title="Registrar pago"
                            onClick={() => setPagoTarget(d)}
                            className="p-1.5 rounded hover:bg-emerald-50 text-emerald-600"
                          ><CreditCard size={14} /></button>
                        )}
                        {d.estado !== 'ANULADO' && d.estado !== 'PAGADO' && (
                          <button
                            title="Anular"
                            onClick={() => handleAnular(d)}
                            className="p-1.5 rounded hover:bg-red-50 text-red-500"
                          ><Ban size={14} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {showNuevo   && <ModalNuevo   onClose={() => setShowNuevo(false)}   onCreated={load} />}
      {pagoTarget  && <ModalPago    deudor={pagoTarget}  onClose={() => setPagoTarget(null)}  onPaid={load} />}
      {detalleTarget && <ModalDetalle deudor={detalleTarget} onClose={() => setDetalleTarget(null)} onAction={load} />}
    </div>
  );
}
