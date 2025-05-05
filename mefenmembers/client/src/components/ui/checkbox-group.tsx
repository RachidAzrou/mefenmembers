import * as React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface CheckboxGroupProps {
  items: Array<{
    id: string;
    label: string;
  }>;
  selected: string[];
  onSelectionChange: (selected: string[]) => void;
  className?: string;
}

export function CheckboxGroup({
  items,
  selected,
  onSelectionChange,
  className,
}: CheckboxGroupProps) {
  const handleCheckboxChange = (id: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selected, id]);
    } else {
      onSelectionChange(selected.filter((i) => i !== id));
    }
  };

  return (
    <div className={cn("grid gap-2", className)}>
      {items.map((item) => (
        <div key={item.id} className="flex items-center space-x-2">
          <Checkbox
            id={item.id}
            checked={selected.includes(item.id)}
            onCheckedChange={(checked) => handleCheckboxChange(item.id, checked as boolean)}
          />
          <Label
            htmlFor={item.id}
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            {item.label}
          </Label>
        </div>
      ))}
    </div>
  );
}
