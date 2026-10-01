import type { Metadata } from "next";
import { PageHeader } from "@/ui-components/page-header";
import { Badge } from "@/ui-components/badge";
import { Gallery } from "./gallery";

export const metadata: Metadata = { title: "UI kit · Ledger" };

export default function UiKitPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="UI kit"
        description="Every component in src/ui-components, rendered with Ledger tokens."
        actions={<Badge variant="outline">shadcn · new-york</Badge>}
      />
      <Gallery />
    </div>
  );
}
