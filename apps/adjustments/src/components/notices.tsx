import { CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@kit/ui/alert";

/** Renders the `?error=` / `?notice=` set by server actions. */
export function Notices({ error, notice }: { error?: string | string[]; notice?: string | string[] }) {
  if (typeof error === "string") {
    return (
      <Alert variant="danger">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }
  if (typeof notice === "string") {
    return (
      <Alert variant="success" role="status">
        <CheckCircle2 />
        <AlertDescription>{notice}</AlertDescription>
      </Alert>
    );
  }
  return null;
}
