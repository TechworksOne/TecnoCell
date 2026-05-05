import React, { useState, useEffect } from 'react';
import {
  Plus, Search, Eye, Clock, History, Printer, FileSearch,
  User, Smartphone, CalendarDays, Tag, Wrench,
  ChevronDown, DollarSign, X, AlertTriangle, CheckCircle2,
  Ban,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useRepairs } from '../../store/useRepairs';
import { Repair, RepairPriority } from '../../types/repair';
import Modal from '../../components/ui/Modal';
import ModalHistorialReparacion from '../../components/repairs/ModalHistorialReparacion';
import NuevaReparacionModal from '../../components/repairs/NuevaReparacionModal';
import { generarPDFRecepcion } from '../../lib/pdfGenerator';
import {
  getAllReparaciones,
  updatePrioridad,
  registrarPagoSaldo,
  cancelarReparacion,
} from '../../services/repairService';

// ── Style maps ────────────────────────────────────────────────────────────
const STATUS_PILL: Record<string, string> = {
  RECIBIDA:               'bg-blue-500/20 text-blue-300 border border-blue-500/30',
  EN_PROCESO:             'bg-orange-500/20 text-orange-300 border border-orange-500/30',
  EN_DIAGNOSTICO:         'bg-sky-500/20 text-sky-300 border border-sky-500/30',
  ESPERANDO_AUTORIZACION: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
  AUTORIZADA:             'bg-slate-500/20 text-slate-300 border border-slate-500/30',
  EN_REPARACION:          'bg-amber-500/20 text-amber-300 border border-amber-500/30',
  ESPERANDO_PIEZA:        'bg-purple-500/20 text-purple-300 border border-purple-500/30',
  STAND_BY:               'bg-slate-600/30 text-slate-400 border border-slate-500/20',
  COMPLETADA:             'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
  ENTREGADA:              'bg-green-500/20 text-green-300 border border-green-500/30',
  CANCELADA:              'bg-red-500/20 text-red-300 border border-red-500/30',
};
const PRIORITY_PILL: Record<string, string> = {
  BAJA:  'bg-teal-500/20 text-teal-300 border border-teal-500/30',
  MEDIA: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
  ALTA:  'bg-red-500/20 text-red-300 border border-red-500/30',
};
const STATUS_LABEL: Record<string, string> = {
  RECIBIDA: 'Recibida', EN_PROCESO: 'En Proceso', EN_DIAGNOSTICO: 'En Diagnóstico',
  ESPERANDO_AUTORIZACION: 'Esp. Autorización', AUTORIZADA: 'Autorizada',
  EN_REPARACION: 'En Reparación', ESPERANDO_PIEZA: 'Esp. Pieza',
  STAND_BY: 'Stand By', COMPLETADA: 'Completada', ENTREGADA: 'Entregada', CANCELADA: 'Cancelada',
};

// ── Helpers ───────────────────────────────────────────────────────────────
function safeDate(v?: string | null): string {
  if (!v) return 'No registrada';
  // Always extract the YYYY-MM-DD part and parse as local time to avoid UTC offset shifting the date
  const match = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return 'No registrada';
  const d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (isNaN(d.getTime())) return 'No registrada';
  return d.toLocaleDateString('es-GT', { day: '2-digit', month: 'short', year: 'numeric' });
}

function calcSaldo(r: Repair): number {
  const total = r.total || 0;
  const pagado = (r.recepcion.montoAnticipo || 0) + (r.montoPagadoAdicional || 0);
  return Math.max(0, total - pagado);
}

function calcTotalPagado(r: Repair): number {
  return (r.recepcion.montoAnticipo || 0) + (r.montoPagadoAdicional || 0);
}

// ── Modal: Editar prioridad ───────────────────────────────────────────────
function ModalEditarPrioridad({
  repair,
  onClose,
  onSuccess,
}: { repair: Repair; onClose: () => void; onSuccess: (id: string, p: RepairPriority) => void }) {
  const [prioridad, setPrioridad] = useState<RepairPriority>(repair.prioridad);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (prioridad === repair.prioridad) { onClose(); return; }
    try {
      setSaving(true);
      setError('');
      await updatePrioridad(repair.id, prioridad);
      onSuccess(repair.id, prioridad);
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Error al actualizar la prioridad');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={`Editar Prioridad — ${repair.id}`}>
      <div className="space-y-4 text-sm">
        <p className="text-slate-400">
          Reparación: <span className="text-slate-200 font-medium">{repair.clienteNombre}</span>
          {' · '}{[repair.recepcion.marca, repair.recepcion.modelo].filter(Boolean).join(' ')}
        </p>
        <div>
          <label className="block text-[10px] text-slate-400 uppercase tracking-wide mb-1.5">Nueva prioridad</label>
          <div className="flex gap-2">
            {(['BAJA', 'MEDIA', 'ALTA'] as RepairPriority[]).map(p => (
              <button
                key={p}
                onClick={() => setPrioridad(p)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors ${
                  prioridad === p
                    ? PRIORITY_PILL[p] + ' ring-2 ring-offset-1 ring-offset-[#0D1526] ring-current'
                    : 'bg-slate-800/40 text-slate-400 border-slate-600/30 hover:bg-slate-700/40'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        {error && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs">
            <AlertTriangle size={13} /> {error}
          </div>
        )}
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl text-xs font-semibold border border-slate-600/40 text-slate-400 hover:bg-slate-700/30 transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2 rounded-xl text-xs font-semibold bg-[#48B9E6] hover:bg-[#35a8d5] text-white transition-colors disabled:opacity-50"
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Modal: Pago de saldo pendiente ────────────────────────────────────────
function ModalPagoSaldo({
  repair,
  onClose,
  onSuccess,
}: { repair: Repair; onClose: () => void; onSuccess: (id: string, montoPagado: number, metodo: string) => void }) {
  const saldoPendiente = calcSaldo(repair);
  const [monto, setMonto] = useState(saldoPendiente.toFixed(2));
  const [metodo, setMetodo] = useState<'efectivo' | 'tarjeta'>('efectivo');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handlePagar = async () => {
    const montoNum = parseFloat(monto);
    if (isNaN(montoNum) || montoNum <= 0) {
      setError('Ingresa un monto válido mayor a cero');
      return;
    }
    if (montoNum > saldoPendiente + 0.005) {
      setError(`El monto no puede exceder el saldo pendiente de Q${saldoPendiente.toFixed(2)}`);
      return;
    }
    try {
      setSaving(true);
      setError('');
      await registrarPagoSaldo(repair.id, montoNum, metodo);
      onSuccess(repair.id, montoNum, metodo);
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Error al registrar el pago');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={`Registrar Pago — ${repair.id}`}>
      <div className="space-y-4 text-sm">
        {/* Resumen financiero */}
        <div className="bg-[#0A1220] rounded-xl p-3 grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-[10px] text-slate-500 mb-0.5">Total</p>
            <p className="text-slate-100 font-bold">Q{(repair.total || 0).toFixed(2)}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 mb-0.5">Ya pagado</p>
            <p className="text-emerald-400 font-bold">Q{calcTotalPagado(repair).toFixed(2)}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 mb-0.5">Saldo pendiente</p>
            <p className="text-amber-300 font-bold">Q{saldoPendiente.toFixed(2)}</p>
          </div>
        </div>

        {/* Monto */}
        <div>
          <label className="block text-[10px] text-slate-400 uppercase tracking-wide mb-1.5">Monto a pagar (Q)</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            max={saldoPendiente}
            value={monto}
            onChange={e => { setMonto(e.target.value); setError(''); }}
            className="w-full px-3 py-2 text-sm bg-[#0D1526] border border-[rgba(72,185,230,0.16)] rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#48B9E6]/40"
          />
        </div>

        {/* Método de pago */}
        <div>
          <label className="block text-[10px] text-slate-400 uppercase tracking-wide mb-1.5">Método de pago</label>
          <div className="flex gap-2">
            {(['efectivo', 'tarjeta'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMetodo(m)}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold border capitalize transition-colors ${
                  metodo === m
                    ? 'bg-[#48B9E6]/15 text-[#48B9E6] border-[#48B9E6]/30'
                    : 'bg-slate-800/40 text-slate-400 border-slate-600/30 hover:bg-slate-700/40'
                }`}
              >
                {m === 'efectivo' ? '💵 Efectivo' : '💳 Tarjeta'}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs">
            <AlertTriangle size={13} /> {error}
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl text-xs font-semibold border border-slate-600/40 text-slate-400 hover:bg-slate-700/30 transition-colors">
            Cancelar
          </button>
          <button
            onClick={handlePagar}
            disabled={saving}
            className="flex-1 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50"
          >
            {saving ? 'Registrando…' : 'Registrar Pago'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Modal: Cancelar reparación ────────────────────────────────────────────
function ModalCancelar({
  repair,
  onClose,
  onSuccess,
}: { repair: Repair; onClose: () => void; onSuccess: (id: string) => void }) {
  const [motivo, setMotivo] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleCancelar = async () => {
    if (!motivo.trim()) { setError('El motivo es requerido'); return; }
    try {
      setSaving(true);
      setError('');
      await cancelarReparacion(repair.id, motivo.trim());
      onSuccess(repair.id);
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Error al cancelar la reparación');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={`Cancelar Reparación — ${repair.id}`}>
      <div className="space-y-4 text-sm">
        <div className="flex items-start gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
          <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-red-300 font-semibold text-xs">¿Confirmas la cancelación?</p>
            <p className="text-red-400/80 text-xs mt-0.5">
              Esta acción no se puede deshacer. La reparación quedará bloqueada para nuevos pagos y gestión de flujo.
            </p>
          </div>
        </div>

        <p className="text-slate-400 text-xs">
          Cliente: <span className="text-slate-200 font-medium">{repair.clienteNombre}</span>
          {' · '}{[repair.recepcion.marca, repair.recepcion.modelo].filter(Boolean).join(' ')}
        </p>

        <div>
          <label className="block text-[10px] text-slate-400 uppercase tracking-wide mb-1.5">Motivo de cancelación *</label>
          <textarea
            rows={3}
            placeholder="Ej: Cliente desistió de la reparación..."
            value={motivo}
            onChange={e => { setMotivo(e.target.value); setError(''); }}
            className="w-full px-3 py-2 text-sm bg-[#0D1526] border border-[rgba(72,185,230,0.16)] rounded-xl text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#48B9E6]/40 resize-none"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs">
            <AlertTriangle size={13} /> {error}
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl text-xs font-semibold border border-slate-600/40 text-slate-400 hover:bg-slate-700/30 transition-colors">
            No cancelar
          </button>
          <button
            onClick={handleCancelar}
            disabled={saving}
            className="flex-1 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50"
          >
            {saving ? 'Cancelando…' : 'Sí, Cancelar'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── RepairCard ────────────────────────────────────────────────────────────
function RepairCard({
  repair,
  onViewDetail,
  onHistory,
  onFlowManage,
  onPrintPDF,
  onEditPriority,
  onPayBalance,
  onCancel,
}: {
  repair: Repair;
  onViewDetail: (r: Repair) => void;
  onHistory: (id: string) => void;
  onFlowManage: () => void;
  onPrintPDF: (r: Repair) => void;
  onEditPriority: (r: Repair) => void;
  onPayBalance: (r: Repair) => void;
  onCancel: (r: Repair) => void;
}) {
  const isCancelled = repair.estado === 'CANCELADA';
  const saldo = calcSaldo(repair);
  const totalPagado = calcTotalPagado(repair);
  const isPaid = repair.total > 0 && saldo <= 0;
  const hasTotal = repair.total > 0;

  return (
    <div className={`bg-[#0D1526] border rounded-2xl p-4 transition-colors ${isCancelled ? 'border-red-500/20 opacity-80' : 'border-[rgba(72,185,230,0.12)] hover:border-[rgba(72,185,230,0.25)]'}`}>
      {/* Badges row */}
      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-lg bg-[#48B9E6]/10 text-[#48B9E6] border border-[#48B9E6]/20">
          {repair.id}
        </span>
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_PILL[repair.estado] || 'bg-slate-700 text-slate-300'}`}>
          {STATUS_LABEL[repair.estado] || repair.estado.replace(/_/g, ' ')}
        </span>
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${PRIORITY_PILL[repair.prioridad] || 'bg-slate-700 text-slate-300'}`}>
          {repair.prioridad}
        </span>
        {repair.garantiaDias > 0 && !isCancelled && (
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
            Garantía {repair.garantiaDias}d
          </span>
        )}
        {repair.stickerSerieInterna && (
          <span className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/20">
            <Tag size={9} />{repair.stickerSerieInterna}
          </span>
        )}
        {/* Payment status badge */}
        {hasTotal && !isCancelled && (
          isPaid
            ? <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/20"><CheckCircle2 size={9} /> Pagada</span>
            : <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/20">Saldo: Q{saldo.toFixed(2)}</span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-col lg:flex-row gap-3">
        {/* Info grid */}
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-2.5 min-w-0">
          {/* Cliente */}
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wide flex items-center gap-1 mb-0.5"><User size={9} /> Cliente</p>
            <p className="text-sm font-semibold text-slate-100 leading-tight truncate">{repair.clienteNombre || 'No registrado'}</p>
            {repair.clienteTelefono && <p className="text-xs text-slate-400 mt-0.5">{repair.clienteTelefono}</p>}
            {repair.recepcion.montoAnticipo && repair.recepcion.montoAnticipo > 0 && (
              <p className="text-xs font-semibold text-emerald-400 mt-1">
                Anticipo: Q{repair.recepcion.montoAnticipo.toFixed(2)}
                {repair.recepcion.metodoAnticipo && (
                  <span className="font-normal text-slate-500 ml-1">
                    ({repair.recepcion.metodoAnticipo.replace('tarjeta_', 'tarjeta ')})
                  </span>
                )}
              </p>
            )}
            {repair.montoPagadoAdicional && repair.montoPagadoAdicional > 0 && (
              <p className="text-xs font-semibold text-emerald-300 mt-0.5">
                + Q{repair.montoPagadoAdicional.toFixed(2)}
                {repair.metodoPagoAdicional && (
                  <span className="font-normal text-slate-500 ml-1">({repair.metodoPagoAdicional})</span>
                )}
              </p>
            )}
          </div>

          {/* Equipo */}
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wide flex items-center gap-1 mb-0.5"><Smartphone size={9} /> Equipo</p>
            <p className="text-sm font-semibold text-slate-100 leading-tight">
              {[repair.recepcion.marca, repair.recepcion.modelo].filter(Boolean).join(' ') || 'No registrado'}
            </p>
            {(repair.recepcion.tipoEquipo || repair.recepcion.color) && (
              <p className="text-xs text-slate-400 mt-0.5">{[repair.recepcion.tipoEquipo, repair.recepcion.color].filter(Boolean).join(' · ')}</p>
            )}
            {repair.recepcion.imei && <p className="text-[10px] text-slate-500 font-mono mt-0.5">IMEI: {repair.recepcion.imei}</p>}
          </div>

          {/* Fecha + diagnóstico */}
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wide flex items-center gap-1 mb-0.5"><CalendarDays size={9} /> Ingreso</p>
            <p className="text-sm text-slate-200">{safeDate(repair.fechaIngreso)}</p>
            {repair.tecnicoAsignado && <p className="text-xs text-slate-400 mt-0.5">Técnico: {repair.tecnicoAsignado}</p>}
            {repair.recepcion.diagnosticoInicial && (
              <p className="text-[11px] text-slate-400 italic mt-1 line-clamp-2 border-l-2 border-[rgba(72,185,230,0.2)] pl-1.5">
                {repair.recepcion.diagnosticoInicial}
              </p>
            )}
            {isCancelled && repair.motivoCancelacion && (
              <p className="text-[11px] text-red-400/70 italic mt-1 border-l-2 border-red-500/20 pl-1.5 line-clamp-2">
                Cancelado: {repair.motivoCancelacion}
              </p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-row flex-wrap lg:flex-col gap-1.5 lg:w-36 lg:shrink-0">
          <button onClick={() => onViewDetail(repair)} className="flex-1 lg:flex-none flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-blue-600/15 hover:bg-blue-600/25 text-blue-300 border border-blue-600/20 transition-colors">
            <Eye size={12} /> Ver Detalle
          </button>
          <button onClick={() => onHistory(repair.id)} className="flex-1 lg:flex-none flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-300 border border-emerald-600/20 transition-colors">
            <History size={12} /> Ver Historial
          </button>
          {!isCancelled && (
            <button onClick={onFlowManage} className="flex-1 lg:flex-none flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-orange-600/15 hover:bg-orange-600/25 text-orange-300 border border-orange-600/20 transition-colors">
              <Clock size={12} /> Flujo
            </button>
          )}
          <button onClick={() => onPrintPDF(repair)} className="flex-1 lg:flex-none flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-600/20 hover:bg-slate-600/35 text-slate-300 border border-slate-500/20 transition-colors">
            <Printer size={12} /> PDF
          </button>
          {!isCancelled && (
            <button onClick={() => onEditPriority(repair)} className="flex-1 lg:flex-none flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600/15 hover:bg-indigo-600/25 text-indigo-300 border border-indigo-600/20 transition-colors">
              <ChevronDown size={12} /> Prioridad
            </button>
          )}
          {!isCancelled && hasTotal && !isPaid && (
            <button onClick={() => onPayBalance(repair)} className="flex-1 lg:flex-none flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-700/20 hover:bg-emerald-700/35 text-emerald-200 border border-emerald-600/25 transition-colors">
              <DollarSign size={12} /> Pagar Saldo
            </button>
          )}
          {!isCancelled && repair.estado !== 'ENTREGADA' && (
            <button onClick={() => onCancel(repair)} className="flex-1 lg:flex-none flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-600/20 transition-colors">
              <Ban size={12} /> Cancelar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────
export default function RepairsPage() {
  const navigate = useNavigate();
  const { repairs, deleteRepair, changeRepairState, updateRepair, searchRepairs, isLoading, validateStickerUniqueness } = useRepairs();

  const [searchQuery,    setSearchQuery]    = useState('');
  const [statusFilter,   setStatusFilter]   = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [selectedRepair, setSelectedRepair] = useState<Repair | null>(null);
  const [showDetailModal,   setShowDetailModal]   = useState(false);
  const [showHistoryModal,  setShowHistoryModal]  = useState<string | null>(null);
  const [showPriorityModal, setShowPriorityModal] = useState<Repair | null>(null);
  const [showPayModal,      setShowPayModal]      = useState<Repair | null>(null);
  const [showCancelModal,   setShowCancelModal]   = useState<Repair | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [loadingRepairs, setLoadingRepairs] = useState(true);
  const [backendRepairs, setBackendRepairs] = useState<Repair[]>([]);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => { loadRepairs(); }, []);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadRepairs = async () => {
    try {
      setLoadingRepairs(true);
      setBackendRepairs(await getAllReparaciones());
    } catch (e) {
      console.error('Error cargando reparaciones:', e);
      showToast('Error al cargar reparaciones', 'error');
    } finally {
      setLoadingRepairs(false);
    }
  };

  // ── Optimistic updates ────────────────────────────────────────────────
  const handlePrioritySuccess = (id: string, prioridad: RepairPriority) => {
    setBackendRepairs(prev => prev.map(r => r.id === id ? { ...r, prioridad } : r));
    if (selectedRepair?.id === id) setSelectedRepair(prev => prev ? { ...prev, prioridad } : prev);
    showToast('Prioridad actualizada');
  };

  const handlePaySuccess = (id: string, montoPagado: number, metodo: string) => {
    setBackendRepairs(prev => prev.map(r => {
      if (r.id !== id) return r;
      const nuevoPagado = (r.montoPagadoAdicional || 0) + montoPagado;
      return { ...r, montoPagadoAdicional: nuevoPagado, metodoPagoAdicional: metodo as any };
    }));
    if (selectedRepair?.id === id) {
      setSelectedRepair(prev => prev ? {
        ...prev,
        montoPagadoAdicional: (prev.montoPagadoAdicional || 0) + montoPagado,
        metodoPagoAdicional: metodo as any,
      } : prev);
    }
    showToast('Pago registrado exitosamente');
  };

  const handleCancelSuccess = (id: string) => {
    setBackendRepairs(prev => prev.map(r =>
      r.id === id ? { ...r, estado: 'CANCELADA' as any } : r
    ));
    if (selectedRepair?.id === id) setSelectedRepair(prev => prev ? { ...prev, estado: 'CANCELADA' as any } : prev);
    showToast('Reparación cancelada');
  };

  const handleRepairCreated = async () => {
    showToast('Reparación creada exitosamente');
    await loadRepairs();
  };

  // ── Filters ───────────────────────────────────────────────────────────
  const filteredRepairs = backendRepairs.filter(r => {
    const q = searchQuery.toLowerCase();
    const okSearch = !q ||
      r.clienteNombre?.toLowerCase().includes(q) ||
      r.recepcion.marca?.toLowerCase().includes(q) ||
      r.recepcion.modelo?.toLowerCase().includes(q) ||
      r.recepcion.imei?.toLowerCase().includes(q) ||
      r.id?.toLowerCase().includes(q);
    return okSearch &&
      (!statusFilter || r.estado === statusFilter) &&
      (!priorityFilter || r.prioridad === priorityFilter);
  });

  // ── PDF helpers ───────────────────────────────────────────────────────
  const buildPayload = (r: Repair) => ({
    cliente: { nombre: r.clienteNombre, telefono: r.clienteTelefono ?? '', email: r.clienteEmail },
    equipo: {
      tipo: r.recepcion.tipoEquipo,
      marca: r.recepcion.marca ?? '',
      modelo: r.recepcion.modelo ?? '',
      color: r.recepcion.color ?? '',
      imei: r.recepcion.imei ?? r.recepcion.imeiSerie,
      contraseña: r.recepcion.contraseña ?? r.recepcion.patronContraseña,
      diagnostico: r.recepcion.diagnosticoInicial ?? '',
    },
    numeroReparacion: r.id,
    fecha: r.recepcion.fechaRecepcion || new Date().toISOString().split('T')[0],
  });
  const handleGeneratePDF = (r: Repair) => generarPDFRecepcion(buildPayload(r), false);
  const handlePreviewPDF  = (r: Repair) => generarPDFRecepcion(buildPayload(r), true);

  return (
    <div className="space-y-4">
      {/* Toast notification */}
      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-xl text-sm font-semibold transition-all ${
          toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight">Reparaciones</h1>
          <p className="text-xs text-slate-400 mt-0.5">Gestión de equipos en servicio técnico</p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-2 bg-[#48B9E6] hover:bg-[#35a8d5] text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors whitespace-nowrap self-start sm:self-auto"
        >
          <Plus size={16} /> Nueva Reparación
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 min-w-0">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por cliente, equipo, código, IMEI..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-[#0D1526] border border-[rgba(72,185,230,0.16)] rounded-xl text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#48B9E6]/40"
          />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="text-sm bg-[#0D1526] border border-[rgba(72,185,230,0.16)] rounded-xl px-3 py-2 text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#48B9E6]/40 sm:w-44">
          <option value="">Todos los estados</option>
          <option value="RECIBIDA">Recibida</option>
          <option value="EN_DIAGNOSTICO">En Diagnóstico</option>
          <option value="EN_REPARACION">En Reparación</option>
          <option value="ESPERANDO_PIEZA">Esperando Pieza</option>
          <option value="COMPLETADA">Completada</option>
          <option value="ENTREGADA">Entregada</option>
          <option value="CANCELADA">Cancelada</option>
        </select>
        <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}
          className="text-sm bg-[#0D1526] border border-[rgba(72,185,230,0.16)] rounded-xl px-3 py-2 text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#48B9E6]/40 sm:w-44">
          <option value="">Todas las prioridades</option>
          <option value="BAJA">Baja</option>
          <option value="MEDIA">Media</option>
          <option value="ALTA">Alta</option>
        </select>
      </div>

      {/* Count */}
      {!loadingRepairs && (
        <p className="text-xs text-slate-500">
          {filteredRepairs.length} reparación{filteredRepairs.length !== 1 ? 'es' : ''}
          {(searchQuery || statusFilter || priorityFilter) ? ' (filtradas)' : ''}
        </p>
      )}

      {/* List */}
      <div className="space-y-2">
        {loadingRepairs ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#48B9E6] border-t-transparent mb-3" />
            <p className="text-sm">Cargando reparaciones...</p>
          </div>
        ) : filteredRepairs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Wrench size={40} className="mb-3 text-slate-600" />
            <p className="text-sm font-medium text-slate-400">No se encontraron reparaciones</p>
            <p className="text-xs mt-1 text-slate-500">
              {searchQuery || statusFilter || priorityFilter
                ? 'Prueba ajustando los filtros'
                : 'Crea tu primera reparación con el botón de arriba'}
            </p>
          </div>
        ) : filteredRepairs.map(r => (
          <RepairCard
            key={r.id}
            repair={r}
            onViewDetail={rep => { setSelectedRepair(rep); setShowDetailModal(true); }}
            onHistory={id => setShowHistoryModal(id)}
            onFlowManage={() => navigate('/flujo-reparaciones')}
            onPrintPDF={handleGeneratePDF}
            onEditPriority={rep => setShowPriorityModal(rep)}
            onPayBalance={rep => setShowPayModal(rep)}
            onCancel={rep => setShowCancelModal(rep)}
          />
        ))}
      </div>

      {/* ── Modals ── */}

      {/* Historial */}
      {showHistoryModal && (
        <ModalHistorialReparacion
          isOpen
          onClose={() => setShowHistoryModal(null)}
          reparacionId={showHistoryModal}
        />
      )}

      {/* Editar prioridad */}
      {showPriorityModal && (
        <ModalEditarPrioridad
          repair={showPriorityModal}
          onClose={() => setShowPriorityModal(null)}
          onSuccess={handlePrioritySuccess}
        />
      )}

      {/* Pago saldo pendiente */}
      {showPayModal && (
        <ModalPagoSaldo
          repair={showPayModal}
          onClose={() => setShowPayModal(null)}
          onSuccess={handlePaySuccess}
        />
      )}

      {/* Cancelar */}
      {showCancelModal && (
        <ModalCancelar
          repair={showCancelModal}
          onClose={() => setShowCancelModal(null)}
          onSuccess={handleCancelSuccess}
        />
      )}

      {/* Detalle modal */}
      {showDetailModal && selectedRepair && (() => {
        const r = selectedRepair;
        const saldo = calcSaldo(r);
        const totalPagado = calcTotalPagado(r);
        const isPaid = r.total > 0 && saldo <= 0;
        const isCancelled = r.estado === 'CANCELADA';
        return (
          <Modal
            open={showDetailModal}
            onClose={() => { setShowDetailModal(false); setSelectedRepair(null); }}
            title={`Detalle — ${r.id}`}
          >
            <div className="space-y-4 text-sm">
              {/* Cancelled banner */}
              {isCancelled && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                  <Ban size={14} className="text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-red-300 font-semibold text-xs">Reparación Cancelada</p>
                    {r.motivoCancelacion && <p className="text-red-400/70 text-xs mt-0.5">{r.motivoCancelacion}</p>}
                    {r.fechaCancelacion && <p className="text-red-400/50 text-xs mt-0.5">Fecha: {safeDate(r.fechaCancelacion)}</p>}
                  </div>
                </div>
              )}

              {/* Cliente */}
              <section>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5 flex items-center gap-1"><User size={10} /> Cliente</p>
                <div className="bg-[#0A1220] rounded-xl p-3 grid grid-cols-2 gap-2">
                  <div><p className="text-[10px] text-slate-500">Nombre</p><p className="text-slate-100 font-medium">{r.clienteNombre || '—'}</p></div>
                  <div><p className="text-[10px] text-slate-500">Teléfono</p><p className="text-slate-100 font-medium">{r.clienteTelefono || '—'}</p></div>
                  {r.clienteEmail && <div className="col-span-2"><p className="text-[10px] text-slate-500">Email</p><p className="text-slate-100">{r.clienteEmail}</p></div>}
                </div>
              </section>

              {/* Equipo */}
              <section>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5 flex items-center gap-1"><Smartphone size={10} /> Equipo</p>
                <div className="bg-[#0A1220] rounded-xl p-3 grid grid-cols-2 gap-2">
                  <div><p className="text-[10px] text-slate-500">Tipo</p><p className="text-slate-100 font-medium">{r.recepcion.tipoEquipo || '—'}</p></div>
                  <div><p className="text-[10px] text-slate-500">Marca / Modelo</p><p className="text-slate-100 font-medium">{[r.recepcion.marca, r.recepcion.modelo].filter(Boolean).join(' ') || '—'}</p></div>
                  <div><p className="text-[10px] text-slate-500">Color</p><p className="text-slate-100">{r.recepcion.color || '—'}</p></div>
                  {r.recepcion.imei && <div><p className="text-[10px] text-slate-500">IMEI / Serie</p><p className="text-slate-100 font-mono text-xs">{r.recepcion.imei}</p></div>}
                  {r.recepcion.contraseña && <div><p className="text-[10px] text-slate-500">Contraseña</p><p className="text-slate-100">{r.recepcion.contraseña}</p></div>}
                  {r.recepcion.diagnosticoInicial && (
                    <div className="col-span-2"><p className="text-[10px] text-slate-500">Diagnóstico inicial</p><p className="text-slate-300 italic mt-0.5">{r.recepcion.diagnosticoInicial}</p></div>
                  )}
                </div>
              </section>

              {/* Estado */}
              <section>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Estado y asignación</p>
                <div className="bg-[#0A1220] rounded-xl p-3 grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[10px] text-slate-500 mb-1">Estado</p>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_PILL[r.estado] || 'bg-slate-700 text-slate-300'}`}>
                      {STATUS_LABEL[r.estado] || r.estado.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 mb-1">Prioridad</p>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${PRIORITY_PILL[r.prioridad] || 'bg-slate-700 text-slate-300'}`}>
                      {r.prioridad}
                    </span>
                  </div>
                  {r.tecnicoAsignado && <div className="col-span-2"><p className="text-[10px] text-slate-500">Técnico</p><p className="text-slate-100">{r.tecnicoAsignado}</p></div>}
                  <div><p className="text-[10px] text-slate-500">Fecha ingreso</p><p className="text-slate-100">{safeDate(r.fechaIngreso)}</p></div>
                </div>
              </section>

              {/* Resumen económico — solo mostrar cuando ya hay un total definido */}
              {r.total > 0 && (
              <section>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Resumen económico</p>
                <div className="bg-[#0A1220] rounded-xl p-3 space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-400"><span>Subtotal</span><span className="text-slate-200">Q{(r.subtotal || 0).toFixed(2)}</span></div>
                  <div className="flex justify-between text-xs text-slate-400"><span>Impuestos</span><span className="text-slate-200">Q{(r.impuestos || 0).toFixed(2)}</span></div>
                  <div className="flex justify-between font-bold border-t border-[rgba(72,185,230,0.12)] pt-1.5">
                    <span className="text-slate-200">Total</span>
                    <span className="text-emerald-400 text-base">
                      {r.total > 0 ? `Q${r.total.toFixed(2)}` : 'No definido'}
                    </span>
                  </div>
                  {r.total > 0 && (
                    <>
                      <div className="flex justify-between text-xs text-slate-400 pt-1 border-t border-[rgba(72,185,230,0.06)]">
                        <span>Anticipo recibido
                          {r.recepcion.metodoAnticipo && (
                            <span className="ml-1 text-slate-500">({r.recepcion.metodoAnticipo.replace('tarjeta_', 'tarjeta ')})</span>
                          )}
                        </span>
                        <span className="text-emerald-300">Q{(r.recepcion.montoAnticipo || 0).toFixed(2)}</span>
                      </div>
                      {(r.montoPagadoAdicional || 0) > 0 && (
                        <div className="flex justify-between text-xs text-slate-400">
                          <span>Pago adicional
                            {r.metodoPagoAdicional && <span className="ml-1 text-slate-500">({r.metodoPagoAdicional})</span>}
                          </span>
                          <span className="text-emerald-300">Q{(r.montoPagadoAdicional || 0).toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-xs font-semibold pt-1 border-t border-[rgba(72,185,230,0.06)]">
                        <span className={saldo > 0 ? 'text-amber-300' : 'text-emerald-400'}>
                          {saldo > 0 ? 'Saldo pendiente' : '✓ Pagada'}
                        </span>
                        <span className={saldo > 0 ? 'text-amber-300' : 'text-emerald-400'}>
                          {saldo > 0 ? `Q${saldo.toFixed(2)}` : 'Q0.00'}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </section>
              )} {/* end r.total > 0 */}

              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-1">
                <button onClick={() => handlePreviewPDF(r)} className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-xl border border-[rgba(72,185,230,0.2)] text-[#48B9E6] hover:bg-[#48B9E6]/10 transition-colors">
                  <FileSearch size={13} /> Vista previa
                </button>
                <button onClick={() => handleGeneratePDF(r)} className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors">
                  <Printer size={13} /> Imprimir PDF
                </button>
                {!isCancelled && (
                  <button onClick={() => navigate('/flujo-reparaciones')} className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white transition-colors">
                    <Clock size={13} /> Gestionar Flujo
                  </button>
                )}
                {!isCancelled && (
                  <button
                    onClick={() => { setShowDetailModal(false); setShowPriorityModal(r); }}
                    className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-xl bg-indigo-700/30 hover:bg-indigo-700/50 text-indigo-300 transition-colors"
                  >
                    <ChevronDown size={13} /> Editar Prioridad
                  </button>
                )}
                {!isCancelled && r.total > 0 && saldo > 0 && (
                  <button
                    onClick={() => { setShowDetailModal(false); setShowPayModal(r); }}
                    className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white transition-colors"
                  >
                    <DollarSign size={13} /> Pagar Saldo
                  </button>
                )}
              </div>
            </div>
          </Modal>
        );
      })()}

      {/* Nueva Reparación Modal */}
      <NuevaReparacionModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={handleRepairCreated}
      />
    </div>
  );
}
