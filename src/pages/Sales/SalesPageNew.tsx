import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Eye, Printer, FileText, ShoppingBag, DollarSign,
  Calendar, Plus, XCircle, CreditCard, TrendingUp, Clock,
  AlertTriangle, CheckCircle, RefreshCw, Ban
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import QuotePicker from '../../components/sales/QuotePicker';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../store/useAuth';
import * as ventaService from '../../services/ventaService';
import type { VentaData, VentaEstadisticas } from '../../services/ventaService';
import { formatDate } from '../../lib/format';

// ─── Constants ─────────────────────────────────────────────────────────────

const ESTADO_BADGE: Record<string, string> = {
  PAGADA:   'bg-emerald-50 text-emerald-700 border border-emerald-200',
  PENDIENTE:'bg-amber-50  text-amber-700  border border-amber-200',
  PARCIAL:  'bg-blue-50   text-blue-700   border border-blue-200',
  ANULADA:  'bg-red-50    text-red-600    border border-red-200',
};

const METODO_LABEL: Record<string, string> = {
  EFECTIVO:     'Efectivo',
  TARJETA:      'Tarjeta',
  TRANSFERENCIA:'Transferencia',
  MIXTO:        'Mixto',
};

// ─── Helpers ───────────────────────────────────────────────────────────────

function estadoBadge(estado: string) {
  const cls = ESTADO_BADGE[estado] ?? 'bg-gray-100 text-gray-600 border border-gray-200';
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>{estado}</span>;
}

function getDateRange(preset: string): { fecha_desde: string; fecha_hasta: string } | null {
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  if (preset === 'hoy') return { fecha_desde: fmt(today), fecha_hasta: fmt(today) };
  if (preset === 'semana') {
    const mon = new Date(today); mon.setDate(today.getDate() - today.getDay() + 1);
    return { fecha_desde: fmt(mon), fecha_hasta: fmt(today) };
  }
  if (preset === 'mes') {
    const first = new Date(today.getFullYear(), today.getMonth(), 1);
    return { fecha_desde: fmt(first), fecha_hasta: fmt(today) };
  }
  return null;
}

// ─── Component ─────────────────────────────────────────────────────────────

export default function SalesPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();

  // ── data ──
  const [ventas, setVentas] = useState<VentaData[]>([]);
  const [stats, setStats] = useState<VentaEstadisticas | null>(null);
  const [loading, setLoading] = useState(false);

  // ── filters ──
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [filterMetodo, setFilterMetodo] = useState('');
  const [filterDate, setFilterDate] = useState('');          // preset: hoy/semana/mes
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  // ── modals ──
  const [selectedVenta, setSelectedVenta] = useState<VentaData | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showPagoModal, setShowPagoModal] = useState(false);
  const [showAnularDialog, setShowAnularDialog] = useState(false);
  const [showQuotePicker, setShowQuotePicker] = useState(false);
  const [anularTarget, setAnularTarget] = useState<VentaData | null>(null);
  const [motivo, setMotivo] = useState('');

  // ── pago form ──
  const [pagoMonto, setPagoMonto] = useState('');
  const [pagoMetodo, setPagoMetodo] = useState('EFECTIVO');
  const [pagoRef, setPagoRef] = useState('');
  const [pagoLoading, setPagoLoading] = useState(false);

  // ── Load ────────────────────────────────────────────────────────────────

  const loadVentas = useCallback(async () => {
    setLoading(true);
    try {
      const dateRange = filterDate ? getDateRange(filterDate) : null;
      const filters: ventaService.VentaFilters = {
        ...(filterEstado && { estado: filterEstado }),
        ...(filterMetodo && { metodo_pago: filterMetodo }),
        ...(search        && { search }),
        ...(dateRange     && { fecha_desde: dateRange.fecha_desde, fecha_hasta: dateRange.fecha_hasta }),
        ...(!filterDate && fechaDesde && { fecha_desde: fechaDesde }),
        ...(!filterDate && fechaHasta && { fecha_hasta: fechaHasta }),
      };
      const data = await ventaService.getAllVentas(filters);
      setVentas(data);
    } catch {
      toast.add('Error al cargar ventas', 'error');
    } finally {
      setLoading(false);
    }
  }, [filterEstado, filterMetodo, search, filterDate, fechaDesde, fechaHasta, toast]);

  const loadStats = useCallback(async () => {
    try {
      const data = await ventaService.getEstadisticas();
      setStats(data);
    } catch {
      // stats are non-critical
    }
  }, []);

  useEffect(() => {
    loadVentas();
    loadStats();
  }, [loadVentas, loadStats]);

  // ── Actions ─────────────────────────────────────────────────────────────

  const openDetail = (v: VentaData) => { setSelectedVenta(v); setShowDetail(true); };

  const openPago = (v: VentaData) => {
    setSelectedVenta(v);
    const saldo = (v.saldo_pendiente ?? (v.total - (v.monto_pagado ?? 0)));
    setPagoMonto((saldo / 100).toFixed(2));
    setPagoMetodo('EFECTIVO');
    setPagoRef('');
    setShowPagoModal(true);
  };

  const openAnular = (v: VentaData) => {
    setAnularTarget(v);
    setMotivo('');
    setShowAnularDialog(true);
  };

  const handleRegistrarPago = async () => {
    if (!selectedVenta) return;
    if (!pagoMonto || parseFloat(pagoMonto) <= 0) { toast.add('Ingresa un monto válido', 'error'); return; }
    setPagoLoading(true);
    try {
      await ventaService.registrarPago(selectedVenta.id!, {
        monto: parseFloat(pagoMonto),
        metodo: pagoMetodo,
        referencia: pagoRef || undefined,
        usuario_id: user?.id,
      });
      toast.add('Pago registrado correctamente', 'success');
      setShowPagoModal(false);
      setShowDetail(false);
      await Promise.all([loadVentas(), loadStats()]);
    } catch (err: any) {
      toast.add(err?.response?.data?.error ?? 'Error al registrar pago', 'error');
    } finally {
      setPagoLoading(false);
    }
  };

  const handleAnular = async () => {
    if (!anularTarget) return;
    if (!motivo.trim()) { toast.add('Ingresa el motivo de anulación', 'error'); return; }
    try {
      await ventaService.anularVenta(anularTarget.id!, { motivo, usuario_id: user?.id });
      toast.add('Venta anulada correctamente', 'success');
      setShowAnularDialog(false);
      setShowDetail(false);
      await Promise.all([loadVentas(), loadStats()]);
    } catch (err: any) {
      toast.add(err?.response?.data?.error ?? 'Error al anular venta', 'error');
    }
  };

  const handlePrint = (v: VentaData) => {
    navigate(`/ventas/${v.id}`);
    setTimeout(() => window.print(), 600);
  };

  const clearFilters = () => {
    setSearch(''); setFilterEstado(''); setFilterMetodo('');
    setFilterDate(''); setFechaDesde(''); setFechaHasta('');
  };

  const hasFilters = search || filterEstado || filterMetodo || filterDate || fechaDesde || fechaHasta;

  // ── KPI helpers ─────────────────────────────────────────────────────────

  const kpiCards = stats
    ? [
        { label: 'Total Ventas',    value: stats.total_ventas,          icon: ShoppingBag,  color: 'text-indigo-600',  bg: 'bg-indigo-50' },
        { label: 'Ventas Hoy',      value: stats.ventas_hoy,            icon: Calendar,     color: 'text-blue-600',    bg: 'bg-blue-50' },
        { label: 'Ingresos Totales',value: `Q${Number(stats.total_vendido_quetzales ?? 0).toFixed(2)}`, icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { label: 'Promedio Venta',  value: `Q${Number(stats.promedio_venta_quetzales ?? 0).toFixed(2)}`, icon: TrendingUp, color: 'text-purple-600',  bg: 'bg-purple-50' },
        { label: 'Pendientes',      value: stats.ventas_pendientes,     icon: Clock,        color: 'text-amber-600',   bg: 'bg-amber-50' },
        { label: 'Pagadas',         value: stats.ventas_pagadas,        icon: CheckCircle,  color: 'text-green-600',   bg: 'bg-green-50' },
      ]
    : [];

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <PageHeader
          title="Gestión de Ventas"
          subtitle="Control y seguimiento de todas las ventas"
        />
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => { loadVentas(); loadStats(); }} title="Actualizar">
            <RefreshCw size={16} />
          </Button>
          <Button onClick={() => setShowQuotePicker(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <FileText size={16} /> Desde Cotización
          </Button>
          <Button onClick={() => navigate('/ventas/nueva')} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            <Plus size={16} /> Nueva Venta
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {kpiCards.map(({ label, value, icon: Icon, color, bg }) => (
            <Card key={label} className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${bg}`}>
                  <Icon size={18} className={color} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500 truncate">{label}</p>
                  <p className={`text-lg font-bold truncate ${color}`}>{value}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3 items-end">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <Input
              type="text"
              placeholder="Cliente, código, teléfono…"
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Estado */}
          <select
            value={filterEstado}
            onChange={e => setFilterEstado(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            <option value="">Todos los estados</option>
            <option value="PAGADA">Pagada</option>
            <option value="PENDIENTE">Pendiente</option>
            <option value="PARCIAL">Parcial</option>
            <option value="ANULADA">Anulada</option>
          </select>

          {/* Método pago */}
          <select
            value={filterMetodo}
            onChange={e => setFilterMetodo(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            <option value="">Todos los métodos</option>
            <option value="EFECTIVO">Efectivo</option>
            <option value="TARJETA">Tarjeta</option>
            <option value="TRANSFERENCIA">Transferencia</option>
            <option value="MIXTO">Mixto</option>
          </select>

          {/* Date preset */}
          <div className="flex gap-1">
            {['hoy', 'semana', 'mes'].map(p => (
              <button
                key={p}
                onClick={() => setFilterDate(filterDate === p ? '' : p)}
                className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                  filterDate === p
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>

          {/* Custom date range */}
          {!filterDate && (
            <>
              <Input type="date" value={fechaDesde} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFechaDesde(e.target.value)} className="w-36 text-sm" />
              <Input type="date" value={fechaHasta} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFechaHasta(e.target.value)} className="w-36 text-sm" />
            </>
          )}

          {hasFilters && (
            <button onClick={clearFilters} className="text-xs text-gray-500 hover:text-red-500 flex items-center gap-1">
              <XCircle size={14} /> Limpiar
            </button>
          )}
        </div>
      </Card>

      {/* Table / List */}
      {loading ? (
        <Card className="p-12 text-center text-gray-400">
          <RefreshCw size={32} className="mx-auto animate-spin mb-2" />
          Cargando ventas…
        </Card>
      ) : ventas.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag size={56} className="text-gray-300" />}
          title={hasFilters ? 'No se encontraron ventas' : 'No hay ventas registradas'}
          description={hasFilters ? 'Ajusta los filtros de búsqueda' : 'Convierte una cotización para crear tu primera venta'}
          action={
            <Button onClick={() => setShowQuotePicker(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <FileText size={16} /> Desde Cotización
            </Button>
          }
        />
      ) : (
        <>
          {/* Desktop table */}
          <Card className="hidden md:block overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Código</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Cliente</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Teléfono</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Fecha</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Vendedor</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Items</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Pagado</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Saldo</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {ventas.map(v => {
                    const saldo = v.saldo_pendiente ?? (v.total - (v.monto_pagado ?? 0));
                    const items = Array.isArray(v.items) ? v.items : [];
                    return (
                      <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-indigo-700 font-semibold whitespace-nowrap">
                          {v.numero_venta ?? `#${v.id}`}
                        </td>
                        <td className="px-4 py-3">{estadoBadge(v.estado ?? 'PENDIENTE')}</td>
                        <td className="px-4 py-3 font-medium text-gray-900 max-w-[160px] truncate">{v.cliente_nombre}</td>
                        <td className="px-4 py-3 text-gray-500">{v.cliente_telefono ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                          {formatDate(v.fecha_venta ?? v.created_at ?? '')}
                        </td>
                        <td className="px-4 py-3 text-gray-500 max-w-[120px] truncate">
                          {(v as any).vendedor_nombre ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-600">{items.length}</td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900 whitespace-nowrap">
                          Q{(v.total / 100).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right text-emerald-700 whitespace-nowrap">
                          Q{((v.monto_pagado ?? 0) / 100).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <span className={saldo > 0 ? 'text-amber-600 font-semibold' : 'text-gray-400'}>
                            Q{(saldo / 100).toFixed(2)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => openDetail(v)}
                              className="p-1.5 rounded hover:bg-indigo-50 text-indigo-600"
                              title="Ver detalle"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              onClick={() => handlePrint(v)}
                              className="p-1.5 rounded hover:bg-gray-100 text-gray-500"
                              title="Imprimir"
                            >
                              <Printer size={14} />
                            </button>
                            {(v.estado === 'PENDIENTE' || v.estado === 'PARCIAL') && (
                              <button
                                onClick={() => openPago(v)}
                                className="p-1.5 rounded hover:bg-emerald-50 text-emerald-600"
                                title="Registrar pago"
                              >
                                <CreditCard size={14} />
                              </button>
                            )}
                            {v.estado !== 'ANULADA' && (
                              <button
                                onClick={() => openAnular(v)}
                                className="p-1.5 rounded hover:bg-red-50 text-red-500"
                                title="Anular"
                              >
                                <Ban size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2 border-t border-gray-100 text-xs text-gray-400">
              {ventas.length} venta{ventas.length !== 1 ? 's' : ''} encontrada{ventas.length !== 1 ? 's' : ''}
            </div>
          </Card>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {ventas.map(v => {
              const saldo = v.saldo_pendiente ?? (v.total - (v.monto_pagado ?? 0));
              const items = Array.isArray(v.items) ? v.items : [];
              return (
                <Card key={v.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="font-mono text-xs text-indigo-700 font-semibold">{v.numero_venta ?? `#${v.id}`}</span>
                      <div className="mt-1">{estadoBadge(v.estado ?? 'PENDIENTE')}</div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">Q{(v.total / 100).toFixed(2)}</p>
                      {saldo > 0 && <p className="text-xs text-amber-600">Saldo: Q{(saldo / 100).toFixed(2)}</p>}
                    </div>
                  </div>
                  <p className="text-sm font-medium text-gray-800">{v.cliente_nombre}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatDate(v.fecha_venta ?? v.created_at ?? '')} · {items.length} item{items.length !== 1 ? 's' : ''}</p>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => openDetail(v)} className="flex-1 py-1.5 text-xs rounded-lg border border-indigo-200 text-indigo-600 hover:bg-indigo-50">Ver</button>
                    {(v.estado === 'PENDIENTE' || v.estado === 'PARCIAL') && (
                      <button onClick={() => openPago(v)} className="flex-1 py-1.5 text-xs rounded-lg border border-emerald-200 text-emerald-600 hover:bg-emerald-50">Pagar</button>
                    )}
                    {v.estado !== 'ANULADA' && (
                      <button onClick={() => openAnular(v)} className="flex-1 py-1.5 text-xs rounded-lg border border-red-200 text-red-500 hover:bg-red-50">Anular</button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* ── Detail Modal ─────────────────────────────────────────────────── */}
      <Modal isOpen={showDetail} onClose={() => setShowDetail(false)} title={selectedVenta?.numero_venta ?? 'Detalle de Venta'} size="3xl">
        {selectedVenta && (
          <div className="space-y-4 text-sm">
            {/* Header info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-0.5">Estado</p>
                {estadoBadge(selectedVenta.estado ?? 'PENDIENTE')}
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-0.5">Fecha</p>
                <p className="font-medium">{formatDate(selectedVenta.fecha_venta ?? selectedVenta.created_at ?? '')}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-0.5">Total</p>
                <p className="font-bold text-gray-900">Q{(selectedVenta.total / 100).toFixed(2)}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-0.5">Saldo pendiente</p>
                <p className="font-bold text-amber-600">
                  Q{((selectedVenta.saldo_pendiente ?? (selectedVenta.total - (selectedVenta.monto_pagado ?? 0))) / 100).toFixed(2)}
                </p>
              </div>
            </div>

            {/* Cliente */}
            <div className="border rounded-lg p-3">
              <p className="font-semibold text-gray-700 mb-2">Cliente</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-gray-400">Nombre: </span>{selectedVenta.cliente_nombre}</div>
                <div><span className="text-gray-400">Teléfono: </span>{selectedVenta.cliente_telefono ?? '—'}</div>
                <div><span className="text-gray-400">Email: </span>{selectedVenta.cliente_email ?? '—'}</div>
                <div><span className="text-gray-400">NIT: </span>{selectedVenta.cliente_nit ?? '—'}</div>
                {selectedVenta.cliente_direccion && (
                  <div className="col-span-2"><span className="text-gray-400">Dirección: </span>{selectedVenta.cliente_direccion}</div>
                )}
              </div>
            </div>

            {/* Items */}
            <div>
              <p className="font-semibold text-gray-700 mb-2">Productos / Servicios</p>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-gray-500">Descripción</th>
                      <th className="px-3 py-2 text-center text-gray-500">Cant.</th>
                      <th className="px-3 py-2 text-right text-gray-500">Precio u.</th>
                      <th className="px-3 py-2 text-right text-gray-500">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(Array.isArray(selectedVenta.items) ? selectedVenta.items : []).map((item, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 text-gray-800">{item.nombre}</td>
                        <td className="px-3 py-2 text-center">{item.cantidad}</td>
                        <td className="px-3 py-2 text-right">Q{(item.precioUnit / 100).toFixed(2)}</td>
                        <td className="px-3 py-2 text-right font-medium">Q{(item.subtotal / 100).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t">
                    <tr>
                      <td colSpan={3} className="px-3 py-2 text-right font-semibold text-gray-700">Total</td>
                      <td className="px-3 py-2 text-right font-bold">Q{(selectedVenta.total / 100).toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Pagos */}
            {Array.isArray(selectedVenta.pagos) && selectedVenta.pagos.length > 0 && (
              <div>
                <p className="font-semibold text-gray-700 mb-2">Historial de Pagos</p>
                <div className="space-y-1">
                  {selectedVenta.pagos.map((p: any, i: number) => (
                    <div key={i} className="flex items-center justify-between bg-emerald-50 rounded px-3 py-2 text-xs">
                      <span className="text-emerald-700 font-medium">{METODO_LABEL[p.metodo] ?? p.metodo}</span>
                      {p.referencia && <span className="text-gray-400">Ref: {p.referencia}</span>}
                      <span className="font-bold text-emerald-800">Q{(p.monto / 100).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedVenta.observaciones && (
              <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700">
                <span className="font-semibold">Observaciones: </span>{selectedVenta.observaciones}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 pt-2 border-t">
              <Button variant="ghost" onClick={() => handlePrint(selectedVenta)} className="flex-1">
                <Printer size={14} /> Imprimir
              </Button>
              {(selectedVenta.estado === 'PENDIENTE' || selectedVenta.estado === 'PARCIAL') && (
                <Button
                  onClick={() => { setShowDetail(false); setTimeout(() => openPago(selectedVenta), 100); }}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <CreditCard size={14} /> Registrar Pago
                </Button>
              )}
              {selectedVenta.estado !== 'ANULADA' && (
                <Button
                  variant="ghost"
                  onClick={() => { setShowDetail(false); setTimeout(() => openAnular(selectedVenta), 100); }}
                  className="text-red-500 hover:bg-red-50"
                >
                  <Ban size={14} /> Anular
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ── Pago Modal ───────────────────────────────────────────────────── */}
      <Modal isOpen={showPagoModal} onClose={() => setShowPagoModal(false)} title="Registrar Pago" size="sm">
        {selectedVenta && (
          <div className="space-y-4 text-sm">
            <div className="bg-amber-50 rounded-lg p-3 text-xs text-amber-700">
              <span className="font-semibold">Saldo pendiente: </span>
              Q{((selectedVenta.saldo_pendiente ?? (selectedVenta.total - (selectedVenta.monto_pagado ?? 0))) / 100).toFixed(2)}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Monto a pagar (Q)</label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={pagoMonto}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPagoMonto(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Método de pago</label>
              <select
                value={pagoMetodo}
                onChange={e => setPagoMetodo(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                <option value="EFECTIVO">Efectivo</option>
                <option value="TARJETA">Tarjeta</option>
                <option value="TRANSFERENCIA">Transferencia</option>
              </select>
            </div>

            {(pagoMetodo === 'TARJETA' || pagoMetodo === 'TRANSFERENCIA') && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Referencia / Comprobante</label>
                <Input
                  value={pagoRef}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPagoRef(e.target.value)}
                  placeholder="Número de referencia…"
                />
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button variant="ghost" onClick={() => setShowPagoModal(false)} className="flex-1">Cancelar</Button>
              <Button
                onClick={handleRegistrarPago}
                disabled={pagoLoading}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {pagoLoading ? <RefreshCw size={14} className="animate-spin" /> : <CreditCard size={14} />}
                {pagoLoading ? 'Procesando…' : 'Confirmar Pago'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Anular Dialog ────────────────────────────────────────────────── */}
      <Modal isOpen={showAnularDialog} onClose={() => setShowAnularDialog(false)} title="Anular Venta" size="sm">
        {anularTarget && (
          <div className="space-y-4 text-sm">
            <div className="flex items-center gap-3 bg-red-50 rounded-lg p-3 text-red-700">
              <AlertTriangle size={20} className="shrink-0" />
              <p>Estás a punto de anular la venta <strong>{anularTarget.numero_venta}</strong>. Esta acción no se puede deshacer.</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Motivo de anulación <span className="text-red-500">*</span></label>
              <textarea
                value={motivo}
                onChange={e => setMotivo(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
                placeholder="Describe el motivo de la anulación…"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="ghost" onClick={() => setShowAnularDialog(false)} className="flex-1">Cancelar</Button>
              <Button
                onClick={handleAnular}
                disabled={!motivo.trim()}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
              >
                <Ban size={14} /> Anular Venta
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Quote Picker ─────────────────────────────────────────────────── */}
      {showQuotePicker && (
        <QuotePicker
          onClose={() => setShowQuotePicker(false)}
          onSelect={(quote: any) => {
            setShowQuotePicker(false);
            navigate(`/ventas/nueva?from=${quote.id}`);
          }}
        />
      )}
    </div>
  );
}
