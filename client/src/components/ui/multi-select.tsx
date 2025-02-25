import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type Option = {
  value: string;
  label: string;
};

interface MultiSelectProps {
  options: Option[];
  selected: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Selecteer opties...",
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const selectedItems = options.filter((option) => selected.includes(option.value));
  const filteredOptions = options.filter(option => 
    option.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between",
              !selected.length && "text-muted-foreground"
            )}
          >
            <span className="truncate">
              {selected.length === 0
                ? placeholder
                : `${selected.length} ${selected.length === 1 ? 'item' : 'items'} geselecteerd`}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-full p-0" 
          align="start"
          style={{ maxHeight: '60vh' }}
        >
          <Command className="max-h-full">
            <CommandInput 
              placeholder={`Zoek ${placeholder.toLowerCase()}`}
              value={search}
              onValueChange={setSearch}
              className="border-none focus:ring-0"
            />
            <CommandEmpty>Geen opties gevonden.</CommandEmpty>
            <CommandGroup className="max-h-[40vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
              {filteredOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  onSelect={() => {
                    const newSelected = selected.includes(option.value)
                      ? selected.filter((value) => value !== option.value)
                      : [...selected, option.value];
                    onChange(newSelected);
                  }}
                  className="flex items-center justify-between py-2 px-2 cursor-pointer hover:bg-accent"
                >
                  <div className="flex items-center">
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selected.includes(option.value)
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    {option.label}
                  </div>
                  {selected.includes(option.value) && (
                    <Badge variant="secondary" className="ml-2">
                      Geselecteerd
                    </Badge>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedItems.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedItems.map((item) => (
            <Badge
              key={item.value}
              variant="secondary"
              className="flex items-center gap-1 py-1 px-2"
            >
              {item.label}
              <X
                className="h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onChange(selected.filter((value) => value !== item.value));
                }}
              />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}