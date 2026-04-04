import {
  BarChart2,
  Building2,
  Eye,
  EyeOff,
  Lock,
  Package,
  ShoppingCart,
  TrendingUp,
  Users,
  Wrench,
  Zap,
} from "lucide-react";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../store/useAuth";
import { useBusiness } from "../../store/useBusiness";

// ─── Feature list ─────────────────────────────────────────────────────────────
const FEATURES = [
  { icon: BarChart2, label: "Reportes",   sub: "Analítica en tiempo real",  color: "text-violet-300" },
  { icon: Users,     label: "Clientes",   sub: "CRM integrado",             color: "text-blue-300"   },
  { icon: ShoppingCart, label: "Ventas",  sub: "POS y facturación",         color: "text-cyan-300"   },
  { icon: Package,   label: "Inventario", sub: "Control de stock",          color: "text-indigo-300" },
];

// ─── Fake metric cards for the mock dashboard ────────────────────────────────
const MOCK_STATS = [
  { label: "Ventas hoy",   value: "Q 4,320", delta: "+12%", up: true  },
  { label: "Reparaciones", value: "18",       delta: "+3",   up: true  },
  { label: "Stock bajo",   value: "5",        delta: "-2",   up: false },
];

export default function LoginPage() {
  const [username, setUsername]       = useState("");
  const [password, setPassword]       = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading, error }   = useAuth();
  const { businessInfo }              = useBusiness();
  const navigate                      = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await login({ username, password });
      navigate("/dashboard");
    } catch (err) {
      console.error("Error al iniciar sesión:", err);
    }
  }

  return (
    <div className="min-h-screen flex bg-slate-950 font-sans">

      {/* ═══════════════════════════════════════════════
          LEFT — branding panel (hidden on mobile)
      ═══════════════════════════════════════════════ */}
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden flex-col justify-between p-10 xl:p-14">

        {/* Multi-layer gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-violet-950 to-slate-900" />
        {/* Glowing orbs */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 -right-20 w-80 h-80 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 left-1/3 w-72 h-72 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
        {/* Subtle grid overlay */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.6) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.6) 1px,transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* ── Logo + brand ──────────────────────────────── */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/30">
              {businessInfo?.businessLogo ? (
                <img src={businessInfo.businessLogo} alt="Logo" className="w-full h-full object-contain rounded-xl" />
              ) : (
                <Wrench size={20} className="text-white" />
              )}
            </div>
            <span className="text-white/90 font-semibold text-sm tracking-wide">
              TECNOCELL · EMPRENDE360
            </span>
          </div>
        </div>

        {/* ── Main copy ─────────────────────────────────── */}
        <div className="relative z-10 space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-full px-3 py-1.5">
              <Zap size={12} className="text-violet-400" />
              <span className="text-violet-300 text-xs font-medium tracking-widest uppercase">Sistema ERP</span>
            </div>
            <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight">
              Gestión inteligente<br />
              <span className="bg-gradient-to-r from-violet-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                para tu negocio
              </span>
            </h1>
            <p className="text-slate-400 text-lg leading-relaxed max-w-sm">
              Control total de ventas, clientes e inventario en tiempo real.
            </p>
          </div>

          {/* Feature grid */}
          <div className="grid grid-cols-2 gap-3">
            {FEATURES.map(({ icon: Icon, label, sub, color }) => (
              <div
                key={label}
                className="group bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.07] rounded-2xl p-4 transition-all duration-300 cursor-default"
              >
                <Icon size={20} className={`${color} mb-2.5 transition-transform duration-300 group-hover:scale-110`} />
                <p className="text-white font-semibold text-sm">{label}</p>
                <p className="text-slate-500 text-xs mt-0.5">{sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Mock dashboard card ────────────────────────── */}
        <div className="relative z-10">
          <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-white/70 text-xs font-semibold uppercase tracking-widest">Resumen del día</span>
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-red-400/70" />
                <div className="w-2 h-2 rounded-full bg-yellow-400/70" />
                <div className="w-2 h-2 rounded-full bg-emerald-400/70" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {MOCK_STATS.map(({ label, value, delta, up }) => (
                <div key={label} className="bg-white/[0.04] rounded-xl p-3">
                  <p className="text-slate-500 text-[10px] uppercase tracking-wider">{label}</p>
                  <p className="text-white font-bold text-base mt-1">{value}</p>
                  <p className={`text-[11px] font-medium mt-0.5 flex items-center gap-0.5 ${up ? "text-emerald-400" : "text-rose-400"}`}>
                    <TrendingUp size={10} className={up ? "" : "rotate-180"} />
                    {delta}
                  </p>
                </div>
              ))}
            </div>
            {/* Fake sparkline */}
            <div className="mt-4 flex items-end gap-1 h-10">
              {[30, 55, 40, 70, 50, 80, 65, 90, 75, 95, 80, 100].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-sm bg-gradient-to-t from-violet-600/40 to-blue-500/40"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          RIGHT — login form
      ═══════════════════════════════════════════════ */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-slate-950 lg:bg-slate-900/50">
        <div className="w-full max-w-[420px] space-y-8">

          {/* Mobile-only brand header */}
          <div className="lg:hidden text-center space-y-3">
            <div className="w-12 h-12 mx-auto bg-gradient-to-br from-violet-500 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-500/30">
              {businessInfo?.businessLogo ? (
                <img src={businessInfo.businessLogo} alt="Logo" className="w-full h-full object-contain rounded-2xl" />
              ) : (
                <Wrench size={22} className="text-white" />
              )}
            </div>
            <p className="text-slate-400 text-xs font-medium tracking-widest uppercase">TECNOCELL · EMPRENDE360</p>
          </div>

          {/* Form card */}
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-3xl shadow-2xl shadow-black/40 p-8 backdrop-blur-sm space-y-7">

            {/* Heading */}
            <div className="space-y-1.5">
              <h2 className="text-2xl font-bold text-white tracking-tight">Iniciar Sesión</h2>
              <p className="text-slate-400 text-sm">
                {businessInfo ? `Bienvenido a ${businessInfo.businessName}` : "Accede a tu cuenta para continuar"}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Error alert */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 flex items-start gap-2.5">
                  <span className="text-red-400 text-lg leading-none mt-0.5">⚠</span>
                  <p className="text-red-300 text-sm font-medium">{error}</p>
                </div>
              )}

              {/* Username */}
              <div className="space-y-2">
                <label htmlFor="username" className="block text-xs font-semibold text-slate-400 uppercase tracking-widest">
                  Usuario
                </label>
                <div className="relative group">
                  <Building2
                    size={16}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-violet-400 transition-colors pointer-events-none"
                  />
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Tu nombre de usuario"
                    required
                    disabled={isLoading}
                    autoComplete="username"
                    className="w-full pl-11 pr-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all duration-200 disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label htmlFor="password" className="block text-xs font-semibold text-slate-400 uppercase tracking-widest">
                  Contraseña
                </label>
                <div className="relative group">
                  <Lock
                    size={16}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-violet-400 transition-colors pointer-events-none"
                  />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    disabled={isLoading}
                    autoComplete="current-password"
                    className="w-full pl-11 pr-12 py-3 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all duration-200 disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-300 transition-colors rounded-lg"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading || !username || !password}
                className="relative w-full py-3.5 rounded-xl font-semibold text-sm text-white overflow-hidden group transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-slate-900"
              >
                {/* gradient bg */}
                <span className="absolute inset-0 bg-gradient-to-r from-violet-600 via-blue-600 to-cyan-600 transition-all duration-300 group-hover:from-violet-500 group-hover:via-blue-500 group-hover:to-cyan-500" />
                {/* glow */}
                <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl bg-gradient-to-r from-violet-600 via-blue-600 to-cyan-600" />
                <span className="relative flex items-center justify-center gap-2">
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Ingresando...
                    </>
                  ) : (
                    <>
                      Ingresar
                    </>
                  )}
                </span>
              </button>
            </form>

            {/* Footer */}
            <p className="text-center text-xs text-slate-600">
              ¿Problemas para ingresar?{" "}
              <a href="#" className="text-slate-400 hover:text-violet-400 transition-colors font-medium">
                Contacta al administrador
              </a>
            </p>
          </div>

          {/* Bottom caption */}
          <p className="text-center text-xs text-slate-700">
            Sistema de gestión comercial · v2.0 · TECNOCELL
          </p>
        </div>
      </div>
    </div>
  );
}
