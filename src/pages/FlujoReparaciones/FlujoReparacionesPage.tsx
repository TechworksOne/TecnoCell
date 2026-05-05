import {
  GitBranch, Search, CheckCircle, ClipboardList, Edit, History,
  AlertTriangle, Smartphone, Wrench, Clock, Calendar, User,
  ChevronRight, RefreshCw,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getAllReparaciones } from "../../services/repairService";
import API_URL from "../../services/config";
import axios from "axios";
import ModalActualizarEstado from "../../components/repairs/ModalActualizarEstado";
import ModalHistorialReparacion from "../../components/repairs/ModalHistorialReparacion";

// ── Types ─────────────────────────────────────────────────────────────────────
interface CheckEquipo {
  id: number;
  reparacion_id: string;
  fecha_checklist: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const EXCLUDED_STATES = ['CANCELADA', 'ANULADA', 'CANCELADO'];

// ── Helpers ───────────────────────────────────────────────────────────────────
function safeDate(v?: string | null): string {
  if (!v) return '—';
  const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return '—';
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-GT', { day: '2-digit', month: 'short', year: 'numeric' });
}

function matches(rep: any, q: string): boolean {
  const lq = q.toLowerCase();
  return (
    rep.clienteNombre?.toLowerCase().includes(lq) ||
    rep.id?.toLowerCase().includes(lq) ||
    rep.recepcion?.marca?.toLowerCase().includes(lq) ||
    rep.recepcion?.modelo?.toLowerCase().includes(lq)
  );
}

// ── Style maps ────────────────────────────────────────────────────────────────
const ESTADO_MAP: Record<string, { label: string; cls: string }> = {
  RECIBIDA:               { label: 'Recibida',             cls: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
  EN_DIAGNOSTICO:         { label: 'En Diagnóstico',       cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
  ESPERANDO_AUTORIZACION: { label: 'Esp. Autorización',    cls: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300' },
  AUTORIZADA:             { label: 'Autorizada',           cls: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300' },
  EN_REPARACION:          { label: 'En Reparación',        cls: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300' },
  EN_PROCESO:             { label: 'En Proceso',           cls: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300' },
  ESPERANDO_PIEZA:        { label: 'Esp. Pieza',           cls: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300' },
  STAND_BY:               { label: 'Stand By',             cls: 'bg-slate-100 text-slate-700 dark:bg-slate-700/50 dark:text-slate-300' },
  COMPLETADA:             { label: 'Completada',           cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' },
  ENTREGADA:              { label: 'Entregada',            cls: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' },
};

const PRIORIDAD_MAP: Record<string, { label: string; cls: string }> = {
  BAJA:  { label: 'Baja',  cls: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300' },
  MEDIA: { label: 'Media', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
  ALTA:  { label: 'Alta',  cls: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
};

// ── Main component ─────────────────────────────────────────────────────────────
export default function FlujoReparacionesPage() {
  const navigate = useNavigate();
  const [reparaciones, setReparaciones] = useState<any[]>([]);
  const [checksEquipo, setChecksEquipo] = useState<CheckEquipo[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchChecklist, setSearchChecklist] = useState('');
  const [searchFlujo, setSearchFlujo] = useState('');
  const [modalEstadoOpen, setModalEstadoOpen] = useState(false);
  const [modalHistorialOpen, setModalHistorialOpen] = useState(false);
  const [reparacionSeleccionada, setReparacionSeleccionada] = useState<any>(null);

  // ── Load ────────────────────────────────────────────────────────────────────
  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [reps, checks] = await Promise.all([
        getAllReparaciones().then(r => Array.isArray(r) ? r : (r as any).data || []),
        loadAllChecks(),
      ]);
      setReparaciones(reps);
      setChecksEquipo(checks);
    } catch (e) {
      console.error('Error al cargar datos:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadAllChecks = async (): Promise<CheckEquipo[]> => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/check-equipo`, {
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: s => s < 500,
      });
      return res.data.success && Array.isArray(res.data.data) ? res.data.data : [];
    } catch {
      return [];
    }
  };

  // ── Derived data ────────────────────────────────────────────────────────────
  const activeReps = useMemo(() =>
    reparaciones.filter(r => !EXCLUDED_STATES.includes(String(r.estado).toUpperCase())),
    [reparaciones]
  );

  const checkSet = useMemo(() => new Set(checksEquipo.map(c => c.reparacion_id)), [checksEquipo]);

  // Pendientes de checklist: sin check, ordenadas por fecha desc
  const pendingChecklist = useMemo(() =>
    activeReps
      .filter(r => !checkSet.has(r.id) && matches(r, searchChecklist))
      .sort((a, b) => {
        const da = a.fechaIngreso ? new Date(String(a.fechaIngreso).replace(' ', 'T')).getTime() : 0;
        const db = b.fechaIngreso ? new Date(String(b.fechaIngreso).replace(' ', 'T')).getTime() : 0;
        return db - da;
      }),
    [activeReps, checkSet, searchChecklist]
  );

  // Flujo activo: con checklist
  const flujoReps = useMemo(() =>
    activeReps.filter(r => checkSet.has(r.id) && matches(r, searchFlujo)),
    [activeReps, checkSet, searchFlujo]
  );

  // KPIs computed from activeReps (no filtered)
  const kpiSinCheck  = useMemo(() => activeReps.filter(r => !checkSet.has(r.id)).length, [activeReps, checkSet]);
  const kpiConCheck  = useMemo(() => activeReps.filter(r =>  checkSet.has(r.id)).length, [activeReps, checkSet]);
  const kpiEnProceso = useMemo(() =>
    activeReps.filter(r => ['EN_DIAGNOSTICO', 'EN_REPARACION', 'EN_PROCESO', 'ESPERANDO_PIEZA', 'AUTORIZADA'].includes(r.estado)).length,
    [activeReps]
  );

  // ── Handlers ────────────────────────────────────────────────────────────────
  const openModalEstado    = (r: any) => { setReparacionSeleccionada(r); setModalEstadoOpen(true); };
  const openModalHistorial = (r: any) => { setReparacionSeleccionada(r); setModalHistorialOpen(true); };
  const closeModalEstado    = () => { setModalEstadoOpen(false);    setReparacionSeleccionada(null); };
  const closeModalHistorial = () => { setModalHistorialOpen(false); setReparacionSeleccionada(null); };

  // ── Shared classes ───────────────────────────────────────────────────────────
  const searchCls = 'pl-9 pr-3 py-2 text-sm rounded-xl border bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border-slate-300 dark:border-slate-700 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition w-full sm:w-64';
  const sectionCard = 'rounded-2xl border bg-white dark:bg-slate-900/70 border-slate-200 dark:border-slate-700 overflow-hidden';

  return (
    <div className="space-y-5">

      {/* ── HEADER ──────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Flujo de Reparaciones
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Gestión del avance de equipos en servicio técnico
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {/* ── KPIs ────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total activas */}
        <div className="rounded-2xl p-4 bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
            <GitBranch size={18} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Total activas</p>
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 leading-tight">{activeReps.length}</p>
          </div>
        </div>
        {/* Sin checklist */}
        <div className="rounded-2xl p-4 bg-white dark:bg-slate-900/70 border border-amber-300 dark:border-amber-700/50 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
            <ClipboardList size={18} className="text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide">Sin checklist</p>
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 leading-tight">{kpiSinCheck}</p>
          </div>
        </div>
        {/* Con checklist */}
        <div className="rounded-2xl p-4 bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
            <CheckCircle size={18} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Con checklist</p>
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 leading-tight">{kpiConCheck}</p>
          </div>
        </div>
        {/* En proceso */}
        <div className="rounded-2xl p-4 bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center shrink-0">
            <Wrench size={18} className="text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">En proceso</p>
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 leading-tight">{kpiEnProceso}</p>
          </div>
        </div>
      </div>

      {/* ── SECCIÓN 1: PENDIENTES DE CHECKLIST ──────────────────────────────── */}
      <div className={sectionCard}>
        {/* Header sección */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
              <ClipboardList size={15} className="text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">Pendientes de Checklist</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Reparaciones recién ingresadas sin checklist</p>
            </div>
            {kpiSinCheck > 0 && (
              <span className="ml-1 text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700/50">
                {kpiSinCheck}
              </span>
            )}
          </div>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchChecklist}
              onChange={e => setSearchChecklist(e.target.value)}
              className={searchCls}
            />
          </div>
        </div>

        {/* Body */}
        {loading ? (
          <div className="py-12 flex flex-col items-center gap-3 text-slate-400">
            <div className="w-8 h-8 border-2 border-amber-400/40 border-t-amber-400 rounded-full animate-spin" />
            <p className="text-sm">Cargando...</p>
          </div>
        ) : pendingChecklist.length === 0 ? (
          <div className="py-10 flex flex-col items-center gap-2 text-slate-400 dark:text-slate-500">
            <CheckCircle size={36} className="text-emerald-400 dark:text-emerald-500" />
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
              {searchChecklist ? 'Sin resultados para esta búsqueda' : 'No hay reparaciones pendientes de checklist'}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {searchChecklist ? 'Intenta con otro término' : 'Todas las reparaciones activas ya tienen checklist iniciado'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                  <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">ID</th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Cliente</th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 hidden sm:table-cell">Equipo</th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Estado</th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 hidden md:table-cell">Fecha ingreso</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {pendingChecklist.map(rep => {
                  const est = ESTADO_MAP[rep.estado];
                  return (
                    <tr key={rep.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-3 font-mono text-xs font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                        {rep.id}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200 max-w-[180px] truncate">
                        {rep.clienteNombre || '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400 hidden sm:table-cell max-w-[160px] truncate">
                        {[rep.recepcion?.marca, rep.recepcion?.modelo].filter(Boolean).join(' ') || '—'}
                      </td>
                      <td className="px-4 py-3">
                        {est
                          ? <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${est.cls}`}>{est.label}</span>
                          : <span className="text-xs text-slate-400">{rep.estado}</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs whitespace-nowrap hidden md:table-cell">
                        {safeDate(rep.fechaIngreso)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => navigate(`/flujo-reparaciones/${rep.id}`)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors whitespace-nowrap"
                        >
                          <ClipboardList size={12} />
                          <span className="hidden sm:inline">Iniciar </span>Checklist
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── SECCIÓN 2: FLUJO DE REPARACIONES ────────────────────────────────── */}
      <div className={sectionCard}>
        {/* Header sección */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
              <CheckCircle size={15} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">Flujo de Reparaciones</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Reparaciones con checklist iniciado</p>
            </div>
            {kpiConCheck > 0 && (
              <span className="ml-1 text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/50">
                {kpiConCheck}
              </span>
            )}
          </div>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchFlujo}
              onChange={e => setSearchFlujo(e.target.value)}
              className={searchCls}
            />
          </div>
        </div>

        {/* Body */}
        {loading ? (
          <div className="py-12 flex flex-col items-center gap-3 text-slate-400">
            <div className="w-8 h-8 border-2 border-emerald-400/40 border-t-emerald-400 rounded-full animate-spin" />
            <p className="text-sm">Cargando...</p>
          </div>
        ) : flujoReps.length === 0 ? (
          <div className="py-10 flex flex-col items-center gap-2 text-slate-400 dark:text-slate-500">
            <ClipboardList size={36} className="text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
              {searchFlujo ? 'Sin resultados para esta búsqueda' : 'No hay reparaciones en flujo activo'}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {searchFlujo ? 'Intenta con otro término' : 'Inicia el checklist de una reparación para verla aquí'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {flujoReps.map(rep => {
              const est     = ESTADO_MAP[rep.estado];
              const prio    = PRIORIDAD_MAP[rep.prioridad];
              const cambios = rep.totalCambiosEstado || 0;

              const borderAccent =
                ['COMPLETADA', 'ENTREGADA'].includes(rep.estado) ? 'border-l-emerald-500' :
                'border-l-blue-500';

              return (
                <div
                  key={rep.id}
                  className={`flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 border-l-4 ${borderAccent} hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer`}
                  onClick={() => navigate(`/flujo-reparaciones/${rep.id}`)}
                >
                  {/* Left: badges + meta */}
                  <div className="flex-1 min-w-0 space-y-2">
                    {/* Row 1: ID + badges */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                        {rep.id}
                      </span>
                      {est && (
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${est.cls}`}>
                          <Clock size={10} />
                          {est.label}
                        </span>
                      )}
                      {prio && (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${prio.cls}`}>
                          {prio.label}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                        <CheckCircle size={10} />
                        Checklist OK
                      </span>
                      {cambios > 0 && (
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                          cambios >= 5 ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300' :
                          cambios >= 3 ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' :
                          'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}>
                          <AlertTriangle size={10} />
                          {cambios} {cambios === 1 ? 'cambio' : 'cambios'}
                        </span>
                      )}
                    </div>

                    {/* Row 2: info grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-1 text-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <User size={11} className="text-slate-400 shrink-0" />
                        <span className="text-slate-600 dark:text-slate-300 font-medium truncate">{rep.clienteNombre || '—'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Smartphone size={11} className="text-slate-400 shrink-0" />
                        <span className="text-slate-600 dark:text-slate-300 truncate">
                          {[rep.recepcion?.marca, rep.recepcion?.modelo].filter(Boolean).join(' ') || '—'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Wrench size={11} className="text-slate-400 shrink-0" />
                        <span className="text-slate-500 dark:text-slate-400 truncate">
                          {rep.tecnicoAsignado || <i>Sin asignar</i>}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar size={11} className="text-slate-400 shrink-0" />
                        <span className="text-slate-500 dark:text-slate-400 whitespace-nowrap">{safeDate(rep.fechaIngreso)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: actions */}
                  <div
                    className="flex items-center gap-2 shrink-0"
                    onClick={e => e.stopPropagation()}
                  >
                    <button
                      onClick={() => openModalHistorial(rep)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors"
                    >
                      <History size={12} />
                      <span className="hidden sm:inline">Historial</span>
                    </button>
                    <button
                      onClick={() => openModalEstado(rep)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <Edit size={12} />
                      <span className="hidden sm:inline">Estado</span>
                    </button>
                    <button
                      onClick={() => navigate(`/flujo-reparaciones/${rep.id}`)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                    >
                      Ver
                      <ChevronRight size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      {modalEstadoOpen && reparacionSeleccionada && (
        <ModalActualizarEstado
          isOpen={modalEstadoOpen}
          onClose={closeModalEstado}
          reparacion={reparacionSeleccionada}
          onSuccess={loadData}
        />
      )}
      {modalHistorialOpen && reparacionSeleccionada && (
        <ModalHistorialReparacion
          isOpen={modalHistorialOpen}
          onClose={closeModalHistorial}
          reparacionId={reparacionSeleccionada.id}
        />
      )}
    </div>
  );
}
