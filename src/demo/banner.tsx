import { FlaskConical } from "lucide-react";

export function DemoBanner() {
  return (
    <div className="flex items-center justify-center gap-2 bg-amber-400 px-4 py-1.5 text-xs font-medium text-amber-950">
      <FlaskConical className="size-3.5" />
      Demo mode — mock sign-in and sample data, not connected to Microsoft Entra
    </div>
  );
}
