"use client";

export interface ToastItem {
  id: string;
  message: string;
  type: "success" | "error";
}

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export default function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed top-4 left-1/2 z-50 flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4 sm:top-6">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className={`pointer-events-auto flex items-start gap-2.5 rounded-lg border px-4 py-3 text-sm font-medium shadow-lg backdrop-blur animate-[toast-in_0.2s_ease-out] ${
            toast.type === "success"
              ? "border-green-200 bg-green-50/95 text-green-800"
              : "border-red-200 bg-red-50/95 text-red-800"
          }`}
        >
          <span className="mt-0.5 flex-shrink-0">
            {toast.type === "success" ? "✓" : "✕"}
          </span>
          <span className="flex-1">{toast.message}</span>
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            aria-label="Dismiss"
            className="flex-shrink-0 text-lg leading-none opacity-50 transition-opacity hover:opacity-100"
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );
}
