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
      { to: "/dashboard", label: "Dashboard", icon: <Home size={17} />, adminOnly: false },
    ],
  },
  {
    label: "Operación",
    items: [
      { to: "/productos",    label: "Productos",    icon: <Box size={17} />,         adminOnly: false },
      { to: "/repuestos",    label: "Repuestos",    icon: <Settings size={17} />,    adminOnly: false },
      { to: "/compras",      label: "Compras",      icon: <ShoppingBag size={17} />, adminOnly: true  },
      { to: "/cotizaciones", label: "Cotizaciones", icon: <FileText size={17} />,    adminOnly: false },
      { to: "/ventas",       label: "Ventas",       icon: <CreditCard size={17} />,  adminOnly: false },
    ],
  },
  {
    label: "Servicio técnico",
    items: [
      { to: "/reparaciones",        label: "Reparaciones",      icon: <Wrench size={17} />,    adminOnly: false },
      { to: "/flujo-reparaciones",  label: "Flujo Rep.",        icon: <GitBranch size={17} />, adminOnly: false },
      { to: "/stickers-garantia",   label: "Stickers garantía", icon: <Tag size={17} />,       adminOnly: true  },
    ],
  },
  {
    label: "Administración",
    items: [
      { to: "/caja-bancos",    label: "Caja y Bancos",   icon: <Wallet size={17} />,    adminOnly: false },
      { to: "/reportes",       label: "Reportes",        icon: <BarChart3 size={17} />, adminOnly: true  },
      { to: "/clientes",       label: "Clientes",        icon: <Users size={17} />,     adminOnly: false },
      { to: "/proveedores",    label: "Proveedores",     icon: <Building2 size={17} />, adminOnly: true  },
      { to: "/admin-usuarios", label: "Admin. usuarios", icon: <Shield size={17} />,    adminOnly: true  },
      { to: "/perfil",         label: "Perfil",          icon: <User size={17} />,      adminOnly: false },
    ],
  },
];

export default function Sidebar() {
  const { isOpen, toggle } = useSidebar();
  const { user } = useAuth();

  const isAdmin = user?.roles?.includes("ADMINISTRADOR") || user?.role === "admin";

  return (
    <aside
      className="sidebar-bg flex flex-col h-screen fixed left-0 top-0 z-40 overflow-hidden"
      style={{
        width: isOpen ? 264 : 72,
        borderRight: "1px solid var(--color-border)",
        transition: "width 280ms cubic-bezier(.4,0,.2,1)",
      }}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div
        className="shrink-0 flex items-center"
        style={{
          height: 64,
          padding: isOpen ? "0 14px" : "0",
          justifyContent: isOpen ? "flex-start" : "center",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        {isOpen ? (
          <div className="flex items-center gap-3 overflow-hidden w-full">
            <img
              src={tecnocellLogo}
              alt="TECNOCELL"
              style={{ height: 36, width: "auto", objectFit: "contain", flexShrink: 0 }}
            />
            <div className="leading-tight overflow-hidden">
              <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.06em", color: "var(--color-text)", whiteSpace: "nowrap" }}>
                TECNOCELL
              </p>
              <p style={{ fontSize: 9, fontWeight: 500, letterSpacing: "0.12em", color: "var(--color-text-muted)", textTransform: "uppercase" }}>
                Sistema comercial
              </p>
            </div>
          </div>
        ) : (
          <img
            src={tecnocellLogo}
            alt="TC"
            style={{ height: 32, width: 32, objectFit: "contain" }}
          />
        )}
      </div>

      {/* ── Navegación ─────────────────────────────────────────────────── */}
      <nav
        className={isOpen ? "sidebar-nav" : "sidebar-nav-collapsed"}
        style={{ padding: isOpen ? "8px 10px 20px" : "8px 7px 20px" }}
      >
        {GROUPS.map((group, gi) => {
          const visible = group.items.filter(item => !item.adminOnly || isAdmin);
          if (visible.length === 0) return null;

          return (
            <div key={gi} style={{ marginBottom: 2 }}>
              {/* Grupo label — solo expandido */}
              {isOpen ? (
                <div className="flex items-center gap-1.5" style={{ padding: "12px 6px 4px" }}>
                  <div style={{ height: 1, width: 10, background: "#48B9E6", borderRadius: 999, opacity: 0.7 }} />
                  <p style={{
                    fontSize: 9.5,
                    fontWeight: 700,
                    letterSpacing: "0.13em",
                    textTransform: "uppercase",
                    color: "var(--color-text-muted)",
                  }}>
                    {group.label}
                  </p>
                </div>
              ) : (
                gi > 0 && (
                  <div style={{ height: 1, background: "var(--color-border)", margin: "8px 8px" }} />
                )
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {visible.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    title={!isOpen ? item.label : undefined}
                  >
                    {({ isActive }) => (
                      <div
                        className="flex items-center transition-all duration-150"
                        style={{
                          gap: isOpen ? 10 : 0,
                          justifyContent: isOpen ? "flex-start" : "center",
                          padding: isOpen ? "0 10px" : "0",
                          height: 42,
                          borderRadius: 10,
                          position: "relative",
                          cursor: "pointer",
                          background: isActive
                            ? "linear-gradient(90deg, rgba(72,185,230,0.18) 0%, rgba(72,185,230,0.07) 100%)"
                            : "transparent",
                          boxShadow: isActive ? "inset 0 0 0 1px rgba(72,185,230,0.22)" : "none",
                          color: isActive ? "var(--color-text)" : "var(--color-text-sec)",
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive) e.currentTarget.style.background = "rgba(72,185,230,0.08)";
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive) e.currentTarget.style.background = "transparent";
                        }}
                      >
                        {/* Left accent bar for active */}
                        {isActive && isOpen && (
                          <div style={{
                            position: "absolute",
                            left: 0,
                            top: "20%",
                            height: "60%",
                            width: 3,
                            borderRadius: "0 3px 3px 0",
                            background: "linear-gradient(180deg, #48B9E6, #2563EB)",
                          }} />
                        )}

                        {/* Icon */}
                        <span style={{
                          color: isActive ? "#48B9E6" : "var(--color-text-muted)",
                          flexShrink: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: isOpen ? "auto" : 24,
                          transition: "color 150ms",
                        }}>
                          {item.icon}
                        </span>

                        {/* Label */}
                        {isOpen && (
                          <span style={{
                            fontSize: 13.5,
                            fontWeight: isActive ? 600 : 400,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            letterSpacing: "-0.01em",
                          }}>
                            {item.label}
                          </span>
                        )}
                      </div>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      {/* ── Footer toggle ───────────────────────────────────────────────── */}
      <div
        className="shrink-0 flex items-center"
        style={{
          height: 52,
          borderTop: "1px solid var(--color-border)",
          padding: isOpen ? "0 12px 0 14px" : "0",
          justifyContent: isOpen ? "space-between" : "center",
        }}
      >
        {isOpen && (
          <p style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "0.05em", color: "var(--color-text-muted)" }}>
            v2.0 · TECNOCELL
          </p>
        )}
        <button
          onClick={toggle}
          aria-label={isOpen ? "Colapsar menú" : "Expandir menú"}
          style={{
            width: 32, height: 32,
            borderRadius: 8,
            border: "1px solid var(--color-border)",
            background: "var(--color-surface-soft)",
            color: "var(--color-text-sec)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "all 150ms",
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "rgba(72,185,230,0.15)";
            (e.currentTarget as HTMLElement).style.color = "#48B9E6";
            (e.currentTarget as HTMLElement).style.borderColor = "rgba(72,185,230,0.4)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "var(--color-surface-soft)";
            (e.currentTarget as HTMLElement).style.color = "var(--color-text-sec)";
            (e.currentTarget as HTMLElement).style.borderColor = "var(--color-border)";
          }}
        >
          {isOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        </button>
      </div>
    </aside>
  );
}

