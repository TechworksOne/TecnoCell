import { useState, useEffect } from 'react';
import {
  Tag, Search, Package, CheckCircle, Calendar, RefreshCw,
  Hash, MapPin, Wrench, User,
} from 'lucide-react';
import API_URL from '../../services/config';
import axios from 'axios';

// ─── Stat card ───────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: number;
  description: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
}

function StatCard({ label, value, description, icon, iconBg, iconColor }: StatCardProps) {
  return (
    <div className="rounded-2xl border p-5 flex flex-col gap-3"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-1">{label}</p>
          <p className="text-4xl font-extrabold text-[var(--color-text)] leading-none">{value}</p>
        </div>
        <div className={`p-3 rounded-xl shrink-0 ${iconBg}`}>
          <span className={iconColor}>{icon}</span>
        </div>
      </div>
      <p className="text-xs text-[var(--color-text-sec)]">{description}</p>
    </div>
  );
}

// ─── Estado badge ─────────────────────────────────────────────────────────────

const ESTADO_CLS: Record<string, string> = {
  DISPONIBLE: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700/40',
  ASIGNADO:   'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 border border-violet-200 dark:border-violet-700/40',
  USADO:      'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700/40',
};

function EstadoBadge({ estado }: { estado: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${ESTADO_CLS[estado] ?? ESTADO_CLS.USADO}`}>
      {estado}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StickersGarantiaPage() {
  const [searchDisp, setSearchDisp] = useState('');
  const [searchAsig, setSearchAsig] = useState('');
  const [stickersDisponibles, setStickersDisponibles] = useState<any[]>([]);
  const [stickersAsignados, setStickersAsignados] = useState<any[]>([]);
  const [estadisticas, setEstadisticas] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [vista, setVista] = useState<'disponibles' | 'asignados'>('disponibles');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const [dRes, aRes, sRes] = await Promise.all([
        axios.get(`${API_URL}/stickers/disponibles`, { headers }),
        axios.get(`${API_URL}/stickers/asignados`, { headers }),
        axios.get(`${API_URL}/stickers/estadisticas`, { headers }),
      ]);
      if (dRes.data.success) setStickersDisponibles(dRes.data.data);
      if (aRes.data.success) setStickersAsignados(aRes.data.data);
      if (sRes.data.success) setEstadisticas(sRes.data.data);
    } catch { /* non-critical */ }
    finally { setLoading(false); }
  };

  const filteredDisp = stickersDisponibles.filter(s =>
    s.numero_sticker.toLowerCase().includes(searchDisp.toLowerCase())
  );

  const filteredAsig = stickersAsignados.filter(s =>
    s.numero_sticker.toLowerCase().includes(searchAsig.toLowerCase()) ||
    s.reparacion_id?.toString().toLowerCase().includes(searchAsig.toLowerCase()) ||
    s.clienteNombre?.toLowerCase().includes(searchAsig.toLowerCase())
  );

  const thCls = 'px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]';
  const tdCls = 'px-4 py-3 text-sm text-[var(--color-text)]';
  const tdSecCls = 'px-4 py-3 text-sm text-[var(--color-text-sec)]';
  const searchInputCls = 'w-full pl-9 pr-3 py-2 text-sm rounded-xl border outline-none focus:ring-2 transition-colors';
  const searchInputStyle = { background: 'var(--color-input-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' };

  return (
    <div className="space-y-6">

      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Stickers de Garantía</h1>
          <p className="text-sm text-[var(--color-text-sec)] mt-0.5">
            Control de stickers pre-numerados para garantías de reparación
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-soft)', color: 'var(--color-primary)' }}>
            <Hash size={12} />
            G-436591 a G-437570
          </span>
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors hover:bg-[var(--color-row-hover)] disabled:opacity-50"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-sec)' }}>
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Actualizar
          </button>
        </div>
      </div>

      {/* ── Info panel ───────────────────────────────────────────── */}
      <div className="flex items-start gap-4 rounded-2xl border p-4"
        style={{ borderColor: 'rgba(72,185,230,0.25)', background: 'rgba(72,185,230,0.06)' }}>
        <div className="p-2.5 rounded-xl shrink-0" style={{ background: 'rgba(72,185,230,0.12)' }}>
          <Tag size={20} className="text-[var(--color-primary)]" />
        </div>
        <div>
          <h3 className="font-semibold text-[var(--color-text)] text-sm">Inventario de Stickers</h3>
          <p className="text-sm text-[var(--color-text-sec)] mt-0.5">
            Sistema de control de 980 stickers de garantía pre-numerados.
            Asigna stickers desde el flujo de reparaciones al completar un equipo.
          </p>
        </div>
      </div>

      {/* ── Stat cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Stickers" value={estadisticas.total || 0}
          description="Stickers registrados en el sistema"
          icon={<Tag size={22} />} iconBg="bg-blue-100 dark:bg-blue-900/30" iconColor="text-blue-500 dark:text-blue-400" />
        <StatCard label="Disponibles" value={estadisticas.disponibles || 0}
          description="Listos para asignarse"
          icon={<Package size={22} />} iconBg="bg-emerald-100 dark:bg-emerald-900/30" iconColor="text-emerald-500 dark:text-emerald-400" />
        <StatCard label="Asignados" value={estadisticas.asignados || 0}
          description="Stickers activos en garantía"
          icon={<CheckCircle size={22} />} iconBg="bg-violet-100 dark:bg-violet-900/30" iconColor="text-violet-500 dark:text-violet-400" />
        <StatCard label="Usados / Expirados" value={estadisticas.usados || 0}
          description="Garantías concluidas"
          icon={<Tag size={22} />} iconBg="bg-slate-100 dark:bg-slate-800/60" iconColor="text-slate-500 dark:text-slate-400" />
      </div>

      {/* ── Segmented tabs ───────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-1 p-1 rounded-xl border w-full sm:w-fit"
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-soft)' }}>
        {([
          { key: 'disponibles' as const, label: 'Disponibles', icon: <Package size={15} />, count: filteredDisp.length },
          { key: 'asignados'   as const, label: 'Asignados',   icon: <CheckCircle size={15} />, count: filteredAsig.length },
        ]).map(tab => (
          <button key={tab.key} onClick={() => setVista(tab.key)}
            className={`flex items-center justify-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              vista === tab.key
                ? 'bg-[var(--color-primary)] text-white shadow-sm'
                : 'text-[var(--color-text-sec)] hover:text-[var(--color-text)] hover:bg-[var(--color-row-hover)]'
            }`}>
            {tab.icon}
            {tab.label}
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none ${
              vista === tab.key ? 'bg-white/20 text-white' : 'bg-[var(--color-surface)] text-[var(--color-text-muted)]'
            }`}>{tab.count}</span>
          </button>
        ))}
      </div>

      {/* ── Vista: Disponibles ───────────────────────────────────── */}
      {vista === 'disponibles' && (
        <div className="space-y-4">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" size={15} />
            <input placeholder="Buscar sticker disponible…" value={searchDisp}
              onChange={e => setSearchDisp(e.target.value)} className={searchInputCls} style={searchInputStyle} />
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-10 h-10 rounded-full border-2 animate-spin"
                style={{ borderColor: 'var(--color-border)', borderTopColor: 'var(--color-primary)' }} />
              <p className="text-sm text-[var(--color-text-muted)]">Cargando stickers…</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden sm:block rounded-2xl border overflow-hidden"
                style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
                <table className="w-full">
                  <thead style={{ background: 'var(--color-surface-soft)', borderBottom: '1px solid var(--color-border)' }}>
                    <tr>
                      <th className={thCls}>Número de Sticker</th>
                      <th className={thCls}>Estado</th>
                      <th className={thCls}>Fecha Creación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDisp.map(s => (
                      <tr key={s.id} className="border-t transition-colors hover:bg-[var(--color-row-hover)]"
                        style={{ borderColor: 'var(--color-border)' }}>
                        <td className={tdCls}>
                          <span className="font-mono font-semibold text-[var(--color-primary)]">{s.numero_sticker}</span>
                        </td>
                        <td className={tdCls}><EstadoBadge estado="DISPONIBLE" /></td>
                        <td className={tdSecCls}>
                          <span className="flex items-center gap-1.5">
                            <Calendar size={13} className="opacity-60" />
                            {new Date(s.created_at).toLocaleDateString('es-GT')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredDisp.length === 0 && (
                  <div className="text-center py-14">
                    <Package size={40} className="mx-auto mb-3 opacity-25 text-[var(--color-text-muted)]" />
                    <p className="text-sm text-[var(--color-text-muted)]">No hay stickers disponibles</p>
                  </div>
                )}
              </div>

              {/* Mobile cards */}
              <div className="sm:hidden space-y-2">
                {filteredDisp.length === 0 ? (
                  <div className="text-center py-12">
                    <Package size={36} className="mx-auto mb-2 opacity-25 text-[var(--color-text-muted)]" />
                    <p className="text-sm text-[var(--color-text-muted)]">No hay stickers disponibles</p>
                  </div>
                ) : filteredDisp.map(s => (
                  <div key={s.id} className="rounded-xl border p-3 flex items-center justify-between gap-3"
                    style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
                    <div>
                      <p className="font-mono font-bold text-sm text-[var(--color-primary)]">{s.numero_sticker}</p>
                      <p className="text-xs text-[var(--color-text-muted)] mt-0.5 flex items-center gap-1">
                        <Calendar size={11} /> {new Date(s.created_at).toLocaleDateString('es-GT')}
                      </p>
                    </div>
                    <EstadoBadge estado="DISPONIBLE" />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Vista: Asignados ─────────────────────────────────────── */}
      {vista === 'asignados' && (
        <div className="space-y-4">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" size={15} />
            <input placeholder="Buscar por sticker, reparación o cliente…" value={searchAsig}
              onChange={e => setSearchAsig(e.target.value)} className={searchInputCls} style={searchInputStyle} />
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-10 h-10 rounded-full border-2 animate-spin"
                style={{ borderColor: 'var(--color-border)', borderTopColor: '#8b5cf6' }} />
              <p className="text-sm text-[var(--color-text-muted)]">Cargando stickers…</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden sm:block rounded-2xl border overflow-hidden"
                style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
                <table className="w-full">
                  <thead style={{ background: 'var(--color-surface-soft)', borderBottom: '1px solid var(--color-border)' }}>
                    <tr>
                      <th className={thCls}>Sticker</th>
                      <th className={thCls}>Reparación</th>
                      <th className={thCls}>Cliente</th>
                      <th className={thCls}>Ubicación</th>
                      <th className={thCls}>Fecha Asignación</th>
                      <th className={thCls}>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAsig.map(s => (
                      <tr key={s.id} className="border-t transition-colors hover:bg-[var(--color-row-hover)]"
                        style={{ borderColor: 'var(--color-border)' }}>
                        <td className={tdCls}>
                          <span className="font-mono font-semibold text-[var(--color-primary)]">{s.numero_sticker}</span>
                        </td>
                        <td className={tdSecCls}>
                          {s.reparacion_id
                            ? <span className="flex items-center gap-1.5"><Wrench size={13} className="opacity-60" />{s.reparacion_id}</span>
                            : <span className="text-[var(--color-text-muted)]">—</span>}
                        </td>
                        <td className={tdSecCls}>
                          {s.clienteNombre
                            ? <span className="flex items-center gap-1.5"><User size={13} className="opacity-60" />{s.clienteNombre}</span>
                            : <span className="text-[var(--color-text-muted)]">—</span>}
                        </td>
                        <td className={tdSecCls}>
                          {s.ubicacion_sticker
                            ? <span className="flex items-center gap-1.5"><MapPin size={13} className="opacity-60" />{s.ubicacion_sticker}</span>
                            : <span className="text-[var(--color-text-muted)]">—</span>}
                        </td>
                        <td className={tdSecCls}>
                          {s.fecha_asignacion
                            ? <span className="flex items-center gap-1.5"><Calendar size={13} className="opacity-60" />{new Date(s.fecha_asignacion).toLocaleDateString('es-GT')}</span>
                            : <span className="text-[var(--color-text-muted)]">—</span>}
                        </td>
                        <td className={tdCls}><EstadoBadge estado={s.estado ?? 'ASIGNADO'} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredAsig.length === 0 && (
                  <div className="text-center py-14">
                    <CheckCircle size={40} className="mx-auto mb-3 opacity-25 text-[var(--color-text-muted)]" />
                    <p className="text-sm text-[var(--color-text-muted)]">No hay stickers asignados</p>
                  </div>
                )}
              </div>

              {/* Mobile cards */}
              <div className="sm:hidden space-y-2">
                {filteredAsig.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle size={36} className="mx-auto mb-2 opacity-25 text-[var(--color-text-muted)]" />
                    <p className="text-sm text-[var(--color-text-muted)]">No hay stickers asignados</p>
                  </div>
                ) : filteredAsig.map(s => (
                  <div key={s.id} className="rounded-xl border p-3 space-y-2"
                    style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
                    <div className="flex items-center justify-between">
                      <p className="font-mono font-bold text-sm text-[var(--color-primary)]">{s.numero_sticker}</p>
                      <EstadoBadge estado={s.estado ?? 'ASIGNADO'} />
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-xs text-[var(--color-text-sec)]">
                      {s.clienteNombre && <p className="flex items-center gap-1"><User size={11} />{s.clienteNombre}</p>}
                      {s.reparacion_id && <p className="flex items-center gap-1"><Wrench size={11} />{s.reparacion_id}</p>}
                      {s.fecha_asignacion && <p className="flex items-center gap-1"><Calendar size={11} />{new Date(s.fecha_asignacion).toLocaleDateString('es-GT')}</p>}
                      {s.ubicacion_sticker && <p className="flex items-center gap-1"><MapPin size={11} />{s.ubicacion_sticker}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

    </div>
  );
}
