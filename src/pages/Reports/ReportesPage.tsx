import { useState, useEffect, useCallback } from 'react';
import {
  BarChart3, TrendingUp, TrendingDown, ShoppingCart, DollarSign,
  Calendar, Download, AlertTriangle, RefreshCw, ChevronRight,
  Users, Package, Wrench, FileText, PieChart as PieIcon,
  ArrowUpRight, ArrowDownRight, Filter
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  getResumen, getDiario, getSemanal, getProductosMasVendidos,
  getHistorialVentas, getMetricasFinancieras,
  ResumenData, DiarioData, SemanalData,
  ProductosMasVendidosData, HistorialVentasData, MetricasFinancieras, HistorialFiltros
} from '../../services/reportesService';
import { formatMoney, formatDate } from '../../lib/format';

// ===== HELPERS =====

const hoy = () => new Date().toISOString().split('T')[0];

const primerDiaMes = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};

function fmt(n: number) {
  return formatMoney(n);
}

function shortDate(fecha: string) {
  const d = new Date(fecha + 'T12:00:00');
  return d.toLocaleDateString('es-GT', { day: '2-digit', month: 'short' });
}

// ===== COLORS =====

const CHART_COLORS = ['#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const ESTADO_STYLES: Record<string, string> = {
  PAGADA:   'bg-emerald-100 text-emerald-700',
  PENDIENTE:'bg-amber-100 text-amber-700',
  PARCIAL:  'bg-blue-100 text-blue-700',
  ANULADA:  'bg-red-100 text-red-700',
};

// ===== TABS =====

const TABS = [
  { id: 'resumen',    label: 'Resumen',    icon: <BarChart3 size={16} /> },
  { id: 'diario',     label: 'Diario',     icon: <Calendar size={16} /> },
  { id: 'semanal',    label: 'Semanal',    icon: <TrendingUp size={16} /> },
  { id: 'productos',  label: 'Productos',  icon: <Package size={16} /> },
  { id: 'historial',  label: 'Historial',  icon: <FileText size={16} /> },
  { id: 'metricas',   label: 'Métricas',   icon: <PieIcon size={16} /> },
];

// ===== COMPONENTS =====

function KpiCard({
  label, value, sub, icon, color, trend
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  color: string;
  trend?: 'up' | 'down' | 'neutral';
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs text-slate-500 font-medium uppercase tracking-wide truncate">{label}</p>
        <p className="text-xl font-bold text-slate-800 mt-1">{value}</p>
        {sub && (
          <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
            {trend === 'up' && <ArrowUpRight size={12} className="text-emerald-500" />}
            {trend === 'down' && <ArrowDownRight size={12} className="text-red-500" />}
            {sub}
          </p>
        )}
      </div>
      <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center shrink-0`}>
        {icon}
      </div>
    </div>
  );
}

function SectionCard({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
      {title && <h3 className="text-sm font-semibold text-slate-700 mb-4">{title}</h3>}
      {children}
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <RefreshCw size={24} className="text-cyan-500 animate-spin" />
    </div>
  );
}

function ErrorBox({ msg, onRetry }: { msg: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <AlertTriangle size={32} className="text-amber-400" />
      <p className="text-sm text-slate-600">{msg}</p>
      {onRetry && (
        <button onClick={onRetry} className="text-xs text-cyan-600 underline">
          Reintentar
        </button>
      )}
    </div>
  );
}

function WarningBanner({ msg }: { msg: string }) {
  return (
    <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-xs text-amber-700">
      <AlertTriangle size={14} /> {msg}
    </div>
  );
}

function EmptyState({ msg = 'Sin datos para el período seleccionado' }) {
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-center text-slate-400">
      <BarChart3 size={32} />
      <p className="text-sm">{msg}</p>
    </div>
  );
}

// ===== CSV EXPORT =====

function exportarCSV(data: HistorialVentasData['data']) {
  if (!data.length) return;
  const headers = [
    'Código','Fecha','Cliente','Teléfono','Vendedor','Estado',
    'Método de Pago','Subtotal','Descuento','Total','Costo','Ganancia'
  ];
  const rows = data.map(v => [
    v.codigo, new Date(v.fecha).toLocaleDateString('es-GT'),
    v.cliente, v.cliente_telefono || '', v.vendedor, v.estado,
    v.metodo_pago || '', v.subtotal, v.descuento, v.total, v.costo_total, v.ganancia_estimada
  ]);
  const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `historial-ventas-${hoy()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ===== TAB: RESUMEN =====

function ResumenTab() {
  const [data, setData] = useState<ResumenData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    setLoading(true); setError('');
    try { setData(await getResumen()); }
    catch { setError('No se pudo cargar el resumen.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorBox msg={error} onRetry={cargar} />;
  if (!data) return null;

  return (
    <div className="space-y-4">
      {data.advertencia_costos && <WarningBanner msg={data.advertencia_costos} />}

      {/* Hoy */}
      <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Hoy</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Ventas del día"    value={String(data.ventas_dia)}    icon={<ShoppingCart size={18} className="text-cyan-600" />}    color="bg-cyan-50" />
        <KpiCard label="Ingresos del día"  value={fmt(data.ingresos_dia)}     icon={<DollarSign size={18} className="text-emerald-600" />}  color="bg-emerald-50" />
        <KpiCard label="Ganancia del día"  value={fmt(data.ganancia_dia)}     icon={<TrendingUp size={18} className="text-green-600" />}    color="bg-green-50" />
        <KpiCard label="Pérdidas del día"  value={fmt(data.perdidas_dia)}     icon={<TrendingDown size={18} className="text-red-500" />}    color="bg-red-50" />
      </div>

      {/* Mes */}
      <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mt-2">Este mes</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Ventas del mes"    value={String(data.ventas_mes)}    icon={<ShoppingCart size={18} className="text-blue-600" />}    color="bg-blue-50" />
        <KpiCard label="Ingresos del mes"  value={fmt(data.ingresos_mes)}     icon={<DollarSign size={18} className="text-cyan-600" />}     color="bg-cyan-50" />
        <KpiCard label="Ganancia del mes"  value={fmt(data.ganancia_mes)}     icon={<TrendingUp size={18} className="text-emerald-600" />}  color="bg-emerald-50" />
        <KpiCard label="Pérdidas del mes"  value={fmt(data.perdidas_mes)}     icon={<TrendingDown size={18} className="text-orange-500" />} color="bg-orange-50" />
      </div>

      {/* Otros */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Productos vendidos" value={String(data.productos_vendidos)} icon={<Package size={18} className="text-violet-600" />}  color="bg-violet-50" />
        <KpiCard label="Repuestos vendidos" value={String(data.repuestos_vendidos)} icon={<Wrench size={18} className="text-indigo-600" />}   color="bg-indigo-50" />
        <KpiCard label="Ticket promedio"    value={fmt(data.ticket_promedio)}       icon={<BarChart3 size={18} className="text-pink-600" />}   color="bg-pink-50" />
        <KpiCard label="Ventas anuladas"    value={String(data.ventas_anuladas)}    sub={fmt(data.monto_anulado)} icon={<TrendingDown size={18} className="text-red-500" />} color="bg-red-50" />
      </div>
    </div>
  );
}

// ===== TAB: DIARIO =====

function DiarioTab() {
  const [fecha, setFecha] = useState(hoy());
  const [data, setData] = useState<DiarioData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    setLoading(true); setError('');
    try { setData(await getDiario(fecha)); }
    catch { setError('No se pudo cargar el reporte diario.'); }
    finally { setLoading(false); }
  }, [fecha]);

  useEffect(() => { cargar(); }, [cargar]);

  return (
    <div className="space-y-4">
      {/* Filtro fecha */}
      <SectionCard>
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm text-slate-600 font-medium">Fecha:</label>
          <input
            type="date" value={fecha}
            onChange={e => setFecha(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-400"
          />
          <button
            onClick={cargar}
            className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-white text-sm font-medium rounded-xl px-4 py-1.5 transition-colors"
          >
            <RefreshCw size={14} /> Actualizar
          </button>
        </div>
      </SectionCard>

      {loading && <LoadingSpinner />}
      {error && !loading && <ErrorBox msg={error} onRetry={cargar} />}

      {!loading && !error && data && (
        <>
          {data.advertencia_costos && <WarningBanner msg={data.advertencia_costos} />}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiCard label="Ventas realizadas" value={String(data.total_ventas)}    icon={<ShoppingCart size={18} className="text-cyan-600" />}   color="bg-cyan-50" />
            <KpiCard label="Total ingresado"   value={fmt(data.total_ingresos)}     icon={<DollarSign size={18} className="text-emerald-600" />}  color="bg-emerald-50" />
            <KpiCard label="Costo total"       value={fmt(data.costo_total)}        icon={<TrendingDown size={18} className="text-orange-500" />} color="bg-orange-50" />
            <KpiCard label="Descuentos"        value={fmt(data.descuentos)}         icon={<Package size={18} className="text-slate-500" />}       color="bg-slate-50" />
            <KpiCard label="Ganancia bruta"    value={fmt(data.ganancia_bruta)}     icon={<TrendingUp size={18} className="text-green-600" />}    color="bg-green-50" />
            <KpiCard label="Pérdidas"          value={fmt(data.perdidas)}           icon={<TrendingDown size={18} className="text-red-500" />}    color="bg-red-50" />
            <KpiCard label="Ganancia neta"     value={fmt(data.ganancia_neta)}      icon={<TrendingUp size={18} className="text-emerald-700" />}  color="bg-emerald-50" />
            <KpiCard label="Ventas anuladas"   value={String(data.ventas_anuladas)} sub={fmt(data.monto_anulado)} icon={<TrendingDown size={18} className="text-red-400" />} color="bg-red-50" />
          </div>

          {/* Métodos de pago */}
          {data.metodos_pago.length > 0 && (
            <SectionCard title="Métodos de pago usados">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {data.metodos_pago.map(mp => (
                  <div key={mp.metodo} className="bg-slate-50 rounded-xl p-3">
                    <p className="text-xs text-slate-500 font-medium uppercase">{mp.metodo}</p>
                    <p className="text-base font-bold text-slate-800 mt-0.5">{fmt(mp.monto)}</p>
                    <p className="text-xs text-slate-400">{mp.count} venta{mp.count !== 1 ? 's' : ''}</p>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
        </>
      )}
    </div>
  );
}

// ===== TAB: SEMANAL =====

function SemanalTab() {
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [data, setData] = useState<SemanalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    setLoading(true); setError('');
    try { setData(await getSemanal(fechaInicio || undefined, fechaFin || undefined)); }
    catch { setError('No se pudo cargar el reporte semanal.'); }
    finally { setLoading(false); }
  }, [fechaInicio, fechaFin]);

  useEffect(() => { cargar(); }, []); // eslint-disable-line

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorBox msg={error} onRetry={cargar} />;

  return (
    <div className="space-y-4">
      <SectionCard>
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm text-slate-600">Semana:</label>
          <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400" />
          <span className="text-slate-400">—</span>
          <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400" />
          <button onClick={cargar}
            className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-white text-sm font-medium rounded-xl px-4 py-1.5 transition-colors">
            <RefreshCw size={14} /> Buscar
          </button>
        </div>
      </SectionCard>

      {data && (
        <>
          {data.advertencia_costos && <WarningBanner msg={data.advertencia_costos} />}

          {/* Resumen semana */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <KpiCard label="Ventas" value={String(data.total_ventas)} icon={<ShoppingCart size={18} className="text-cyan-600" />} color="bg-cyan-50" />
            <KpiCard label="Ingresos" value={fmt(data.total_ingresos)} icon={<DollarSign size={18} className="text-emerald-600" />} color="bg-emerald-50" />
            <KpiCard label="Ganancia" value={fmt(data.ganancia)} icon={<TrendingUp size={18} className="text-green-600" />} color="bg-green-50" />
          </div>

          {/* Comparación */}
          {data.comparacion_semana_anterior && (
            <SectionCard title="Comparación semana anterior">
              <div className="grid grid-cols-3 gap-4 text-center">
                {[
                  { label: 'Ventas', actual: data.total_ventas, prev: data.comparacion_semana_anterior.ventas, fmt: (v: number) => String(v) },
                  { label: 'Ingresos', actual: data.total_ingresos, prev: data.comparacion_semana_anterior.ingresos, fmt },
                  { label: 'Ganancia', actual: data.ganancia, prev: data.comparacion_semana_anterior.ganancia, fmt },
                ].map(({ label, actual, prev, fmt: fmtFn }) => {
                  const diff = actual - prev;
                  const up = diff >= 0;
                  return (
                    <div key={label}>
                      <p className="text-xs text-slate-500 font-medium">{label}</p>
                      <p className="text-lg font-bold text-slate-800">{fmtFn(actual)}</p>
                      <p className={`text-xs flex items-center justify-center gap-1 ${up ? 'text-emerald-600' : 'text-red-500'}`}>
                        {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                        vs {fmtFn(prev)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          )}

          {/* Gráfica por día */}
          {data.por_dia.length > 0 ? (
            <SectionCard title="Ventas y ganancias por día">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.por_dia.map(d => ({ ...d, fecha: shortDate(d.fecha) }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `Q${v}`} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Legend />
                  <Bar dataKey="ingresos" name="Ingresos" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="ganancia" name="Ganancia" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </SectionCard>
          ) : (
            <SectionCard><EmptyState /></SectionCard>
          )}

          {/* Top productos */}
          {data.productos_mas_vendidos.length > 0 && (
            <SectionCard title="Productos más vendidos de la semana">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      {['Producto','Categoría','Cant.','Ingresos','Ganancia','Stock'].map(h => (
                        <th key={h} className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.productos_mas_vendidos.map((p, i) => (
                      <tr key={i} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                        <td className="py-2 px-3 font-medium text-slate-800">{p.nombre}</td>
                        <td className="py-2 px-3 text-slate-500">{p.categoria}</td>
                        <td className="py-2 px-3 text-slate-700 font-semibold">{p.cantidad}</td>
                        <td className="py-2 px-3 text-slate-700">{fmt(p.ingresos)}</td>
                        <td className="py-2 px-3 text-emerald-600 font-medium">{fmt(p.ganancia ?? 0)}</td>
                        <td className="py-2 px-3 text-slate-500">{p.stock_actual}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          )}
        </>
      )}
    </div>
  );
}

// ===== TAB: PRODUCTOS MÁS VENDIDOS =====

function ProductosTab() {
  const [desde, setDesde] = useState(primerDiaMes());
  const [hasta, setHasta] = useState(hoy());
  const [data, setData] = useState<ProductosMasVendidosData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const PRESET_BUTTONS = [
    { label: 'Hoy',      fn: () => { setDesde(hoy()); setHasta(hoy()); } },
    { label: 'Esta semana', fn: () => {
      const t = new Date(); const d = t.getDay(); const diff = d === 0 ? -6 : 1 - d;
      const mon = new Date(t); mon.setDate(t.getDate() + diff);
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
      setDesde(mon.toISOString().split('T')[0]); setHasta(sun.toISOString().split('T')[0]);
    }},
    { label: 'Este mes',  fn: () => { setDesde(primerDiaMes()); setHasta(hoy()); } },
  ];

  const cargar = useCallback(async () => {
    setLoading(true); setError('');
    try { setData(await getProductosMasVendidos(desde, hasta)); }
    catch { setError('No se pudo cargar el ranking de productos.'); }
    finally { setLoading(false); }
  }, [desde, hasta]);

  useEffect(() => { cargar(); }, []); // eslint-disable-line

  return (
    <div className="space-y-4">
      <SectionCard>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1">
            {PRESET_BUTTONS.map(b => (
              <button key={b.label} onClick={() => { b.fn(); }}
                className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-cyan-100 hover:text-cyan-700 text-slate-600 transition-colors font-medium">
                {b.label}
              </button>
            ))}
          </div>
          <input type="date" value={desde} onChange={e => setDesde(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400" />
          <span className="text-slate-400">—</span>
          <input type="date" value={hasta} onChange={e => setHasta(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400" />
          <button onClick={cargar}
            className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-white text-sm font-medium rounded-xl px-4 py-1.5 transition-colors">
            <RefreshCw size={14} /> Buscar
          </button>
        </div>
      </SectionCard>

      {loading && <LoadingSpinner />}
      {error && !loading && <ErrorBox msg={error} onRetry={cargar} />}

      {!loading && !error && data && (
        <>
          {data.advertencia_costos && <WarningBanner msg={data.advertencia_costos} />}

          {data.data.length === 0 ? (
            <SectionCard><EmptyState /></SectionCard>
          ) : (
            <>
              {/* Gráfica horizontal */}
              {data.data.slice(0, 8).length > 0 && (
                <SectionCard title="Top productos por cantidad vendida">
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={data.data.slice(0, 8)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="nombre" width={130} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="cantidad_vendida" name="Unidades" fill="#06b6d4" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </SectionCard>
              )}

              {/* Tabla completa */}
              <SectionCard title={`${data.total} producto${data.total !== 1 ? 's' : ''} encontrado${data.total !== 1 ? 's' : ''}`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100">
                        {['#','Producto','Código','Tipo','Categoría','Cant.','Ingresos','Costo','Ganancia','Stock'].map(h => (
                          <th key={h} className="text-left py-2 px-2 text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.data.map((p, i) => (
                        <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                          <td className="py-2 px-2 text-slate-400 text-xs">{i + 1}</td>
                          <td className="py-2 px-2 font-medium text-slate-800 max-w-[160px] truncate">{p.nombre}</td>
                          <td className="py-2 px-2 text-slate-500 text-xs font-mono">{p.codigo || '-'}</td>
                          <td className="py-2 px-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.tipo === 'REPUESTO' ? 'bg-purple-100 text-purple-700' : 'bg-cyan-100 text-cyan-700'}`}>
                              {p.tipo}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-slate-500 text-xs">{p.categoria}</td>
                          <td className="py-2 px-2 font-bold text-slate-700">{p.cantidad_vendida}</td>
                          <td className="py-2 px-2 text-slate-700">{fmt(p.ingresos)}</td>
                          <td className="py-2 px-2 text-orange-600">{fmt(p.costo_total ?? 0)}</td>
                          <td className={`py-2 px-2 font-medium ${(p.ganancia_estimada ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{fmt(p.ganancia_estimada ?? 0)}</td>
                          <td className="py-2 px-2 text-slate-500">{p.stock_actual}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </SectionCard>
            </>
          )}
        </>
      )}
    </div>
  );
}

// ===== TAB: HISTORIAL =====

function HistorialTab() {
  const [filtros, setFiltros] = useState<HistorialFiltros>({
    desde: primerDiaMes(),
    hasta: hoy(),
    estado: '',
    metodo_pago: '',
    vendedor: '',
    cliente: '',
    limit: 200,
  });
  const [data, setData] = useState<HistorialVentasData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    setLoading(true); setError('');
    const params: HistorialFiltros = { ...filtros };
    if (!params.estado) delete params.estado;
    if (!params.metodo_pago) delete params.metodo_pago;
    if (!params.vendedor) delete params.vendedor;
    if (!params.cliente) delete params.cliente;
    try { setData(await getHistorialVentas(params)); }
    catch { setError('No se pudo cargar el historial.'); }
    finally { setLoading(false); }
  }, [filtros]);

  useEffect(() => { cargar(); }, []); // eslint-disable-line

  const set = (k: keyof HistorialFiltros, v: string) =>
    setFiltros(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <SectionCard>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-xs text-slate-500 block mb-1">Desde</label>
            <input type="date" value={filtros.desde} onChange={e => set('desde', e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400" />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Hasta</label>
            <input type="date" value={filtros.hasta} onChange={e => set('hasta', e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400" />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Estado</label>
            <select value={filtros.estado} onChange={e => set('estado', e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400">
              <option value="">Todos</option>
              {['PAGADA','PENDIENTE','PARCIAL','ANULADA'].map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Método de pago</label>
            <select value={filtros.metodo_pago} onChange={e => set('metodo_pago', e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400">
              <option value="">Todos</option>
              {['EFECTIVO','TARJETA','TRANSFERENCIA','MIXTO'].map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Cliente</label>
            <input type="text" placeholder="Nombre cliente" value={filtros.cliente} onChange={e => set('cliente', e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 w-36" />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Vendedor</label>
            <input type="text" placeholder="Nombre vendedor" value={filtros.vendedor} onChange={e => set('vendedor', e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 w-36" />
          </div>
          <button onClick={cargar}
            className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-white text-sm font-medium rounded-xl px-4 py-1.5 transition-colors">
            <Filter size={14} /> Filtrar
          </button>
          {data && data.data.length > 0 && (
            <button onClick={() => exportarCSV(data.data)}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-xl px-4 py-1.5 transition-colors">
              <Download size={14} /> Exportar CSV
            </button>
          )}
        </div>
      </SectionCard>

      {loading && <LoadingSpinner />}
      {error && !loading && <ErrorBox msg={error} onRetry={cargar} />}

      {!loading && !error && data && (
        <>
          {data.advertencia_costos && <WarningBanner msg={data.advertencia_costos} />}
          {data.data.length === 0 ? (
            <SectionCard><EmptyState /></SectionCard>
          ) : (
            <SectionCard title={`${data.total} venta${data.total !== 1 ? 's' : ''} encontrada${data.total !== 1 ? 's' : ''}`}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      {['Código','Fecha','Cliente','Vendedor','Estado','Método','Subtotal','Desc.','Total','Costo','Ganancia'].map(h => (
                        <th key={h} className="text-left py-2 px-2 text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.data.map(v => (
                      <tr key={v.id} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="py-2 px-2 font-mono text-xs text-slate-600">{v.codigo}</td>
                        <td className="py-2 px-2 text-slate-600 whitespace-nowrap">{formatDate(v.fecha)}</td>
                        <td className="py-2 px-2 text-slate-800 max-w-[120px] truncate">{v.cliente}</td>
                        <td className="py-2 px-2 text-slate-500 text-xs">{v.vendedor}</td>
                        <td className="py-2 px-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ESTADO_STYLES[v.estado] || 'bg-slate-100 text-slate-600'}`}>
                            {v.estado}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-xs text-slate-500">{v.metodo_pago || '-'}</td>
                        <td className="py-2 px-2 text-slate-700">{fmt(v.subtotal)}</td>
                        <td className="py-2 px-2 text-orange-500">{v.descuento > 0 ? fmt(v.descuento) : '-'}</td>
                        <td className="py-2 px-2 font-semibold text-slate-800">{fmt(v.total)}</td>
                        <td className="py-2 px-2 text-orange-600">{fmt(v.costo_total)}</td>
                        <td className={`py-2 px-2 font-medium ${v.ganancia_estimada >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{fmt(v.ganancia_estimada)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          )}
        </>
      )}
    </div>
  );
}

// ===== TAB: MÉTRICAS FINANCIERAS =====

function MetricasTab() {
  const [desde, setDesde] = useState(primerDiaMes());
  const [hasta, setHasta] = useState(hoy());
  const [data, setData] = useState<MetricasFinancieras | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    setLoading(true); setError('');
    try { setData(await getMetricasFinancieras(desde, hasta)); }
    catch { setError('No se pudo cargar las métricas financieras.'); }
    finally { setLoading(false); }
  }, [desde, hasta]);

  useEffect(() => { cargar(); }, []); // eslint-disable-line

  return (
    <div className="space-y-4">
      <SectionCard>
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm text-slate-600">Período:</label>
          <input type="date" value={desde} onChange={e => setDesde(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400" />
          <span className="text-slate-400">—</span>
          <input type="date" value={hasta} onChange={e => setHasta(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400" />
          <button onClick={cargar}
            className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-white text-sm font-medium rounded-xl px-4 py-1.5 transition-colors">
            <RefreshCw size={14} /> Analizar
          </button>
        </div>
      </SectionCard>

      {loading && <LoadingSpinner />}
      {error && !loading && <ErrorBox msg={error} onRetry={cargar} />}

      {!loading && !error && data && (
        <>
          {data.advertencia_costos && <WarningBanner msg={data.advertencia_costos} />}

          {/* Cards principales */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiCard label="Ingresos totales"   value={fmt(data.ingresos_totales)}   icon={<DollarSign size={18} className="text-cyan-600" />}     color="bg-cyan-50" />
            <KpiCard label="Costos totales"      value={fmt(data.costos_totales)}     icon={<TrendingDown size={18} className="text-orange-500" />}  color="bg-orange-50" />
            <KpiCard label="Ganancia bruta"      value={fmt(data.ganancia_bruta)}     icon={<TrendingUp size={18} className="text-green-600" />}     color="bg-green-50" />
            <KpiCard label="Ganancia neta"       value={fmt(data.ganancia_neta)}      icon={<TrendingUp size={18} className="text-emerald-700" />}   color="bg-emerald-50" />
            <KpiCard label="Pérdidas"            value={fmt(data.perdidas)}           icon={<TrendingDown size={18} className="text-red-500" />}     color="bg-red-50" />
            <KpiCard label="Descuentos"          value={fmt(data.descuentos)}         icon={<Package size={18} className="text-slate-500" />}        color="bg-slate-50" />
            <KpiCard label="Ticket promedio"     value={fmt(data.ticket_promedio)}    icon={<BarChart3 size={18} className="text-pink-600" />}       color="bg-pink-50" />
            <KpiCard label="Margen promedio"     value={`${data.margen_promedio}%`}   icon={<Users size={18} className="text-violet-600" />}         color="bg-violet-50" />
          </div>

          {/* Gráfica línea ingresos por día */}
          {data.por_dia.length > 0 ? (
            <SectionCard title="Ingresos y ganancias por día">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={data.por_dia.map(d => ({ ...d, fecha: shortDate(d.fecha) }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="fecha" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `Q${v}`} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Legend />
                  <Line type="monotone" dataKey="ingresos" name="Ingresos" stroke="#06b6d4" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="ganancia" name="Ganancia" stroke="#10b981" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </SectionCard>
          ) : (
            <SectionCard><EmptyState /></SectionCard>
          )}

          {/* Pie métodos de pago */}
          {data.metodos_pago.length > 0 && (
            <div className="grid sm:grid-cols-2 gap-4">
              <SectionCard title="Distribución por método de pago">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={data.metodos_pago}
                      dataKey="monto"
                      nameKey="metodo"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ metodo, percent }) => `${metodo} ${(percent * 100).toFixed(0)}%`}
                    >
                      {data.metodos_pago.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => fmt(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </SectionCard>

              <SectionCard title="Detalle por método">
                <div className="space-y-2">
                  {data.metodos_pago.map((mp, i) => {
                    const pct = data.ingresos_totales > 0 ? (mp.monto / data.ingresos_totales) * 100 : 0;
                    return (
                      <div key={mp.metodo} className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-700 font-medium">{mp.metodo}</span>
                            <span className="text-slate-600">{fmt(mp.monto)}</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1">
                            <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">{mp.count} venta{mp.count !== 1 ? 's' : ''} • {pct.toFixed(1)}%</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </SectionCard>
            </div>
          )}

          {/* Pérdidas breakdown */}
          <SectionCard title="Detalle de pérdidas y egresos">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="bg-red-50 rounded-xl p-3">
                <p className="text-xs text-red-600 font-medium">Ventas anuladas</p>
                <p className="text-lg font-bold text-red-700 mt-0.5">{data.ventas_anuladas.count}</p>
                <p className="text-sm text-red-500">{fmt(data.ventas_anuladas.monto)}</p>
              </div>
              <div className="bg-orange-50 rounded-xl p-3">
                <p className="text-xs text-orange-600 font-medium">Egresos de caja</p>
                <p className="text-lg font-bold text-orange-700 mt-0.5">{fmt(data.egresos_caja)}</p>
              </div>
              <div className="bg-amber-50 rounded-xl p-3">
                <p className="text-xs text-amber-600 font-medium">Descuentos aplicados</p>
                <p className="text-lg font-bold text-amber-700 mt-0.5">{fmt(data.descuentos)}</p>
              </div>
            </div>
          </SectionCard>
        </>
      )}
    </div>
  );
}

// ===== MAIN PAGE =====

export default function ReportesPage() {
  const [activeTab, setActiveTab] = useState('resumen');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 size={22} className="text-cyan-600" />
            Reportes
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Análisis financiero y estadísticas del negocio</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>Solo visible para administradores</span>
          <ChevronRight size={12} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 flex-wrap bg-slate-100 p-1 rounded-2xl w-fit">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-white text-cyan-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'resumen'   && <ResumenTab />}
      {activeTab === 'diario'    && <DiarioTab />}
      {activeTab === 'semanal'   && <SemanalTab />}
      {activeTab === 'productos' && <ProductosTab />}
      {activeTab === 'historial' && <HistorialTab />}
      {activeTab === 'metricas'  && <MetricasTab />}
    </div>
  );
}
