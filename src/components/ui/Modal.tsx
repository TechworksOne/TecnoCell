import React, { useEffect } from "react";
import { X } from "lucide-react";

export default function Modal({
  open,
  isOpen,
  onClose,
  title,
  children,
  size = "4xl",
}: {
  open?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
  title?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl";
}) {
  const modalOpen = open ?? isOpen ?? false;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose && onClose();
    }
    
    // Prevenir scroll del body cuando el modal está abierto
    if (modalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = 'unset';
    };
  }, [onClose, modalOpen]);

  if (!modalOpen) return null;

  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    "3xl": "max-w-3xl",
    "4xl": "max-w-4xl",
    "5xl": "max-w-5xl",
  };
  
  return (
    <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div
        className={`bg-white dark:bg-[#0D1526] rounded-2xl shadow-2xl dark:shadow-none border border-[#D6EEF8] dark:border-[rgba(72,185,230,0.16)] w-full ${sizeClasses[size]} max-h-[90vh] overflow-y-auto`}
        style={{ boxShadow: "0 24px 80px rgba(20,50,74,0.18)" }}
      >
        {/* Header del modal */}
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#D6EEF8] dark:border-[rgba(72,185,230,0.16)] sticky top-0 bg-white dark:bg-[#0D1526] rounded-t-2xl z-10">
            <h3 className="text-base font-bold text-[#14324A] dark:text-[#F8FAFC]">{title}</h3>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl transition-colors"
                style={{
                  color: "var(--color-text-sec)",
                  background: "transparent",
                  border: "1px solid var(--color-border)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "rgba(72,185,230,0.10)";
                  (e.currentTarget as HTMLElement).style.color = "#48B9E6";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                  (e.currentTarget as HTMLElement).style.color = "var(--color-text-sec)";
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>
        )}

        {/* Contenido del modal */}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
