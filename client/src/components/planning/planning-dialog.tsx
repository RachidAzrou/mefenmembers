import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import PlanningForm from "./planning-form";
import type { UseFormReturn } from "react-hook-form";
import type { Planning, PlanningFormData } from "./planning-form";

interface PlanningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingPlanning: Planning | null;
  form: UseFormReturn<PlanningFormData>;
  onSubmit: (data: PlanningFormData) => Promise<void>;
  volunteers: { id: string; firstName: string; lastName: string }[];
  rooms: { id: string; name: string }[];
}

export function PlanningDialog({
  open,
  onOpenChange,
  editingPlanning,
  form,
  onSubmit,
  volunteers,
  rooms
}: PlanningDialogProps) {
  return (
    <Dialog 
      open={open} 
      onOpenChange={(newOpen) => {
        if (!newOpen) {
          form.reset({
            isBulkPlanning: false,
            volunteerId: "",
            roomId: "",
            startDate: "",
            endDate: "",
            selectedVolunteers: [],
            selectedRoomId: "",
          });
        }
        onOpenChange(newOpen);
      }}
    >
      <DialogTrigger asChild>
        <Button
          className="gap-2 bg-[#963E56] hover:bg-[#963E56]/90 text-white"
        >
          <Plus className="h-4 w-4" />
          <span>Inplannen</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editingPlanning ? "Planning Bewerken" : "Nieuwe Planning"}
          </DialogTitle>
        </DialogHeader>
        <PlanningForm
          key={editingPlanning ? `edit-${editingPlanning.id}` : 'new-planning'}
          volunteers={volunteers}
          rooms={rooms}
          onSubmit={onSubmit}
          onClose={() => onOpenChange(false)}
          form={form}
          editingPlanning={editingPlanning}
        />
      </DialogContent>
    </Dialog>
  );
}