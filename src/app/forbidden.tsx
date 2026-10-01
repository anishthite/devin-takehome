import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export default function Forbidden() {
  return (
    <div className="grid min-h-[60vh] place-items-center p-6">
      <div className="max-w-sm text-center">
        <ShieldAlert className="mx-auto size-8 text-rose-600" />
        <h1 className="mt-3 text-lg font-semibold">You don&apos;t have access to this page</h1>
        <p className="mt-1 text-sm text-zinc-500">Ask an admin to assign you the Ledger role it needs.</p>
        <Link href="/" className="mt-4 inline-block text-sm font-medium text-emerald-700 hover:underline">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
