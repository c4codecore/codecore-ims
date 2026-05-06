import { createContext, useContext, useState, useCallback, useRef } from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Context ───────────────────────────────────────────────────────────────────
const ToastContext = createContext(null);

const ICONS = {
  success: <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />,
  error:   <XCircle     className="size-4 shrink-0 text-destructive"  />,
  info:    <Info        className="size-4 shrink-0 text-primary"      />,
};

// ── Provider ──────────────────────────────────────────────────────────────────
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const toast = useCallback(({ title, description, type = "info", duration = 4000 }) => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, title, description, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
    return id;
  }, []);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      {/* Toast viewport */}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2"
        style={{ maxWidth: "360px", width: "calc(100vw - 2rem)" }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-lg",
              "animate-in slide-in-from-bottom-2 fade-in duration-200"
            )}
          >
            {ICONS[t.type] ?? ICONS.info}
            <div className="min-w-0 flex-1">
              {t.title && (
                <p className="text-sm font-semibold text-foreground">{t.title}</p>
              )}
              {t.description && (
                <p className="text-xs text-muted-foreground">{t.description}</p>
              )}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              className="shrink-0 rounded-md p-0.5 text-muted-foreground hover:text-foreground"
              aria-label="Dismiss"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
