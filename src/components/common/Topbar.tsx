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
        background:   "var(--color-surface)",
        borderColor:  "var(--color-border)",
        transition:   "background 250ms ease, border-color 250ms ease",
      }}
    >
      {/* Izquierda: badge de marca */}
      <div className="flex items-center gap-3">
        <div className="flex items-center bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-3 py-1 rounded-lg text-sm font-semibold">
          TECNOCELL by EMPRENDE360
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Toggle de tema */}
        <button
          onClick={toggleTheme}
          title={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
          className="rounded-xl transition-all flex items-center justify-center"
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
            background:  "var(--color-surface-soft)",
            border:      "1px solid var(--color-border)",
          }}
        >
          <User size={17} style={{ color: "var(--color-text-sec)" }} />
          <div className="text-sm">
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
          <span>Cerrar Sesión</span>
        </Button>
      </div>
    </header>
  );
}
