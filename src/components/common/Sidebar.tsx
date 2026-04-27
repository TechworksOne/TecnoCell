import {
  Box, ChevronLeft, ChevronRight, FileText, Home, User, Users,
  CreditCard, Wrench, Settings, ShoppingBag, Building2, GitBranch,
  Tag, Shield, Wallet, BarChart3,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import tecnocellLogo from "../../assets/tecnocell-logo.png";
import { useSidebar } from "../../store/useSidebar";
import { useAuth } from "../../store/useAuth";

const items = [
  { to: "/dashboard",          label: "Dashboard",           icon: <Home size={18} />,         adminOnly: false },
  { to: "/productos",          label: "Productos",           icon: <Box size={18} />,           adminOnly: false },
  { to: "/repuestos",          label: "Repuestos",           icon: <Settings size={18} />,      adminOnly: false },
  { to: "/compras",            label: "Compras",             icon: <ShoppingBag size={18} />,   adminOnly: true  },
  { to: "/cotizaciones",       label: "Cotizaciones",        icon: <FileText size={18} />,      adminOnly: false },
  { to: "/ventas",             label: "Ventas",              icon: <CreditCard size={18} />,    adminOnly: false },
  { to: "/reparaciones",       label: "Reparaciones",        icon: <Wrench size={18} />,        adminOnly: false },
  { to: "/flujo-reparaciones", label: "Flujo Reparaciones",  icon: <GitBranch size={18} />,     adminOnly: false },
  { to: "/caja-bancos",        label: "Caja y Bancos",       icon: <Wallet size={18} />,        adminOnly: false },
  { to: "/reportes",           label: "Reportes",            icon: <BarChart3 size={18} />,     adminOnly: true  },
  { to: "/clientes",           label: "Clientes",            icon: <Users size={18} />,         adminOnly: false },
  { to: "/proveedores",        label: "Proveedores",         icon: <Building2 size={18} />,     adminOnly: true  },
  { to: "/stickers-garantia",  label: "Stickers-garantia",   icon: <Tag size={18} />,           adminOnly: true  },
  { to: "/admin-usuarios",     label: "Admin. usuarios",     icon: <Shield size={18} />,        adminOnly: true  },
  { to: "/perfil",             label: "Perfil",              icon: <User size={18} />,          adminOnly: false },
];

export default function Sidebar() {
  const { isOpen, toggle } = useSidebar();
  const { user } = useAuth();

  const isAdmin = user?.roles?.includes('ADMINISTRADOR') || user?.role === 'admin';
  const visibleItems = items.filter(item => !item.adminOnly || isAdmin);

  return (
    <aside
      className={`${
        isOpen ? "w-64" : "w-16"
      } flex flex-col bg-gradient-to-b from-cyan-50 to-white border-r border-cyan-100 h-screen fixed left-0 top-0 z-40 transition-all duration-300 ease-in-out`}
    >
      {/* ── Logo + Toggle ── */}
      <div
        className={`flex items-center shrink-0 border-b border-cyan-100 bg-white/70 ${
          isOpen
            ? "px-4 py-3 justify-between"
            : "flex-col px-2 py-3 gap-2 justify-center"
        }`}
      >
        {isOpen ? (
          <img src={tecnocellLogo} alt="Tecnocell" className="h-14 w-auto object-contain" />
        ) : (
          <div className="w-8 h-8 bg-cyan-100 rounded-lg flex items-center justify-center shrink-0">
            <span className="text-cyan-700 text-[10px] font-bold">TC</span>
          </div>
        )}
        <button
          onClick={toggle}
          aria-label={isOpen ? "Colapsar menú" : "Expandir menú"}
          className="p-1.5 rounded-lg border border-cyan-200 bg-white text-cyan-500 hover:bg-cyan-50 hover:text-cyan-700 transition-colors shadow-sm shrink-0"
        >
          {isOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        </button>
      </div>

      {/* ── Navegación ── */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 flex flex-col gap-0.5">
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            title={!isOpen ? item.label : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl py-2 px-2.5 transition-all border-l-2 ${
                isActive
                  ? "bg-cyan-100 text-cyan-700 font-semibold border-cyan-500 shadow-sm"
                  : "text-slate-600 border-transparent hover:bg-cyan-50 hover:text-cyan-700"
              } ${!isOpen ? "justify-center" : ""}`
            }
          >
            <span className="shrink-0">{item.icon}</span>
            {isOpen && (
              <span className="text-sm whitespace-nowrap overflow-hidden">{item.label}</span>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
