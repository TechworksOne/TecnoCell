import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import Sidebar from "./components/common/Sidebar";
import Topbar from "./components/common/Topbar";
import { ToastProvider } from "./components/ui/Toast";
import LoginPage from "./pages/Login/LoginPage";
import routes from "./routes";
import { useAuth } from "./store/useAuth";
import { useSidebar } from "./store/useSidebar";

export default function App() {
  const role = useAuth((state) => state.role);
  const initAuth = useAuth((state) => state.initAuth);
  const isOpen = useSidebar((state) => state.isOpen);
  const { pathname } = useLocation();

  // Inicializar autenticación al cargar la app
  useEffect(() => {
    initAuth();
  }, [initAuth]);

  // El login siempre se muestra sin sidebar ni topbar
  if (pathname === "/login" || !role) {
    return (
      <ToastProvider>
        <div className="min-h-screen">
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
      </ToastProvider>
    );
  }

  // Si hay usuario autenticado, mostrar la aplicación completa
  return (
    <ToastProvider>
      <div className="min-h-screen">
        <Sidebar />
        <div className={`${isOpen ? "ml-64" : "ml-16"} flex flex-col transition-all duration-300 ease-in-out`}>
          <Topbar />
          <main className="p-6">
            <Routes>
              {routes.filter(r => r.path !== "/login").map((r) => (
                <Route key={r.path} path={r.path} element={r.element} />
              ))}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/login" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
