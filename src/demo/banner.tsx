import { FlaskConical } from "lucide-react";
import { Banner } from "@/ui-components/banner";

export function DemoBanner() {
  return (
    <Banner variant="warning">
      <FlaskConical />
      Demo mode — mock Entra sign-in (OIDC) and sample data, not connected to Microsoft
    </Banner>
  );
}
