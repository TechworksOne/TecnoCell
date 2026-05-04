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
        width: isOpen ? 272 : 72,
        background: "linear-gradient(180deg, #FFFFFF 0%, #F6FCFF 100%)",
        borderRight: "1px solid #D6EEF8",
        boxShadow: "8px 0 30px rgba(20,50,74,0.05)",
        transition: "width 300ms ease",
      }}
      className="flex flex-col h-screen fixed left-0 top-0 z-40 overflow-hidden"
    >
      {/* ── Header: logo + toggle ───────────────────────────────────────── */}
      <div
        className="flex items-center shrink-0"
        style={{
          height: 68,
          borderBottom: "1px solid #D6EEF8",
          padding: isOpen ? "0 12px 0 16px" : "0",
          justifyContent: isOpen ? "space-between" : "center",
        }}
      >
        {/* Logo */}
        {isOpen ? (
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div
              className="shrink-0 bg-white rounded-xl flex items-center justify-center"
              style={{ width: 42, height: 42, boxShadow: "0 2px 10px rgba(72,185,230,0.18)" }}
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
              <p className="font-bold text-sm tracking-wider truncate" style={{ color: "#14324A" }}>
                TECNOCELL
              </p>
              <p className="text-[10px] tracking-widest truncate" style={{ color: "#5E7184" }}>
                SISTEMA COMERCIAL
              </p>
            </div>
          </div>
        ) : (
          <div
            className="bg-white rounded-xl flex items-center justify-center"
            style={{ width: 40, height: 40, boxShadow: "0 2px 10px rgba(72,185,230,0.18)" }}
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

        {/* Botón toggle — solo visible en modo expandido */}
        {isOpen && (
          <button
            onClick={toggle}
            aria-label="Colapsar menú"
            className="shrink-0 rounded-lg transition-colors"
            style={{
              width: 28,
              height: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#5E7184",
              border: "1px solid #D6EEF8",
              background: "#FFFFFF",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(72,185,230,0.10)"; (e.currentTarget as HTMLElement).style.color = "#2EA7D8"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#FFFFFF"; (e.currentTarget as HTMLElement).style.color = "#5E7184"; }}
          >
            <ChevronLeft size={14} />
          </button>
        )}

        {/* Botón toggle en modo colapsado */}
        {!isOpen && (
          <button
            onClick={toggle}
            aria-label="Expandir menú"
            className="absolute rounded-lg transition-colors"
            style={{
              bottom: 16,
              left: "50%",
              transform: "translateX(-50%)",
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#5E7184",
              border: "1px solid #D6EEF8",
              background: "#FFFFFF",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(72,185,230,0.10)"; (e.currentTarget as HTMLElement).style.color = "#2EA7D8"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#FFFFFF"; (e.currentTarget as HTMLElement).style.color = "#5E7184"; }}
          >
            <ChevronRight size={14} />
          </button>
        )}
      </div>

      {/* ── Navegación ─────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto" style={{ padding: "10px 8px 80px" }}>
        {GROUPS.map((group, gi) => {
          const visible = group.items.filter(item => !item.adminOnly || isAdmin);
          if (visible.length === 0) return null;
          return (
            <div key={gi} style={{ marginBottom: 4 }}>
              {/* Label de grupo — solo en modo expandido */}
              {isOpen && (
                <p
                  className="font-semibold uppercase tracking-widest"
                  style={{
                    fontSize: 9,
                    color: "#A8BDD0",
                    padding: "10px 10px 4px",
                    letterSpacing: "0.12em",
                  }}
                >
                  {group.label}
                </p>
              )}
              {/* Separador en modo colapsado */}
              {!isOpen && gi > 0 && (
                <div style={{ height: 1, background: "#D6EEF8", margin: "6px 8px" }} />
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
                          gap: isOpen ? 10 : 0,
                          justifyContent: isOpen ? "flex-start" : "center",
                          padding: isOpen ? "0 10px" : "0",
                          height: 44,
                          borderRadius: 12,
                          background: isActive
                            ? "linear-gradient(90deg, rgba(72,185,230,0.22), rgba(72,185,230,0.10))"
                            : "transparent",
                          border: isActive ? "1px solid rgba(72,185,230,0.30)" : "1px solid transparent",
                          color: isActive ? "#14324A" : "#5E7184",
                          fontWeight: isActive ? 600 : 400,
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive) (e.currentTarget as HTMLElement).style.background = "rgba(72,185,230,0.08)";
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent";
                        }}
                      >
                        <span
                          className="shrink-0"
                          style={{ color: isActive ? "#2EA7D8" : "#8AAABB" }}
                        >
                          {item.icon}
                        </span>
                        {isOpen && (
                          <span className="text-sm whitespace-nowrap overflow-hidden" style={{ fontSize: 13.5 }}>
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
    </aside>
  );
}

