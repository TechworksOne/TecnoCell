import { LogOut, Moon, Sun, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../store/useAuth";
import Button from "../ui/Button";

export default function Topbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header
      className="flex items-center justify-between px-4 py-3 border-b"
      style={{
        background:  "var(--color-surface)",
        borderColor: "var(--color-border)",
        transition:  "background 250ms ease, border-color 250ms ease",
      }}
    >
      {/* Izquierda: branding TECNOCELL */}
      <div className="flex items-center gap-2">
        {/* Pastilla de color con inicial */}
        <div
          className="shrink-0 flex items-center justify-center rounded-lg font-black text-white text-sm"
          style={{
            width: 32,
            height: 32,
            background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))",
            letterSpacing: "-0.5px",
          }}
        >
          TC
        </div>

        {/* Texto — oculto en pantallas muy pequeñas */}
        <div className="hidden xs:flex sm:flex flex-col leading-tight">
          <span
            className="text-sm font-bold tracking-wider"
            style={{ color: "var(--color-text)" }}
          >
            TECNOCELL
          </span>
          <span
            className="text-[9px] font-medium uppercase tracking-widest hidden sm:block"
            style={{ color: "var(--color-text-sec)" }}
          >
            Sistema comercial
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Toggle de tema */}
        <button
          onClick={toggleTheme}
          title={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
          className="rounded-xl transition-all flex items-center justify-center shrink-0"
          style={{
            width: 36,
            height: 36,
            background: "var(--color-surface-soft)",
            border: "1px solid var(--color-border)",
            color: "var(--color-text-sec)",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = "rgba(72,185,230,0.12)";
            (e.currentTarget as HTMLElement).style.color      = "var(--color-primary)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = "var(--color-surface-soft)";
            (e.currentTarget as HTMLElement).style.color      = "var(--color-text-sec)";
          }}
        >
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* Información del usuario */}
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl"
          style={{
            background: "var(--color-surface-soft)",
            border:     "1px solid var(--color-border)",
          }}
        >
          <User size={17} style={{ color: "var(--color-text-sec)" }} />
          <div className="text-sm hidden sm:block">
            <p className="font-semibold leading-none" style={{ color: "var(--color-text)" }}>
              {user?.name}
            </p>
            <p className="text-xs mt-0.5 capitalize" style={{ color: "var(--color-text-sec)" }}>
              {user?.role === "admin" ? "Administrador" : user?.role === "tecnico" ? "Técnico" : "Empleado"}
            </p>
          </div>
        </div>

        {/* Cerrar sesión */}
        <Button
          onClick={handleLogout}
          variant="outline"
          className="flex items-center gap-2 text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-950 dark:border-red-800 dark:text-red-400"
        >
          <LogOut size={17} />
          <span className="hidden sm:inline">Cerrar Sesión</span>
        </Button>
      </div>
    </header>
  );
}
