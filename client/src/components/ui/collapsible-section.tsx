import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

interface CollapsibleSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  defaultOpen?: boolean
  icon?: React.ReactNode
  children: React.ReactNode
  action?: React.ReactNode
  titleClassName?: string
}

export function CollapsibleSection({
  title,
  defaultOpen = true,
  icon,
  children,
  action,
  className,
  titleClassName,
  ...props
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen)

  return (
    <Card className={cn("shadow-sm", className)} {...props}>
      <CardHeader className="p-0">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="lg"
              className="w-full justify-start p-4 font-medium hover:bg-transparent"
            >
              <div className={cn("flex items-center gap-2 text-lg", titleClassName)}>
                {icon}
                {title}
              </div>
              <div className="ml-auto flex items-center gap-2">
                {action}
                <ChevronDown
                  className={cn(
                    "h-5 w-5 shrink-0 text-muted-foreground transition-transform",
                    isOpen && "rotate-180"
                  )}
                />
              </div>
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>{children}</CardContent>
          </CollapsibleContent>
        </Collapsible>
      </CardHeader>
    </Card>
  )
}