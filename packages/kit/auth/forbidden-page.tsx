import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { APP_NAME } from "@kit/app";
import { Button } from "@kit/ui/button";

export default function Forbidden() {
  return (
    <div className="grid min-h-[60vh] place-items-center p-6">
      <div className="max-w-sm text-center">
        <ShieldAlert className="mx-auto size-8 text-loss" />
        <h1 className="mt-3 text-lg font-semibold">You don&apos;t have access to this page</h1>
        <p className="mt-1 text-sm text-muted-foreground">Ask an admin to assign you the {APP_NAME} role it needs.</p>
        <Button asChild variant="link" className="mt-2">
          <Link href="/">Back to dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
