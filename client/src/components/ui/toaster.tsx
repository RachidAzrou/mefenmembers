import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, duration = 3000, ...props }) {
        return (
          <Toast 
            key={id} 
            {...props}
            className="bg-[#963E56] text-white border-none"
          >
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription className="text-white/90">{description}</ToastDescription>
              )}
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