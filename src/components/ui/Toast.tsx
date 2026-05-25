import React, { createContext, useContext, useState } from "react";

type ToastType = "success" | "error" | "info";
type ToastItem = { id: string; message: string; type: ToastType };
const ToastContext = createContext<any>(null);

// Generate unique ID with timestamp + random string
let toastCounter = 0;
function generateToastId() {
  return `${Date.now()}-${++toastCounter}-${Math.random().toString(36).substr(2, 9)}`;
}

const toastColors: Record<ToastType, string> = {
  success: "bg-green-700",
  error: "bg-red-700",
  info: "bg-slate-700",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  function add(message: string, type: ToastType = "success") {
    const t = { id: generateToastId(), message, type };
    setToasts((s) => [...s, t]);
    setTimeout(() => setToasts((s) => s.filter((x) => x.id !== t.id)), 3000);
  }
  return (
    <ToastContext.Provider value={{ add }}>
      {children}
      <div className="fixed right-4 bottom-4 flex flex-col gap-2 z-50">
        {toasts.map((t) => (
          <div key={t.id} className={`${toastColors[t.type]} text-white px-4 py-2 rounded shadow`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
