import { CheckCircle2, Info, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";

const ICONS = {
  success: <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />,
  destructive: <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />,
  default: <Info className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />,
} as const;

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(({ id, title, description, action, variant, ...props }) => (
        <Toast key={id} variant={variant} {...props}>
          {ICONS[variant ?? "default"]}
          <div className="grid flex-1 gap-1">
            {title && <ToastTitle>{title}</ToastTitle>}
            {description && <ToastDescription>{description}</ToastDescription>}
          </div>
          {action}
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  );
}
