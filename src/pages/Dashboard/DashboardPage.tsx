import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import API_URL from "../../services/config";
import { formatMoney } from "../../lib/format";
import { useAuth } from "../../store/useAuth";
import {
  ShoppingCart, Package, AlertTriangle, FileText, Wrench,
  DollarSign, TrendingUp, Users, ClipboardCheck, ClipboardX,
  Receipt, Wallet, Plus, ArrowRight, BarChart3, Tag, Clock,
  Activity, Zap, CheckCircle2, AlertCircle, Timer, CalendarCheck,
  CalendarClock, ListChecks, Boxes, Search,
} from "lucide-react";

// ─── Tipos generales ──────────────────────────────────────────────────────────

interface DashboardStats {
  ventas:       { hoy: number; mes: number; total: number; cantidad: number };
  productos:    { total: number; bajo_stock: number; sin_stock: number };
  reparaciones: { total: number; con_checklist: number; sin_checklist: number; completadas: number };
  cotizaciones: { total: number; abiertas: number };
  gastos:       { mes: number };
  ganancias:    { hoy: number; mes: number };
}

interface TecnicoStats {
  asignadas:            number;
  en_proceso:           number;
  pendientes:           number;
  listas_para_entregar: number;
  atrasadas:            number;
  sin_checklist:        number;
  finalizadas_hoy:      number;
  finalizadas_mes:      number;
  repuestos_usados_mes: number;
}

interface ReparacionRow {
  id:                    string;
  cliente_nombre:        string;
  tipo_equipo:           string;
  marca:                 string;
  modelo:                string;
  estado:                string;
  prioridad:             string;
  fecha_ingreso:         string;
  fecha_estimada_entrega: string | null;
  observaciones:         string | null;
}

interface ActividadRow {
  reparacion_id:  string;
  estado:         string;
  nota:           string;
  user_nombre:    string;
  created_at:     string;
  cliente_nombre: string;
  tipo_equipo:    string;
  marca:          string;
  modelo:         string;
}

interface TecnicoData {
  tecnico:      string;
  stats:        TecnicoStats;
  estados:      Record<string, number>;
  reparaciones: ReparacionRow[];
  actividad:    ActividadRow[];
}

// ─── Helpers de color por estado ──────────────────────────────────────────────

const BRAND      = "#48B9E6";
const BRAND_DARK = "#2EA7D8";
const TEXT_MAIN  = "#14324A";
const TEXT_SEC   = "#5E7184";
const BORDER     = "#D6EEF8";

const ESTADO_COLOR: Record<string, { bg: string; text: string; label: string }> = {
  RECIBIDA:               { bg: "rgba(72,185,230,0.10)",  text: "#1E7EA1",  label: "Recibida" },
  EN_DIAGNOSTICO:         { bg: "rgba(99,102,241,0.10)",  text: "#4338CA",  label: "En diagnóstico" },
  ESPERANDO_AUTORIZACION: { bg: "rgba(245,158,11,0.12)", text: "#92400E",  label: "Esperando autorización" },
  AUTORIZADA:             { bg: "rgba(34,197,94,0.10)",   text: "#15803D",  label: "Autorizada" },
  EN_REPARACION:          { bg: "rgba(99,102,241,0.15)",  text: "#3730A3",  label: "En reparación" },
  EN_PROCESO:             { bg: "rgba(99,102,241,0.15)",  text: "#3730A3",  label: "En proceso" },
  ESPERANDO_PIEZA:        { bg: "rgba(249,115,22,0.10)",  text: "#C2410C",  label: "Esperando pieza" },
  COMPLETADA:             { bg: "rgba(34,197,94,0.12)",   text: "#166534",  label: "Completada" },
  STAND_BY:               { bg: "rgba(148,163,184,0.12)", text: "#475569",  label: "Stand by" },
  ANTICIPO_REGISTRADO:    { bg: "rgba(72,185,230,0.08)",  text: "#0E7490",  label: "Anticipo registrado" },
};

const PRIORIDAD_COLOR: Record<string, string> = {
  ALTA:  "#EF4444",
  MEDIA: "#F59E0B",
  BAJA:  "#22C55E",
};

// ─── Componentes reutilizables ─────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string | number;
  footnote: string;
  footnoteIcon?: ReactNode;
  icon: ReactNode;
  gradient: string;
}
function KpiCard({ label, value, footnote, footnoteIcon, icon, gradient }: KpiCardProps) {
  return (
    <div className={`${gradient} rounded-2xl p-5 text-white shadow-md flex flex-col justify-between min-h-[110px]`}>
      <div className="flex items-start justify-between">
        <p className="text-white/75 text-[10px] font-bold uppercase tracking-widest">{label}</p>
        <div className="bg-white/20 rounded-xl p-2 shrink-0">{icon}</div>
      </div>
      <div className="mt-2">
        <p className="text-[1.55rem] font-bold leading-none tracking-tight">{value}</p>
        <p className="flex items-center gap-1 text-white/70 text-[11px] mt-1.5">
          {footnoteIcon}{footnote}
        </p>
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  sub: string;
  icon: ReactNode;
  iconBg: string;
  footer: ReactNode;
  onClick: () => void;
}
function StatCard({ label, value, sub, icon, iconBg, footer, onClick }: StatCardProps) {
  return (
    <button
      onClick={onClick}
      className="bg-white dark:bg-[#0D1526] border border-[#D6EEF8] dark:border-[rgba(72,185,230,0.16)] rounded-2xl shadow-sm p-4 text-left w-full hover:shadow-md transition-all group cursor-pointer"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0 pr-2">
          <p className="text-[10px] font-bold text-[#5E7184] dark:text-[#7F8A99] uppercase tracking-widest">{label}</p>
          <p className="text-2xl font-bold text-[#14324A] dark:text-[#F8FAFC] mt-0.5 leading-none">{value}</p>
          <p className="text-[11px] text-[#5E7184] dark:text-[#7F8A99] mt-0.5">{sub}</p>
        </div>
        <div className={`${iconBg} p-2.5 rounded-xl shrink-0 group-hover:scale-105 transition-transform`}>
          {icon}
        </div>
      </div>
      <div className="mt-3 pt-2.5 border-t border-[#D6EEF8] dark:border-[rgba(72,185,230,0.16)] text-[11px]">{footer}</div>
    </button>
  );
}

/** Tarjeta KPI para técnico — estilo TECNOCELL */
interface TecKpiCardProps {
  label:    string;
  value:    number;
  sub:      string;
  icon:     ReactNode;
  accent:   string;      // color HEX del acento
  onClick?: () => void;
  alert?:   boolean;     // si true, resalta con borde coloreado
}
function TecKpiCard({ label, value, sub, icon, accent, onClick, alert }: TecKpiCardProps) {
  return (
    <button
      onClick={onClick}
      className="bg-white dark:bg-[#0D1526] rounded-2xl p-4 text-left w-full transition-all hover:shadow-md"
      style={{
        border: alert ? `1.5px solid ${accent}` : `1px solid var(--color-border)`,
        boxShadow: "0 1px 6px rgba(20,50,74,0.06)",
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div
          className="p-2 rounded-xl shrink-0"
          style={{ background: `${accent}18` }}
        >
          <span style={{ color: accent }}>{icon}</span>
        </div>
        <span
          className="text-[1.65rem] font-bold leading-none"
          style={{ color: "var(--color-text)" }}
        >
          {value}
        </span>
      </div>
      <p className="font-semibold text-sm mt-2.5" style={{ color: "var(--color-text)" }}>{label}</p>
      <p className="text-[11px] mt-0.5" style={{ color: "var(--color-text-sec)" }}>{sub}</p>
    </button>
  );
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────

function SkeletonBlock({ h = "h-28" }: { h?: string }) {
  return <div className={`bg-slate-100 dark:bg-[#0A1220] animate-pulse rounded-2xl ${h}`} />;
}

// ─── Reloj ────────────────────────────────────────────────────────────────────

function ClockWidget({ time }: { time: Date }) {
  const formatTime = (d: Date) =>
    d.toLocaleTimeString("es-GT", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const formatDate = (d: Date) =>
    d.toLocaleDateString("es-GT", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  return (
    <div
      className="flex items-center gap-3 rounded-xl px-4 py-2.5 self-start"
      style={{ background: "var(--color-surface)", border: `1px solid var(--color-border)`, boxShadow: "0 1px 6px rgba(20,50,74,0.06)" }}
    >
      <Clock size={16} style={{ color: "var(--color-text-sec)" }} className="shrink-0" />
      <div>
        <p className="text-base font-bold font-mono leading-none" style={{ color: "var(--color-text)" }}>
          {formatTime(time)}
        </p>
        <p className="text-[10px] capitalize mt-0.5" style={{ color: "var(--color-text-sec)" }}>
          {formatDate(time)}
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD TÉCNICO
// ═══════════════════════════════════════════════════════════════════════════════

function TecnicoDashboard({ data, time }: { data: TecnicoData; time: Date }) {
  const navigate = useNavigate();
  const { stats, reparaciones, actividad, estados } = data;

  const kpis: TecKpiCardProps[] = [
    {
      label:   "Asignadas",
      value:   stats.asignadas,
      sub:     "Total activas",
      icon:    <Wrench size={16} />,
      accent:  BRAND_DARK,
      onClick: () => navigate("/reparaciones"),
    },
    {
      label:   "En proceso",
      value:   stats.en_proceso,
      sub:     "Diagnóstico / reparación",
      icon:    <Activity size={16} />,
      accent:  "#6366F1",
      onClick: () => navigate("/flujo-reparaciones"),
    },
    {
      label:   "Pendientes",
      value:   stats.pendientes,
      sub:     "Sin iniciar",
      icon:    <Timer size={16} />,
      accent:  "#F59E0B",
      alert:   stats.pendientes > 0,
      onClick: () => navigate("/reparaciones"),
    },
    {
      label:   "Listas p/entregar",
      value:   stats.listas_para_entregar,
      sub:     "Completadas",
      icon:    <CheckCircle2 size={16} />,
      accent:  "#22C55E",
      alert:   stats.listas_para_entregar > 0,
      onClick: () => navigate("/reparaciones"),
    },
    {
      label:   "Atrasadas",
      value:   stats.atrasadas,
      sub:     "Pasaron fecha estimada",
      icon:    <AlertCircle size={16} />,
      accent:  "#EF4444",
      alert:   stats.atrasadas > 0,
      onClick: () => navigate("/reparaciones"),
    },
    {
      label:   "Sin checklist",
      value:   stats.sin_checklist,
      sub:     "Requieren revisión",
      icon:    <ListChecks size={16} />,
      accent:  "#F97316",
      alert:   stats.sin_checklist > 0,
      onClick: () => navigate("/reparaciones"),
    },
    {
      label:   "Finalizadas hoy",
      value:   stats.finalizadas_hoy,
      sub:     "Cerradas el día de hoy",
      icon:    <CalendarCheck size={16} />,
      accent:  BRAND,
      onClick: () => navigate("/reparaciones"),
    },
    {
      label:   "Finalizadas este mes",
      value:   stats.finalizadas_mes,
      sub:     "Cerradas en el mes",
      icon:    <CalendarClock size={16} />,
      accent:  BRAND_DARK,
      onClick: () => navigate("/reparaciones"),
    },
  ];

  const quickActions = [
    { icon: Wrench,        label: "Mis reparaciones",  path: "/reparaciones" },
    { icon: Activity,      label: "Flujo",             path: "/flujo-reparaciones" },
    { icon: CheckCircle2,  label: "Checklist",         path: "/reparaciones" },
    { icon: Boxes,         label: "Repuestos",         path: "/repuestos" },
    { icon: Users,         label: "Clientes",          path: "/clientes" },
    { icon: Search,        label: "Buscar cliente",    path: "/clientes" },
  ];

  // Conteo por estado para la mini barra
  const estadosList = Object.entries(estados).map(([k, v]) => ({
    key: k, total: v, ...(ESTADO_COLOR[k] ?? { bg: "rgba(100,100,100,0.08)", text: "#555", label: k }),
  }));

  return (
    <div className="space-y-5 max-w-screen-2xl">

      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <span
            className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest mb-1"
            style={{ color: BRAND }}
          >
            <Zap size={11} /> Panel Técnico
          </span>
          <h1 className="text-xl font-bold leading-tight" style={{ color: "var(--color-text)" }}>
            Bienvenido, {data.tecnico}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--color-text-sec)" }}>
            Resumen de reparaciones asignadas y actividad reciente
          </p>
        </div>
        <ClockWidget time={time} />
      </div>

      {/* ── KPI CARDS (8) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {kpis.map((k, i) => (
          <TecKpiCard key={i} {...k} />
        ))}
      </div>

      {/* ── ACCIONES RÁPIDAS ── */}
      <div
        className="rounded-2xl px-5 py-4"
        style={{ background: "var(--color-surface)", border: `1px solid var(--color-border)`, boxShadow: "0 1px 6px rgba(20,50,74,0.06)" }}
      >
        <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: "var(--color-text-sec)" }}>
          Acciones rápidas
        </p>
        <div className="flex flex-wrap gap-2">
          {quickActions.map(({ icon: Icon, label, path }, i) => (
            <button
              key={i}
              onClick={() => navigate(path)}
              className="flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all hover:shadow-sm"
              style={{
                background: `rgba(72,185,230,0.08)`,
                border: `1px solid ${BORDER}`,
                color: BRAND_DARK,
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = "rgba(72,185,230,0.18)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = "rgba(72,185,230,0.08)";
              }}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pb-6">

        {/* ── REPARACIONES ACTIVAS (2/3) ── */}
        <div
          className="lg:col-span-2 rounded-2xl p-5"
          style={{ background: "var(--color-surface)", border: `1px solid var(--color-border)`, boxShadow: "0 1px 6px rgba(20,50,74,0.06)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg" style={{ background: `${BRAND}18` }}>
                <Wrench size={13} style={{ color: BRAND_DARK }} />
              </div>
              <h3 className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                Mis reparaciones activas
              </h3>
            </div>
            <button
              onClick={() => navigate("/reparaciones")}
              className="flex items-center gap-1 text-xs font-medium transition-colors"
              style={{ color: BRAND_DARK }}
            >
              Ver todas <ArrowRight size={12} />
            </button>
          </div>

          {reparaciones.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <CheckCircle2 size={32} style={{ color: BRAND, opacity: 0.4 }} />
              <p className="text-sm" style={{ color: "var(--color-text-sec)" }}>No tienes reparaciones activas asignadas.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: `1px solid var(--color-border)` }}>
                    {["ID", "Cliente", "Equipo", "Estado", "Prioridad", "Ingreso"].map(h => (
                      <th
                        key={h}
                        className="text-left pb-2 pr-3 font-semibold uppercase tracking-wider"
                        style={{ color: "var(--color-text-sec)", fontSize: 10 }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reparaciones.map((r) => {
                    const ec = ESTADO_COLOR[r.estado] ?? { bg: "#f1f5f9", text: "#475569", label: r.estado };
                    return (
                      <tr
                        key={r.id}
                        style={{ borderBottom: `1px solid var(--color-border)` }}
                        className="hover:bg-[#F6FCFF] dark:hover:bg-[rgba(72,185,230,0.05)] transition-colors cursor-pointer"
                        onClick={() => navigate("/reparaciones")}
                      >
                        <td className="py-2 pr-3 font-mono font-semibold" style={{ color: BRAND_DARK }}>
                          {r.id.replace("REP", "")}
                        </td>
                        <td className="py-2 pr-3 max-w-[120px] truncate" style={{ color: "var(--color-text)" }}>
                          {r.cliente_nombre}
                        </td>
                        <td className="py-2 pr-3" style={{ color: "var(--color-text-sec)" }}>
                          {r.marca} {r.modelo}
                        </td>
                        <td className="py-2 pr-3">
                          <span
                            className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap"
                            style={{ background: ec.bg, color: ec.text }}
                          >
                            {ec.label}
                          </span>
                        </td>
                        <td className="py-2 pr-3">
                          <span
                            className="inline-flex items-center gap-1 text-[10px] font-bold"
                            style={{ color: PRIORIDAD_COLOR[r.prioridad] ?? "var(--color-text-sec)" }}
                          >
                            ● {r.prioridad}
                          </span>
                        </td>
                        <td className="py-2" style={{ color: "var(--color-text-sec)" }}>
                          {new Date(r.fecha_ingreso).toLocaleDateString("es-GT")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── PANEL DERECHO (1/3) ── */}
        <div className="flex flex-col gap-4">

          {/* Estados */}
          <div
            className="rounded-2xl p-4"
            style={{ background: "var(--color-surface)", border: `1px solid var(--color-border)`, boxShadow: "0 1px 6px rgba(20,50,74,0.06)" }}
          >
            <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: "var(--color-text-sec)" }}>
              Distribución por estado
            </p>
            {estadosList.length === 0 ? (
              <p className="text-xs" style={{ color: "var(--color-text-sec)" }}>Sin reparaciones activas.</p>
            ) : (
              <div className="space-y-1.5">
                {estadosList.map(e => (
                  <div key={e.key} className="flex items-center justify-between">
                    <span
                      className="text-[11px] px-2 py-0.5 rounded-full"
                      style={{ background: e.bg, color: e.text }}
                    >
                      {e.label}
                    </span>
                    <span className="text-xs font-bold" style={{ color: "var(--color-text)" }}>{e.total}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Repuestos usados este mes */}
          <div
            className="rounded-2xl p-4"
            style={{ background: `${BRAND}0A`, border: `1px solid var(--color-border)` }}
          >
            <div className="flex items-center gap-2 mb-1">
              <Boxes size={14} style={{ color: BRAND_DARK }} />
              <p className="text-[11px] font-semibold" style={{ color: "var(--color-text)" }}>
                Repuestos usados este mes
              </p>
            </div>
            <p className="text-3xl font-bold" style={{ color: BRAND_DARK }}>
              {stats.repuestos_usados_mes}
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: "var(--color-text-sec)" }}>ítems en reparaciones del mes</p>
          </div>

          {/* Actividad reciente */}
          <div
            className="rounded-2xl p-4 flex-1"
            style={{ background: "var(--color-surface)", border: `1px solid var(--color-border)`, boxShadow: "0 1px 6px rgba(20,50,74,0.06)" }}
          >
            <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: "var(--color-text-sec)" }}>
              Actividad reciente
            </p>
            {actividad.length === 0 ? (
              <p className="text-xs" style={{ color: "var(--color-text-sec)" }}>Sin actividad reciente.</p>
            ) : (
              <div className="space-y-2.5">
                {actividad.slice(0, 5).map((a, i) => (
                  <div key={i} className="flex gap-2">
                    <div
                      className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                      style={{ background: BRAND }}
                    />
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium leading-tight truncate" style={{ color: "var(--color-text)" }}>
                        {a.cliente_nombre} — {a.marca} {a.modelo}
                      </p>
                      <p className="text-[10px] truncate" style={{ color: "var(--color-text-sec)" }}>
                        {a.nota.slice(0, 60)}{a.nota.length > 60 ? "…" : ""}
                      </p>
                      <p className="text-[9px] mt-0.5" style={{ color: "#A8BDD0" }}>
                        {new Date(a.created_at).toLocaleString("es-GT")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD PRINCIPAL (admin / empleado)
// ═══════════════════════════════════════════════════════════════════════════════

function AdminDashboard({ stats, time }: { stats: DashboardStats; time: Date }) {
  const navigate = useNavigate();

  const quickActions = [
    { icon: ShoppingCart, label: "Nueva Venta",  color: "bg-emerald-500", path: "/ventas/nueva" },
    { icon: FileText,     label: "Cotización",   color: "bg-blue-500",    path: "/cotizaciones" },
    { icon: Wrench,       label: "Reparación",   color: "bg-violet-500",  path: "/reparaciones" },
    { icon: Users,        label: "Clientes",     color: "bg-indigo-500",  path: "/clientes" },
    { icon: Package,      label: "Productos",    color: "bg-orange-500",  path: "/productos" },
    { icon: Receipt,      label: "Compras",      color: "bg-teal-500",    path: "/compras" },
    { icon: Wallet,       label: "Caja",         color: "bg-pink-500",    path: "/caja-bancos" },
    { icon: Tag,          label: "Stickers",     color: "bg-purple-500",  path: "/stickers-garantia" },
  ];

  return (
    <div className="space-y-5 max-w-screen-2xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-1">
            <Zap size={11} /> Panel de Control
          </span>
          <h1 className="text-xl font-bold text-[#14324A] dark:text-[#F8FAFC] leading-tight">Dashboard</h1>
          <p className="text-sm text-[#5E7184] dark:text-[#B8C2D1] mt-0.5">
            Bienvenido, <span className="font-semibold text-[#14324A] dark:text-[#E2E8F0]">Administrador</span>
          </p>
        </div>
        <ClockWidget time={time} />
      </div>

      {/* KPIs financieros */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          label="Ganancias Hoy"
          value={formatMoney(stats.ganancias.hoy)}
          footnote="+12% vs ayer"
          footnoteIcon={<TrendingUp size={11} />}
          icon={<DollarSign size={17} />}
          gradient="bg-gradient-to-br from-emerald-500 to-green-600"
        />
        <KpiCard
          label="Ganancias del Mes"
          value={formatMoney(stats.ganancias.mes)}
          footnote="Meta: Q25,000"
          icon={<BarChart3 size={17} />}
          gradient="bg-gradient-to-br from-blue-500 to-indigo-600"
        />
        <KpiCard
          label="Gastos del Mes"
          value={formatMoney(stats.gastos.mes)}
          footnote={`Balance: ${formatMoney(stats.ventas.mes - stats.gastos.mes)}`}
          icon={<Wallet size={17} />}
          gradient="bg-gradient-to-br from-violet-500 to-purple-600"
        />
        <KpiCard
          label="Ventas del Mes"
          value={formatMoney(stats.ventas.mes)}
          footnote={`${stats.ventas.cantidad} transacciones`}
          icon={<Activity size={17} />}
          gradient="bg-gradient-to-br from-orange-500 to-rose-500"
        />
      </div>

      {/* Mini stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Ventas Hoy"
          value={formatMoney(stats.ventas.hoy)}
          sub={`${stats.ventas.cantidad} transacciones`}
          icon={<ShoppingCart size={17} className="text-emerald-600" />}
          iconBg="bg-emerald-50 dark:bg-emerald-950/30"
          footer={<span className="text-[#5E7184] dark:text-[#B8C2D1]">Mes: {formatMoney(stats.ventas.mes)}</span>}
          onClick={() => navigate("/ventas")}
        />
        <StatCard
          label="Inventario"
          value={stats.productos.total}
          sub="productos registrados"
          icon={<Package size={17} className="text-blue-600" />}
          iconBg="bg-blue-50 dark:bg-sky-950/30"
          footer={
            <div className="flex justify-between">
              <span className="text-orange-500">⚠ Bajo: {stats.productos.bajo_stock}</span>
              <span className="text-red-500">❌ {stats.productos.sin_stock}</span>
            </div>
          }
          onClick={() => navigate("/productos")}
        />
        <StatCard
          label="Reparaciones"
          value={stats.reparaciones.total}
          sub="activas"
          icon={<Wrench size={17} className="text-violet-600" />}
          iconBg="bg-violet-50 dark:bg-violet-950/30"
          footer={
            <div className="flex justify-between">
              <span className="text-emerald-600">✓ {stats.reparaciones.con_checklist}</span>
              <span className="text-red-500">✗ {stats.reparaciones.sin_checklist}</span>
            </div>
          }
          onClick={() => navigate("/flujo-reparaciones")}
        />
        <StatCard
          label="Cotizaciones"
          value={stats.cotizaciones.total}
          sub="registradas"
          icon={<FileText size={17} className="text-amber-600" />}
          iconBg="bg-amber-50 dark:bg-amber-950/30"
          footer={<span className="text-amber-600 dark:text-amber-400">Abiertas: {stats.cotizaciones.abiertas}</span>}
          onClick={() => navigate("/cotizaciones")}
        />
      </div>

      {/* Acciones rápidas */}
      <div className="bg-white dark:bg-[#0D1526] border border-[#D6EEF8] dark:border-[rgba(72,185,230,0.16)] rounded-2xl shadow-sm px-5 py-4">
        <p className="text-[10px] font-bold text-[#5E7184] dark:text-[#7F8A99] uppercase tracking-widest mb-3">
          Acciones Rápidas
        </p>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {quickActions.map(({ icon: Icon, label, color, path }, i) => (
            <button
              key={i}
              onClick={() => navigate(path)}
              className={`${color} text-white flex flex-col items-center justify-center gap-1.5 rounded-xl py-3 px-2 hover:opacity-90 hover:shadow-lg transition-all`}
            >
              <Icon size={17} />
              <span className="text-[10px] font-semibold leading-tight text-center">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Detalle inferior */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-6">
        {/* Estado de Reparaciones */}
        <div className="bg-white dark:bg-[#0D1526] border border-[#D6EEF8] dark:border-[rgba(72,185,230,0.16)] rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="bg-violet-100 dark:bg-violet-950/30 p-1.5 rounded-lg">
                <Wrench size={13} className="text-violet-600 dark:text-violet-400" />
              </div>
              <h3 className="text-sm font-semibold text-[#14324A] dark:text-[#F8FAFC]">Estado de Reparaciones</h3>
            </div>
            <button
              onClick={() => navigate("/flujo-reparaciones")}
              className="flex items-center gap-1 text-xs font-medium text-blue-500 hover:text-blue-700 transition-colors"
            >
              Ver todas <ArrowRight size={12} />
            </button>
          </div>
          <div className="space-y-2">
            {[
              { icon: <ClipboardCheck size={13} className="text-white" />, bg: "bg-emerald-500", rowBg: "bg-emerald-50 dark:bg-emerald-950/30", label: "Con Checklist",  sub: "Proceso completo",     value: stats.reparaciones.con_checklist,  numColor: "text-emerald-700 dark:text-emerald-300" },
              { icon: <ClipboardX size={13} className="text-white" />,     bg: "bg-red-500",     rowBg: "bg-red-50 dark:bg-red-950/30",         label: "Sin Checklist",  sub: "Requiere atención",    value: stats.reparaciones.sin_checklist,  numColor: "text-red-700 dark:text-red-300"         },
              { icon: <Wrench size={13} className="text-white" />,         bg: "bg-blue-500",    rowBg: "bg-sky-50 dark:bg-sky-950/30",          label: "Completadas",    sub: "Listas para entrega",  value: stats.reparaciones.completadas,    numColor: "text-blue-700 dark:text-blue-300"       },
            ].map((row, i) => (
              <div key={i} className={`flex items-center justify-between ${row.rowBg} rounded-xl px-3 py-2.5`}>
                <div className="flex items-center gap-2.5">
                  <div className={`${row.bg} p-1.5 rounded-lg shrink-0`}>{row.icon}</div>
                  <div>
                    <p className="text-sm font-medium text-[#14324A] dark:text-[#F8FAFC]">{row.label}</p>
                    <p className="text-[11px] text-[#5E7184] dark:text-[#B8C2D1]">{row.sub}</p>
                  </div>
                </div>
                <span className={`text-xl font-bold ${row.numColor}`}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Alertas de Stock */}
        <div className="bg-white dark:bg-[#0D1526] border border-[#D6EEF8] dark:border-[rgba(72,185,230,0.16)] rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="bg-amber-100 dark:bg-amber-950/30 p-1.5 rounded-lg">
                <AlertTriangle size={13} className="text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="text-sm font-semibold text-[#14324A] dark:text-[#F8FAFC]">Alertas de Stock</h3>
            </div>
            <button
              onClick={() => navigate("/productos")}
              className="flex items-center gap-1 text-xs font-medium text-blue-500 hover:text-blue-700 transition-colors"
            >
              Ver productos <ArrowRight size={12} />
            </button>
          </div>
          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-800/40 rounded-xl px-3 py-2.5">
              <div className="flex items-center gap-2.5">
                <AlertTriangle size={14} className="text-red-500 dark:text-red-400 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-[#14324A] dark:text-[#F8FAFC]">Sin Stock</p>
                  <p className="text-[11px] text-[#5E7184] dark:text-[#B8C2D1]">Reposición inmediata</p>
                </div>
              </div>
              <span className="text-xl font-bold text-red-700 dark:text-red-300">{stats.productos.sin_stock}</span>
            </div>
            <div className="flex items-center justify-between bg-orange-50 dark:bg-orange-950/30 border border-orange-100 dark:border-orange-800/40 rounded-xl px-3 py-2.5">
              <div className="flex items-center gap-2.5">
                <Package size={14} className="text-orange-500 dark:text-orange-400 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-[#14324A] dark:text-[#F8FAFC]">Stock Bajo</p>
                  <p className="text-[11px] text-[#5E7184] dark:text-[#B8C2D1]">Por debajo del mínimo</p>
                </div>
              </div>
              <span className="text-xl font-bold text-orange-700 dark:text-orange-300">{stats.productos.bajo_stock}</span>
            </div>
          </div>
          <button
            onClick={() => navigate("/compras")}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <Plus size={15} /> Crear Orden de Compra
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENTRY POINT — Detecta rol y carga el dashboard correcto
// ═══════════════════════════════════════════════════════════════════════════════

export default function DashboardPage() {
  const role = useAuth((state) => state.role);
  const isTecnico = role === "tecnico";

  const [adminStats,  setAdminStats]  = useState<DashboardStats | null>(null);
  const [tecnicoData, setTecnicoData] = useState<TecnicoData | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const token    = localStorage.getItem("token");
    const endpoint = isTecnico ? "/dashboard/tecnico" : "/dashboard/stats";

    fetch(`${API_URL}${endpoint}`, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    })
      .then(res => {
        if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);
        return res.json();
      })
      .then(data => {
        if (isTecnico) setTecnicoData(data as TecnicoData);
        else           setAdminStats(data as DashboardStats);
      })
      .catch(err => {
        console.error("Dashboard fetch error:", err);
        setError("No se pudieron cargar las estadísticas. Verifica la conexión.");
        if (!isTecnico) {
          setAdminStats({
            ventas:       { hoy: 0, mes: 0, total: 0, cantidad: 0 },
            productos:    { total: 0, bajo_stock: 0, sin_stock: 0 },
            reparaciones: { total: 0, con_checklist: 0, sin_checklist: 0, completadas: 0 },
            cotizaciones: { total: 0, abiertas: 0 },
            gastos:       { mes: 0 },
            ganancias:    { hoy: 0, mes: 0 },
          });
        }
      })
      .finally(() => setLoading(false));
  }, [isTecnico]);

  // ── Loading ──
  if (loading) {
    return (
      <div className="space-y-4 max-w-screen-2xl">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(8)].map((_, i) => <SkeletonBlock key={i} />)}
        </div>
        <SkeletonBlock h="h-12" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <SkeletonBlock h="h-64" />
          <SkeletonBlock h="h-64" />
          <SkeletonBlock h="h-64" />
        </div>
      </div>
    );
  }

  // ── Error banner (solo si no hay datos tampoco) ──
  const errorBanner = error && (
    <div
      className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm mb-4"
      style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.20)", color: "#B91C1C" }}
    >
      <AlertTriangle size={14} /> {error}
    </div>
  );

  // ── Render role-based ──
  if (isTecnico) {
    if (!tecnicoData) return null;
    return (
      <>
        {errorBanner}
        <TecnicoDashboard data={tecnicoData} time={currentTime} />
      </>
    );
  }

  if (!adminStats) return null;
  return (
    <>
      {errorBanner}
      <AdminDashboard stats={adminStats} time={currentTime} />
    </>
  );
}
