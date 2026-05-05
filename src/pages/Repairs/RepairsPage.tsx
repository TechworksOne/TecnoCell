import React, { useState, useEffect } from 'react';
import {
  Plus, Search, Eye, Clock, History, Printer, FileSearch,
  User, Smartphone, CalendarDays, Tag, Wrench,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useRepairs } from '../../store/useRepairs';
import { Repair } from '../../types/repair';
import Modal from '../../components/ui/Modal';
import ModalHistorialReparacion from '../../components/repairs/ModalHistorialReparacion';
import { generarPDFRecepcion } from '../../lib/pdfGenerator';
import { getAllReparaciones } from '../../services/repairService';

// ── Badge style maps ──────────────────────────────────────────────────────
const STATUS_PILL: Record<string, string> = {
  RECIBIDA:              'bg-blue-500/20 text-blue-300 border border-blue-500/30',
  EN_PROCESO:            'bg-orange-500/20 text-orange-300 border border-orange-500/30',
  EN_DIAGNOSTICO:        'bg-sky-500/20 text-sky-300 border border-sky-500/30',
  ESPERANDO_AUTORIZACION:'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
  AUTORIZADA:            'bg-slate-500/20 text-slate-300 border border-slate-500/30',
  EN_REPARACION:         'bg-amber-500/20 text-amber-300 border border-amber-500/30',
  ESPERANDO_PIEZA:       'bg-purple-500/20 text-purple-300 border border-purple-500/30',
  STAND_BY:              'bg-slate-600/30 text-slate-400 border border-slate-500/20',
  COMPLETADA:            'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
  ENTREGADA:             'bg-green-500/20 text-green-300 border border-green-500/30',
  CANCELADA:             'bg-red-500/20 text-red-300 border border-red-500/30',
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

function safeDate(v?: string | null) {
  if (!v) return '—';
  const d = new Date(String(v).replace(' ', 'T'));
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-GT', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── RepairCard ────────────────────────────────────────────────────────────
function RepairCard({ repair, onViewDetail, onHistory, onFlowManage, onPrintPDF }: {
  repair: Repair;
  onViewDetail: (r: Repair) => void;
  onHistory: (id: string) => void;
  onFlowManage: () => void;
  onPrintPDF: (r: Repair) => void;
}) {
  return (
    <div className="bg-[#0D1526] border border-[rgba(72,185,230,0.12)] rounded-2xl p-4 hover:border-[rgba(72,185,230,0.25)] transition-colors">
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
        {repair.garantiaDias > 0 && (
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
            Garantía {repair.garantiaDias}d
          </span>
        )}
        {repair.stickerSerieInterna && (
          <span className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/20">
            <Tag size={9} />{repair.stickerSerieInterna}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-2.5 min-w-0">
          {/* Cliente */}
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wide flex items-center gap-1 mb-0.5"><User size={9} /> Cliente</p>
            <p className="text-sm font-semibold text-slate-100 leading-tight truncate">{repair.clienteNombre || 'No registrado'}</p>
            {repair.clienteTelefono && <p className="text-xs text-slate-400 mt-0.5">{repair.clienteTelefono}</p>}
            {repair.recepcion.montoAnticipo && repair.recepcion.montoAnticipo > 0 && (
              <p className="text-xs font-semibold text-emerald-400 mt-1">
                Anticipo: Q{repair.recepcion.montoAnticipo.toFixed(2)}
                {repair.recepcion.metodoAnticipo && <span className="font-normal text-slate-500 ml-1">({repair.recepcion.metodoAnticipo})</span>}
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
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-row flex-wrap lg:flex-col gap-1.5 lg:w-36 lg:shrink-0">
          <button onClick={() => onViewDetail(repair)} className="flex-1 lg:flex-none flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-blue-600/15 hover:bg-blue-600/25 text-blue-300 border border-blue-600/20 transition-colors">
            <Eye size={12} /> Ver Detalle
          </button>
          <button onClick={() => onHistory(repair.id)} className="flex-1 lg:flex-none flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-300 border border-emerald-600/20 transition-colors">
            <History size={12} /> Ver Historial
          </button>
          <button onClick={onFlowManage} className="flex-1 lg:flex-none flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-orange-600/15 hover:bg-orange-600/25 text-orange-300 border border-orange-600/20 transition-colors">
            <Clock size={12} /> Gestionar Flujo
          </button>
          <button onClick={() => onPrintPDF(repair)} className="flex-1 lg:flex-none flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-600/20 hover:bg-slate-600/35 text-slate-300 border border-slate-500/20 transition-colors">
            <Printer size={12} /> Imprimir PDF
          </button>
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
  const [showDetailModal,  setShowDetailModal]  = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState<string | null>(null);
  const [loadingRepairs, setLoadingRepairs] = useState(true);
  const [backendRepairs, setBackendRepairs] = useState<Repair[]>([]);

  useEffect(() => { loadRepairs(); }, []);

  const loadRepairs = async () => {
    try {
      setLoadingRepairs(true);
      setBackendRepairs(await getAllReparaciones());
    } catch (e) {
      console.error('Error cargando reparaciones:', e);
    } finally {
      setLoadingRepairs(false);
    }
  };

  const filteredRepairs = backendRepairs.filter(r => {
    const q = searchQuery.toLowerCase();
    const ok = !q || r.clienteNombre?.toLowerCase().includes(q) || r.recepcion.marca?.toLowerCase().includes(q) ||
      r.recepcion.modelo?.toLowerCase().includes(q) || r.recepcion.imei?.toLowerCase().includes(q) || r.id?.toLowerCase().includes(q);
    return ok && (!statusFilter || r.estado === statusFilter) && (!priorityFilter || r.prioridad === priorityFilter);
  });

  const handleViewDetail = (r: Repair) => { setSelectedRepair(r); setShowDetailModal(true); };

  const buildPayload = (r: Repair) => ({
    cliente: { nombre: r.clienteNombre, telefono: r.clienteTelefono, email: r.clienteEmail },
    equipo: { tipo: r.recepcion.tipoEquipo, marca: r.recepcion.marca, modelo: r.recepcion.modelo, color: r.recepcion.color, imei: r.recepcion.imei, contraseña: r.recepcion.contraseña, diagnostico: r.recepcion.diagnosticoInicial },
    numeroReparacion: r.id,
    fecha: r.recepcion.fechaRecepcion || new Date().toISOString().split('T')[0],
  });

  const handleGeneratePDF = (r: Repair) => generarPDFRecepcion(buildPayload(r), false);
  const handlePreviewPDF  = (r: Repair) => generarPDFRecepcion(buildPayload(r), true);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight">Reparaciones</h1>
          <p className="text-xs text-slate-400 mt-0.5">Gestión de equipos en servicio técnico</p>
        </div>
        <button
          onClick={() => navigate('/reparaciones/nueva')}
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
          <option value="EN_PROCESO">En Proceso</option>
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
              {searchQuery || statusFilter || priorityFilter ? 'Prueba ajustando los filtros' : 'Crea tu primera reparación con el botón de arriba'}
            </p>
          </div>
        ) : filteredRepairs.map(r => (
          <RepairCard key={r.id} repair={r}
            onViewDetail={handleViewDetail}
            onHistory={id => setShowHistoryModal(id)}
            onFlowManage={() => navigate('/flujo-reparaciones')}
            onPrintPDF={handleGeneratePDF}
          />
        ))}
      </div>

      {/* Historial modal */}
      {showHistoryModal && (
        <ModalHistorialReparacion isOpen={!!showHistoryModal} onClose={() => setShowHistoryModal(null)} reparacionId={showHistoryModal} />
      )}

      {/* Detalle modal */}
      {showDetailModal && selectedRepair && (
        <Modal open={showDetailModal} onClose={() => { setShowDetailModal(false); setSelectedRepair(null); }} title={`Detalle — ${selectedRepair.id}`}>
          <div className="space-y-4 text-sm">
            <section>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5 flex items-center gap-1"><User size={10} /> Cliente</p>
              <div className="bg-[#0A1220] rounded-xl p-3 grid grid-cols-2 gap-2">
                <div><p className="text-[10px] text-slate-500">Nombre</p><p className="text-slate-100 font-medium">{selectedRepair.clienteNombre || '—'}</p></div>
                <div><p className="text-[10px] text-slate-500">Teléfono</p><p className="text-slate-100 font-medium">{selectedRepair.clienteTelefono || '—'}</p></div>
                {selectedRepair.clienteEmail && <div className="col-span-2"><p className="text-[10px] text-slate-500">Email</p><p className="text-slate-100">{selectedRepair.clienteEmail}</p></div>}
              </div>
            </section>
            <section>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5 flex items-center gap-1"><Smartphone size={10} /> Equipo</p>
              <div className="bg-[#0A1220] rounded-xl p-3 grid grid-cols-2 gap-2">
                <div><p className="text-[10px] text-slate-500">Tipo</p><p className="text-slate-100 font-medium">{selectedRepair.recepcion.tipoEquipo || '—'}</p></div>
                <div><p className="text-[10px] text-slate-500">Marca / Modelo</p><p className="text-slate-100 font-medium">{[selectedRepair.recepcion.marca, selectedRepair.recepcion.modelo].filter(Boolean).join(' ') || '—'}</p></div>
                <div><p className="text-[10px] text-slate-500">Color</p><p className="text-slate-100">{selectedRepair.recepcion.color || '—'}</p></div>
                {selectedRepair.recepcion.imei && <div><p className="text-[10px] text-slate-500">IMEI / Serie</p><p className="text-slate-100 font-mono text-xs">{selectedRepair.recepcion.imei}</p></div>}
                {selectedRepair.recepcion.contraseña && <div><p className="text-[10px] text-slate-500">Contraseña</p><p className="text-slate-100">{selectedRepair.recepcion.contraseña}</p></div>}
                {selectedRepair.recepcion.diagnosticoInicial && (
                  <div className="col-span-2"><p className="text-[10px] text-slate-500">Diagnóstico inicial</p><p className="text-slate-300 italic mt-0.5">{selectedRepair.recepcion.diagnosticoInicial}</p></div>
                )}
              </div>
            </section>
            <section>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Estado y asignación</p>
              <div className="bg-[#0A1220] rounded-xl p-3 grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[10px] text-slate-500 mb-1">Estado</p>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_PILL[selectedRepair.estado] || 'bg-slate-700 text-slate-300'}`}>
                    {STATUS_LABEL[selectedRepair.estado] || selectedRepair.estado.replace(/_/g, ' ')}
                  </span>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 mb-1">Prioridad</p>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${PRIORITY_PILL[selectedRepair.prioridad] || 'bg-slate-700 text-slate-300'}`}>
                    {selectedRepair.prioridad}
                  </span>
                </div>
                {selectedRepair.tecnicoAsignado && <div className="col-span-2"><p className="text-[10px] text-slate-500">Técnico</p><p className="text-slate-100">{selectedRepair.tecnicoAsignado}</p></div>}
                <div><p className="text-[10px] text-slate-500">Fecha ingreso</p><p className="text-slate-100">{safeDate(selectedRepair.fechaIngreso)}</p></div>
              </div>
            </section>
            <section>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Resumen económico</p>
              <div className="bg-[#0A1220] rounded-xl p-3 space-y-1.5">
                <div className="flex justify-between text-xs text-slate-400"><span>Subtotal</span><span className="text-slate-200">Q{selectedRepair.subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between text-xs text-slate-400"><span>Impuestos</span><span className="text-slate-200">Q{selectedRepair.impuestos.toFixed(2)}</span></div>
                <div className="flex justify-between font-bold border-t border-[rgba(72,185,230,0.12)] pt-1.5"><span className="text-slate-200">Total</span><span className="text-emerald-400 text-base">Q{selectedRepair.total.toFixed(2)}</span></div>
              </div>
            </section>
            <div className="flex gap-2 pt-1">
              <button onClick={() => handlePreviewPDF(selectedRepair)} className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-xl border border-[rgba(72,185,230,0.2)] text-[#48B9E6] hover:bg-[#48B9E6]/10 transition-colors">
                <FileSearch size={13} /> Vista previa
              </button>
              <button onClick={() => handleGeneratePDF(selectedRepair)} className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors">
                <Printer size={13} /> Imprimir PDF
              </button>
              <button onClick={() => navigate('/flujo-reparaciones')} className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white transition-colors">
                <Clock size={13} /> Gestionar Flujo
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
