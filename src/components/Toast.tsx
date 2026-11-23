import { createContext, useCallback, useContext, useEffect, useState } from 'react';

interface ToastOptions {
  action?: { label: string; run: () => void };
}
interface ToastState extends ToastOptions {
  id: number;
  message: string;
}

const ToastContext = createContext<(message: string, options?: ToastOptions) => void>(() => {});

/** Show a short ticket-style message, optionally with an action such as Undo. */
// eslint-disable-next-line react/only-export-components
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);

  const show = useCallback((message: string, options?: ToastOptions) => {
    setToast({ id: Date.now(), message, ...options });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), toast.action ? 6000 : 2600);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        className={`toast ${toast ? 'show' : ''}${toast?.action ? ' has-action' : ''}`}
        role="status"
        aria-live="polite"
      >
        {toast?.message}
        {toast?.action && (
          <button
            className="toast-action"
            onClick={() => {
              toast.action?.run();
              setToast(null);
            }}
          >
            {toast.action.label}
          </button>
        )}
      </div>
    </ToastContext.Provider>
  );
}
