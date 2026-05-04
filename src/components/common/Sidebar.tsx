import {
  Box, ChevronLeft, ChevronRight, FileText, Home, User, Users,
  CreditCard, Wrench, Settings, ShoppingBag, Building2, GitBranch,
  Tag, Shield, Wallet, BarChart3,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import tecnocellLogo from "../../assets/tecnocell-logo.png";
import { useSidebar } from "../../store/useSidebar";
import { useAuth } from "../../store/useAuth";

// ─── Grupos de navegación ──────────────────────────────────────────────────
const GROUPS = [
  {
    label: "Principal",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: <Home size={18} />, adminOnly: false },
    ],
  },
  {
    label: "Operación",
    items: [
      { to: "/productos",    label: "Productos",    icon: <Box size={18} />,        adminOnly: false },
      { to: "/repuestos",    label: "Repuestos",    icon: <Settings size={18} />,   adminOnly: false },
      { to: "/compras",      label: "Compras",      icon: <ShoppingBag size={18} />,adminOnly: true  },
      { to: "/cotizaciones", label: "Cotizaciones", icon: <FileText size={18} />,   adminOnly: false },
      { to: "/ventas",       label: "Ventas",       icon: <CreditCard size={18} />, adminOnly: false },
    ],
  },
  {
    label: "Servicio técnico",
    items: [
      { to: "/reparaciones",        label: "Reparaciones",      icon: <Wrench size={18} />,    adminOnly: false },
      { to: "/flujo-reparaciones",  label: "Flujo Rep.",        icon: <GitBranch size={18} />, adminOnly: false },
      { to: "/stickers-garantia",   label: "Stickers-garantía", icon: <Tag size={18} />,       adminOnly: true  },
    ],
  },
  {
    label: "Administración",
    items: [
      { to: "/caja-bancos",    label: "Caja y Bancos",   icon: <Wallet size={18} />,   adminOnly: false },
      { to: "/reportes",       label: "Reportes",        icon: <BarChart3 size={18} />,adminOnly: true  },
      { to: "/clientes",       label: "Clientes",        icon: <Users size={18} />,    adminOnly: false },
      { to: "/proveedores",    label: "Proveedores",     icon: <Building2 size={18} />,adminOnly: true  },
      { to: "/admin-usuarios", label: "Admin. usuarios", icon: <Shield size={18} />,   adminOnly: true  },
      { to: "/perfil",         label: "Perfil",          icon: <User size={18} />,     adminOnly: false },
    ],
  },
];

export default function Sidebar() {
  const { isOpen, toggle } = useSidebar();
  const { user } = useAuth();

  const isAdmin = user?.roles?.includes("ADMINISTRADOR") || user?.role === "admin";

  return (
    <aside
      style={{
        width: isOpen ? 272 : 76,
        borderRight: "1px solid var(--color-border)",
        boxShadow: "4px 0 24px rgba(20,50,74,0.07)",
        transition: "width 300ms ease",
      }}
      className="sidebar-bg flex flex-col h-screen fixed left-0 top-0 z-40 overflow-hidden"
    >
      {/* ── Header: solo logo ───────────────────────────────────────────── */}
      <div
        className="flex items-center shrink-0"
        style={{
          height: 68,
          borderBottom: "1px solid var(--color-border)",
          padding: isOpen ? "0 16px" : "0",
          justifyContent: "center",
          transition: "border-color 250ms ease",
        }}
      >
        {isOpen ? (
          <div className="flex items-center gap-2.5 overflow-hidden w-full">
            <div
              className="shrink-0 rounded-xl flex items-center justify-center"
              style={{
                width: 42, height: 42,
                background: "var(--color-surface)",
                boxShadow: "0 2px 10px rgba(72,185,230,0.18)",
              }}
            >
              <img
                src={tecnocellLogo}
                alt="TECNOCELL"
                style={{ width: "100%", height: "100%", objectFit: "contain", padding: 2 }}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                  (e.currentTarget.nextElementSibling as HTMLElement)?.classList.remove("hidden");
                }}
              />
              <span className="hidden font-black text-xs" style={{ color: "#2EA7D8" }}>TC</span>
            </div>
            <div className="leading-tight overflow-hidden">
              <p className="font-bold text-sm tracking-wider truncate" style={{ color: "var(--color-text)" }}>
                TECNOCELL
              </p>
              <p className="text-[10px] tracking-widest truncate" style={{ color: "var(--color-text-sec)" }}>
                SISTEMA COMERCIAL
              </p>
            </div>
          </div>
        ) : (
          <div
            className="rounded-xl flex items-center justify-center"
            style={{
              width: 40, height: 40,
              background: "var(--color-surface)",
              boxShadow: "0 2px 10px rgba(72,185,230,0.18)",
            }}
          >
            <img
              src={tecnocellLogo}
              alt="TC"
              style={{ width: "100%", height: "100%", objectFit: "contain", padding: 3 }}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
                (e.currentTarget.nextElementSibling as HTMLElement)?.classList.remove("hidden");
              }}
            />
            <span className="hidden font-black text-xs" style={{ color: "#2EA7D8" }}>TC</span>
          </div>
        )}
      </div>

      {/* ── Navegación ─────────────────────────────────────────────────── */}
      <nav
        className={isOpen ? "sidebar-nav" : "sidebar-nav-collapsed"}
        style={{ padding: isOpen ? "10px 10px 28px" : "10px 8px 28px" }}
      >
        {GROUPS.map((group, gi) => {
          const visible = group.items.filter(item => !item.adminOnly || isAdmin);
          if (visible.length === 0) return null;
          return (
            <div key={gi} style={{ marginBottom: 6 }}>
              {/* Label de grupo — solo en modo expandido */}
              {isOpen && (
                <p
                  className="font-bold uppercase tracking-[0.14em]"
                  style={{
                    fontSize: 9,
                    color: "var(--color-text-muted)",
                    padding: "10px 12px 4px",
                    letterSpacing: "0.14em",
                  }}
                >
                  {group.label}
                </p>
              )}
              {/* Separador en modo colapsado */}
              {!isOpen && gi > 0 && (
                <div style={{ height: 1, background: "var(--color-border)", margin: "6px 10px" }} />
              )}

              <div className="flex flex-col" style={{ gap: 2 }}>
                {visible.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    title={!isOpen ? item.label : undefined}
                    className={({ isActive }) => isActive ? "tc-nav-active" : "tc-nav-item"}
                  >
                    {({ isActive }) => (
                      <span
                        className="flex items-center transition-all duration-200"
                        style={{
                          gap: isOpen ? 11 : 0,
                          justifyContent: isOpen ? "flex-start" : "center",
                          padding: isOpen ? "0 12px" : "0",
                          height: 44,
                          borderRadius: 12,
                          background: isActive
                            ? "var(--color-active-bg)"
                            : "transparent",
                          border: isActive
                            ? "1px solid var(--color-active-border)"
                            : "1px solid transparent",
                          color: isActive ? "var(--color-text)" : "var(--color-text-sec)",
                          fontWeight: isActive ? 600 : 400,
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive) (e.currentTarget as HTMLElement).style.background = "rgba(72,185,230,0.09)";
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent";
                        }}
                      >
                        <span
                          className="shrink-0"
                          style={{ color: isActive ? "#48B9E6" : "var(--color-text-muted)" }}
                        >
                          {item.icon}
                        </span>
                        {isOpen && (
                          <span className="whitespace-nowrap overflow-hidden" style={{ fontSize: 13.5, letterSpacing: "-0.01em" }}>
                            {item.label}
                          </span>
                        )}
                      </span>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      {/* ── Footer: botón toggle fijo al fondo ──────────────────────────── */}
      <div
        className="shrink-0 flex items-center"
        style={{
          height: 56,
          borderTop: "1px solid var(--color-border)",
          padding: isOpen ? "0 14px" : "0",
          justifyContent: isOpen ? "space-between" : "center",
          transition: "border-color 250ms ease",
        }}
      >
        {isOpen && (
          <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>
            {isOpen ? "Colapsar" : ""}
          </span>
        )}
        <button
          onClick={toggle}
          aria-label={isOpen ? "Colapsar menú" : "Expandir menú"}
          className="rounded-xl transition-all flex items-center justify-center"
          style={{
            width: 34,
            height: 34,
            color: "var(--color-text-sec)",
            border: "1px solid var(--color-border)",
            background: "var(--color-surface-soft)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "rgba(72,185,230,0.14)";
            (e.currentTarget as HTMLElement).style.color      = "#48B9E6";
            (e.currentTarget as HTMLElement).style.borderColor = "rgba(72,185,230,0.35)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "var(--color-surface-soft)";
            (e.currentTarget as HTMLElement).style.color      = "var(--color-text-sec)";
            (e.currentTarget as HTMLElement).style.borderColor = "var(--color-border)";
          }}
        >
          {isOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        </button>
      </div>
    </aside>
  );
}

