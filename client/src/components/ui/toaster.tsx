import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { cn } from "@/lib/utils"
import { Check, AlertCircle } from "lucide-react"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, duration = 3000, ...props }) {
        return (
          <Toast 
            key={id} 
            {...props}
            className={cn(
              props.variant === "success" 
                ? "bg-green-600 text-white border-none" 
                : props.variant === "destructive"
                  ? "bg-red-600 text-white border-none"
                  : "bg-[#963E56] text-white border-none"
            )}
          >
            <div className="flex gap-3">
              {props.variant === "success" && (
                <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Check className="h-5 w-5 text-white" />
                </div>
              )}
              {props.variant === "destructive" && (
                <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-white" />
                </div>
              )}
              <div className="grid gap-1">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && (
                  <ToastDescription className="text-white/90">{description}</ToastDescription>
                )}
              </div>
            </div>
            {action}
            <ToastClose className="text-white/90 hover:text-white" />
          </Toast>
        )
      })}
      <ToastViewport className="top-0 right-0 flex-col-reverse sm:top-0 sm:right-0 md:max-w-[420px]" />
    </ToastProvider>
  )
}