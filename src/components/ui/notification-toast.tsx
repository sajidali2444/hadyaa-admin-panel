"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type NotificationType = "success" | "error";

interface NotificationToastProps {
  type: NotificationType;
  message: string;
  onClose: () => void;
}

export function NotificationToast({ type, message, onClose }: Readonly<NotificationToastProps>) {
  const isSuccess = type === "success";

  return (
    <div className="pointer-events-none fixed inset-x-4 top-4 z-[60] animate-in fade-in slide-in-from-top-2 duration-200 sm:inset-x-auto sm:right-4 sm:w-full sm:max-w-sm">
      <div
        className={cn(
          "pointer-events-auto rounded-xl border px-4 py-3 shadow-lg backdrop-blur",
          isSuccess
            ? "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-700/60 dark:bg-emerald-900/30 dark:text-emerald-200"
            : "border-destructive/40 bg-destructive/10 text-destructive dark:border-destructive/60 dark:bg-destructive/20",
        )}
        role="status"
        aria-live="polite"
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-medium">{message}</p>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-xs"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
