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
  Activity, Zap,
} from "lucide-react";

interface DashboardStats {
  ventas:       { hoy: number; mes: number; total: number; cantidad: number };
  productos:    { total: number; bajo_stock: number; sin_stock: number };
  reparaciones: { total: number; con_checklist: number; sin_checklist: number; completadas: number };
  cotizaciones: { total: number; abiertas: number };
  gastos:       { mes: number };
  ganancias:    { hoy: number; mes: number };
}

// ─── Sub-components ────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string;
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
      className="bg-white border border-slate-100 rounded-2xl shadow-sm p-4 text-left w-full hover:shadow-md hover:border-slate-200 transition-all group cursor-pointer"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0 pr-2">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
          <p className="text-2xl font-bold text-slate-800 mt-0.5 leading-none">{value}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>
        </div>
        <div className={`${iconBg} p-2.5 rounded-xl shrink-0 group-hover:scale-105 transition-transform`}>
          {icon}
        </div>
      </div>
      <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px]">{footer}</div>
    </button>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const role = useAuth((state) => state.role);
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    loadDashboardStats();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadDashboardStats = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/dashboard/stats`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) throw new Error("Error al cargar estadísticas");
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error("Error loading dashboard stats:", error);
      setStats({
        ventas:       { hoy: 0, mes: 0, total: 0, cantidad: 0 },
        productos:    { total: 0, bajo_stock: 0, sin_stock: 0 },
        reparaciones: { total: 0, con_checklist: 0, sin_checklist: 0, completadas: 0 },
        cotizaciones: { total: 0, abiertas: 0 },
        gastos:       { mes: 0 },
        ganancias:    { hoy: 0, mes: 0 },
      });
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (date: Date) =>
    date.toLocaleTimeString("es-GT", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  const formatDate = (date: Date) =>
    date.toLocaleDateString("es-GT", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

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

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-screen-2xl">

      {/* ── HEADER ───────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-1">
            <Zap size={11} />
            Panel de Control
          </span>
          <h1 className="text-xl font-bold text-slate-900 leading-tight">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Bienvenido,{" "}
            <span className="font-semibold text-slate-700">
              {role === "admin" ? "Administrador" : "Empleado"}
            </span>
          </p>
        </div>

        {/* Reloj compacto */}
        <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-sm self-start">
          <Clock size={16} className="text-slate-400 shrink-0" />
          <div>
            <p className="text-base font-bold font-mono text-slate-800 leading-none">
              {formatTime(currentTime)}
            </p>
            <p className="text-[10px] text-slate-400 capitalize mt-0.5">
              {formatDate(currentTime)}
            </p>
          </div>
        </div>
      </div>

      {/* ── KPIs FINANCIEROS ─────────────────────────────── */}
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

      {/* ── MINI STATS ───────────────────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Ventas Hoy"
          value={formatMoney(stats.ventas.hoy)}
          sub={`${stats.ventas.cantidad} transacciones`}
          icon={<ShoppingCart size={17} className="text-emerald-600" />}
          iconBg="bg-emerald-50"
          footer={<span className="text-slate-500">Mes: {formatMoney(stats.ventas.mes)}</span>}
          onClick={() => navigate("/ventas")}
        />
        <StatCard
          label="Inventario"
          value={stats.productos.total}
          sub="productos registrados"
          icon={<Package size={17} className="text-blue-600" />}
          iconBg="bg-blue-50"
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
          iconBg="bg-violet-50"
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
          iconBg="bg-amber-50"
          footer={<span className="text-amber-600">Abiertas: {stats.cotizaciones.abiertas}</span>}
          onClick={() => navigate("/cotizaciones")}
        />
      </div>

      {/* ── ACCIONES RÁPIDAS ─────────────────────────────── */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm px-5 py-4">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
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

      {/* ── DETALLE INFERIOR ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-6">

        {/* Estado de Reparaciones */}
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="bg-violet-100 p-1.5 rounded-lg">
                <Wrench size={13} className="text-violet-600" />
              </div>
              <h3 className="text-sm font-semibold text-slate-800">Estado de Reparaciones</h3>
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
              {
                icon: <ClipboardCheck size={13} className="text-white" />,
                bg: "bg-emerald-500", rowBg: "bg-emerald-50",
                label: "Con Checklist", sub: "Proceso completo",
                value: stats.reparaciones.con_checklist, numColor: "text-emerald-700",
              },
              {
                icon: <ClipboardX size={13} className="text-white" />,
                bg: "bg-red-500", rowBg: "bg-red-50",
                label: "Sin Checklist", sub: "Requiere atención",
                value: stats.reparaciones.sin_checklist, numColor: "text-red-700",
              },
              {
                icon: <Wrench size={13} className="text-white" />,
                bg: "bg-blue-500", rowBg: "bg-blue-50",
                label: "Completadas", sub: "Listas para entrega",
                value: stats.reparaciones.completadas, numColor: "text-blue-700",
              },
            ].map((row, i) => (
              <div
                key={i}
                className={`flex items-center justify-between ${row.rowBg} rounded-xl px-3 py-2.5`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`${row.bg} p-1.5 rounded-lg shrink-0`}>{row.icon}</div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">{row.label}</p>
                    <p className="text-[11px] text-slate-500">{row.sub}</p>
                  </div>
                </div>
                <span className={`text-xl font-bold ${row.numColor}`}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Alertas de Stock */}
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="bg-amber-100 p-1.5 rounded-lg">
                <AlertTriangle size={13} className="text-amber-600" />
              </div>
              <h3 className="text-sm font-semibold text-slate-800">Alertas de Stock</h3>
            </div>
            <button
              onClick={() => navigate("/productos")}
              className="flex items-center gap-1 text-xs font-medium text-blue-500 hover:text-blue-700 transition-colors"
            >
              Ver productos <ArrowRight size={12} />
            </button>
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
              <div className="flex items-center gap-2.5">
                <AlertTriangle size={14} className="text-red-500 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-slate-800">Sin Stock</p>
                  <p className="text-[11px] text-slate-500">Reposición inmediata</p>
                </div>
              </div>
              <span className="text-xl font-bold text-red-700">{stats.productos.sin_stock}</span>
            </div>

            <div className="flex items-center justify-between bg-orange-50 border border-orange-100 rounded-xl px-3 py-2.5">
              <div className="flex items-center gap-2.5">
                <Package size={14} className="text-orange-500 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-slate-800">Stock Bajo</p>
                  <p className="text-[11px] text-slate-500">Por debajo del mínimo</p>
                </div>
              </div>
              <span className="text-xl font-bold text-orange-700">{stats.productos.bajo_stock}</span>
            </div>
          </div>

          <button
            onClick={() => navigate("/compras")}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <Plus size={15} />
            Crear Orden de Compra
          </button>
        </div>
      </div>
    </div>
  );
}
