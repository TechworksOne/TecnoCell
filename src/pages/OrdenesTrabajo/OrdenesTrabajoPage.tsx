import React, { useState, useEffect, useCallback } from 'react';
import {
  ClipboardList, Search, UserCheck, UserX, RefreshCw,
  Eye, Wrench, X, Check, AlertCircle, ChevronDown,
  Calendar, User, Clock,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/useAuth';
import { isAdmin } from '../../lib/permissions';
import {
  getOrdenesTrabajo,
  getTecnicos,
  asignarTecnico,
  quitarAsignacion,
  type OTFilters,
} from '../../services/otService';
import type { OrdenTrabajo, Tecnico } from '../../types/ot';
import type { RepairStatus } from '../../types/repair';
import Modal from '../../components/ui/Modal';

// ── Helpers ────────────────────────────────────────────────────────────────
const STATUS_PILL: Record<string, string> = {
  RECIBIDA:               'bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
  EN_PROCESO:             'bg-orange-100 text-orange-700 border border-orange-200 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800',
  EN_DIAGNOSTICO:         'bg-sky-100 text-sky-700 border border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800',
  ESPERANDO_AUTORIZACION: 'bg-yellow-100 text-yellow-700 border border-yellow-200 dark:bg-yellow-950/60 dark:text-yellow-300 dark:border-yellow-800',
  AUTORIZADA:             'bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
  EN_REPARACION:          'bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
  ESPERANDO_PIEZA:        'bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800',
  STAND_BY:               'bg-slate-100 text-slate-600 border border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  COMPLETADA:             'bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
  ENTREGADA:              'bg-green-100 text-green-700 border border-green-200 dark:bg-green-950/60 dark:text-green-300 dark:border-green-800',
  CANCELADA:              'bg-red-100 text-red-700 border border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800',
};
const STATUS_LABEL: Record<string, string> = {
  RECIBIDA: 'Recibida', EN_PROCESO: 'En Proceso', EN_DIAGNOSTICO: 'En Diagnóstico',
  ESPERANDO_AUTORIZACION: 'Esp. Autorización', AUTORIZADA: 'Autorizada',
  EN_REPARACION: 'En Reparación', ESPERANDO_PIEZA: 'Esp. Pieza',
  STAND_BY: 'Stand By', COMPLETADA: 'Completada', ENTREGADA: 'Entregada', CANCELADA: 'Cancelada',
};

const ESTADOS_ACTIVOS: RepairStatus[] = [
  'RECIBIDA', 'EN_DIAGNOSTICO', 'ESPERANDO_AUTORIZACION', 'AUTORIZADA',
  'EN_REPARACION', 'ESPERANDO_PIEZA', 'COMPLETADA', 'STAND_BY', 'EN_PROCESO',
];
const ESTADO_EN_PROCESO = new Set<string>(ESTADOS_ACTIVOS);

function safeDate(v?: string | null): string {
  if (!v) return '—';
  const match = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return '—';
  const d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-GT', { day: '2-digit', month: 'short', year: 'numeric' });
}

function safeDatetime(v?: string | null): string {
  if (!v) return '—';
  const d = new Date(v);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('es-GT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function tecnicoDisplay(ot: OrdenTrabajo): string {
  if (!ot.tecnico_asignado_id) return '';
  const nombre = ot.tecnico_nombre?.trim();
  const username = ot.tecnico_username;
  return nombre && nombre !== ' ' ? nombre : (username ?? '');
}

// ── Summary cards ──────────────────────────────────────────────────────────
function SummaryCards({ ots }: { ots: OrdenTrabajo[] }) {
  const sinAsignar = ots.filter(o => !o.tecnico_asignado_id).length;
  const asignadas  = ots.filter(o =>  o.tecnico_asignado_id && ESTADO_EN_PROCESO.has(o.estado)).length;
  const completadas = ots.filter(o => o.estado === 'COMPLETADA').length;
  const entregadas  = ots.filter(o => o.estado === 'ENTREGADA').length;

  const cards = [
    { label: 'Sin asignar', value: sinAsignar,  color: 'text-amber-600 dark:text-amber-400',   bg: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800' },
    { label: 'Asignadas',   value: asignadas,   color: 'text-blue-600 dark:text-blue-400',     bg: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800' },
    { label: 'Completadas', value: completadas, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800' },
    { label: 'Entregadas',  value: entregadas,  color: 'text-green-600 dark:text-green-400',   bg: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
      {cards.map(c => (
        <div key={c.label} className={`rounded-2xl border p-4 ${c.bg}`}>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">{c.label}</p>
          <p className={`text-3xl font-bold ${c.color}`}>{c.value}</p>
        </div>
      ))}
    </div>
  );
}

// ── Modal Asignar Técnico ──────────────────────────────────────────────────
interface ModalAsignarProps {
  ot: OrdenTrabajo;
  tecnicos: Tecnico[];
  currentUserId: number;
  onClose: () => void;
  onSuccess: () => void;
}

function ModalAsignarTecnico({ ot, tecnicos, currentUserId, onClose, onSuccess }: ModalAsignarProps) {
  const [selectedId, setSelectedId] = useState<number | ''>(ot.tecnico_asignado_id ?? '');
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');

  const handleSave = async () => {
    if (!selectedId) { setError('Selecciona un técnico'); return; }
    try {
      setSaving(true);
      setError('');
      await asignarTecnico(ot.id, { tecnico_id: selectedId as number });
      onSuccess();
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Error al asignar técnico');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full px-3 py-2 text-sm rounded-xl border bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40';

  return (
    <Modal open onClose={onClose} title={`Asignar Técnico — ${ot.id}`}>
      <div className="space-y-4 text-sm">
        <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-3 space-y-1">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Cliente: <span className="text-slate-800 dark:text-slate-200 font-semibold">{ot.cliente_nombre}</span>
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Equipo: <span className="text-slate-700 dark:text-slate-300">{[ot.marca, ot.modelo].filter(Boolean).join(' ') || ot.tipo_equipo}</span>
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Estado: <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_PILL[ot.estado] || ''}`}>{STATUS_LABEL[ot.estado] || ot.estado}</span>
          </p>
        </div>

        <div>
          <label className="block text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Técnico a asignar</label>
          <select
            className={inputCls}
            value={selectedId}
            onChange={e => { setSelectedId(e.target.value ? Number(e.target.value) : ''); setError(''); }}
          >
            <option value="">— Seleccionar técnico —</option>
            {tecnicos.map(t => (
              <option key={t.id} value={t.id}>
                {(t.nombre_completo?.trim() && t.nombre_completo !== ' ') ? t.nombre_completo : t.username}
                {t.id === currentUserId ? ' (yo)' : ''}
                {' — '}
                {t.roles.join(', ')}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl px-3 py-2">
            <AlertCircle size={12} /> {error}
          </div>
        )}

        <div className="flex gap-2 justify-end pt-1">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !selectedId}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-1.5"
          >
            {saving ? <RefreshCw size={12} className="animate-spin" /> : <Check size={12} />}
            {saving ? 'Asignando…' : 'Asignar'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── OT Row ─────────────────────────────────────────────────────────────────
interface OTRowProps {
  ot: OrdenTrabajo;
  userIsAdmin: boolean;
  onAsignar: (ot: OrdenTrabajo) => void;
  onQuitar: (ot: OrdenTrabajo) => void;
  onVerReparacion: (id: string) => void;
  onFlujo: (id: string) => void;
}

function OTRow({ ot, userIsAdmin, onAsignar, onQuitar, onVerReparacion, onFlujo }: OTRowProps) {
  const tec = tecnicoDisplay(ot);
  const isCancelled = ot.estado === 'CANCELADA';

  return (
    <div className={`border rounded-2xl p-4 shadow-sm transition-all ${isCancelled ? 'opacity-60 bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:shadow-md'}`}>
      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        {/* Left: info */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Header row */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-lg bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800">
              {ot.id}
            </span>
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_PILL[ot.estado] || 'bg-slate-100 text-slate-600 border border-slate-300'}`}>
              {STATUS_LABEL[ot.estado] || ot.estado}
            </span>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
              {ot.prioridad}
            </span>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-1.5">
            <div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wide flex items-center gap-0.5 mb-0.5"><User size={9} /> Cliente</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{ot.cliente_nombre}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{ot.cliente_telefono || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-0.5">Equipo</p>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                {[ot.marca, ot.modelo].filter(Boolean).join(' ') || ot.tipo_equipo}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{ot.tipo_equipo}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wide flex items-center gap-0.5 mb-0.5"><Calendar size={9} /> Ingreso</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">{safeDate(ot.fecha_ingreso)}</p>
            </div>
          </div>

          {/* Asignación */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs border ${ot.tecnico_asignado_id
            ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800'
            : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
          }`}>
            {ot.tecnico_asignado_id
              ? <><UserCheck size={12} className="text-blue-600 dark:text-blue-400 shrink-0" /><span className="font-semibold text-blue-700 dark:text-blue-300">Técnico: {tec}</span></>
              : <><UserX size={12} className="text-amber-600 dark:text-amber-400 shrink-0" /><span className="font-semibold text-amber-700 dark:text-amber-300">Sin asignar</span></>
            }
            {ot.asignado_en && (
              <span className="ml-auto text-slate-400 dark:text-slate-500 flex items-center gap-1">
                <Clock size={9} />{safeDatetime(ot.asignado_en)}
              </span>
            )}
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex flex-row sm:flex-col gap-1.5 sm:w-36 shrink-0 flex-wrap">
          <button
            onClick={() => onVerReparacion(ot.id)}
            className="flex-1 sm:flex-none h-9 flex items-center justify-center gap-1.5 px-2.5 rounded-xl text-xs font-semibold border bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 transition-colors"
          >
            <Eye size={12} /> Ver
          </button>
          {!isCancelled && ot.estado !== 'ENTREGADA' && (
            <button
              onClick={() => onFlujo(ot.id)}
              className="flex-1 sm:flex-none h-9 flex items-center justify-center gap-1.5 px-2.5 rounded-xl text-xs font-semibold border bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800 transition-colors"
            >
              <Wrench size={12} /> Flujo
            </button>
          )}
          {userIsAdmin && !isCancelled && (
            <button
              onClick={() => onAsignar(ot)}
              className="flex-1 sm:flex-none h-9 flex items-center justify-center gap-1.5 px-2.5 rounded-xl text-xs font-semibold border bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 transition-colors"
            >
              <UserCheck size={12} /> {ot.tecnico_asignado_id ? 'Cambiar' : 'Asignar'}
            </button>
          )}
          {userIsAdmin && ot.tecnico_asignado_id && !isCancelled && (
            <button
              onClick={() => onQuitar(ot)}
              className="flex-1 sm:flex-none h-9 flex items-center justify-center gap-1.5 px-2.5 rounded-xl text-xs font-semibold border bg-red-50 text-red-700 border-red-200 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800 transition-colors"
            >
              <X size={12} /> Quitar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function OrdenesTrabajoPage() {
  const navigate       = useNavigate();
  const { user }       = useAuth();
  const userIsAdmin    = isAdmin(user?.roles);

  const [ots,       setOts]       = useState<OrdenTrabajo[]>([]);
  const [tecnicos,  setTecnicos]  = useState<Tecnico[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [toast,     setToast]     = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Filtros
  const [busqueda,    setBusqueda]    = useState('');
  const [estadoFilt,  setEstadoFilt]  = useState('');
  const [tecnicoFilt, setTecnicoFilt] = useState('');

  // Modales
  const [asignarOT,  setAsignarOT]  = useState<OrdenTrabajo | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const filters: OTFilters = {};
      if (estadoFilt)             filters.estado     = estadoFilt;
      if (tecnicoFilt && userIsAdmin) filters.tecnico_id = Number(tecnicoFilt);
      if (busqueda)               filters.busqueda   = busqueda;
      const data = await getOrdenesTrabajo(filters);
      setOts(data);
    } catch {
      setError('No se pudieron cargar las órdenes de trabajo');
    } finally {
      setLoading(false);
    }
  }, [estadoFilt, tecnicoFilt, busqueda, userIsAdmin]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!userIsAdmin) return;
    getTecnicos().then(setTecnicos).catch(() => {});
  }, [userIsAdmin]);

  const handleQuitarAsignacion = async (ot: OrdenTrabajo) => {
    if (!window.confirm(`¿Quitar asignación de la reparación ${ot.id}?`)) return;
    try {
      await quitarAsignacion(ot.id);
      showToast('Asignación eliminada');
      load();
    } catch (e: any) {
      showToast(e?.response?.data?.message || 'Error al quitar asignación', 'error');
    }
  };

  const inputCls = 'h-9 px-3 text-sm rounded-xl border bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40';
  const selectCls = `${inputCls} pr-8 appearance-none`;

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}>
      <div className="max-w-6xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
              <ClipboardList size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Órdenes de Trabajo</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {userIsAdmin ? 'Vista administrador — todas las reparaciones' : 'Mis reparaciones asignadas'}
              </p>
            </div>
          </div>
          <button
            onClick={load}
            className="h-9 px-4 flex items-center gap-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Actualizar
          </button>
        </div>

        {/* Summary cards — solo admin */}
        {userIsAdmin && <SummaryCards ots={ots} />}

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-5">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className={`${inputCls} pl-8 w-full`}
              placeholder="Buscar por cliente, equipo, OT…"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
          </div>
          <div className="relative">
            <select className={selectCls} value={estadoFilt} onChange={e => setEstadoFilt(e.target.value)}>
              <option value="">Todos los estados</option>
              {Object.entries(STATUS_LABEL).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
          {userIsAdmin && tecnicos.length > 0 && (
            <div className="relative">
              <select className={selectCls} value={tecnicoFilt} onChange={e => setTecnicoFilt(e.target.value)}>
                <option value="">Todos los técnicos</option>
                <option value="0">Sin asignar</option>
                {tecnicos.map(t => (
                  <option key={t.id} value={t.id}>
                    {(t.nombre_completo?.trim() && t.nombre_completo !== ' ') ? t.nombre_completo : t.username}
                  </option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          )}
        </div>

        {/* Content */}
        {error && (
          <div className="flex items-center gap-2 p-4 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm mb-4">
            <AlertCircle size={14} /> {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw size={24} className="animate-spin text-blue-500" />
          </div>
        ) : ots.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-500">
            <ClipboardList size={40} className="mb-3 opacity-40" />
            <p className="text-sm font-medium">
              {userIsAdmin ? 'No hay órdenes de trabajo con esos filtros' : 'No tienes reparaciones asignadas'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">{ots.length} orden{ots.length !== 1 ? 'es' : ''}</p>
            {ots.map(ot => (
              <OTRow
                key={ot.id}
                ot={ot}
                userIsAdmin={userIsAdmin}
                onAsignar={setAsignarOT}
                onQuitar={handleQuitarAsignacion}
                onVerReparacion={id => navigate(`/reparaciones`, { state: { highlightId: id } })}
                onFlujo={id => navigate(`/flujo-reparaciones/${id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal asignar técnico */}
      {asignarOT && (
        <ModalAsignarTecnico
          ot={asignarOT}
          tecnicos={tecnicos}
          currentUserId={user?.id ?? 0}
          onClose={() => setAsignarOT(null)}
          onSuccess={() => { showToast('Técnico asignado correctamente'); load(); }}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-lg text-sm font-semibold border transition-all
          ${toast.type === 'success'
            ? 'bg-emerald-600 text-white border-emerald-700'
            : 'bg-red-600 text-white border-red-700'
          }`}
        >
          {toast.type === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
