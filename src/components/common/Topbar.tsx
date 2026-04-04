import { LogOut, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../store/useAuth";
import Button from "../ui/Button";

export default function Topbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="flex items-center justify-between p-4 border-b bg-white">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-3 py-1 rounded-lg text-sm font-semibold">
            TECNOCELL by EMPRENDE360
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Información del usuario */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-lg">
            <User size={18} className="text-gray-600" />
            <div className="text-sm">
              <p className="font-semibold text-gray-800">{user?.name}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role === 'admin' ? 'Administrador' : 'Empleado'}</p>
            </div>
          </div>
        </div>

        {/* Botón de cerrar sesión */}
        <Button
          onClick={handleLogout}
          variant="outline"
          className="flex items-center gap-2 text-red-600 border-red-300 hover:bg-red-50"
        >
          <LogOut size={18} />
          <span>Cerrar Sesión</span>
        </Button>
      </div>
    </header>
  );
}
