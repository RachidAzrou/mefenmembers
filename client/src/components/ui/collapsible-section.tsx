import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

interface CollapsibleSectionProps extends aReact.HTMLAttributes<HTMLDivElement> {
  title: string
  defaultOpen?: boolean
  icon?: React.ReactNode
  children: React.ReactNode
}

export function CollapsibleSection({
  title,
  defaultOpen = true,
  icon,
  children,
  className,
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
              <div className="flex items-center gap-2 text-lg">
                {icon}
                {title}
              </div>
              <ChevronDown
                className={cn(
                  "ml-auto h-5 w-5 shrink-0 text-muted-foreground transition-transform",
                  isOpen && "rotate-180"
                )}
              />
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
