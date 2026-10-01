import Link from "next/link";
import { Info } from "lucide-react";
import { requireRole } from "@kit/services/authz";
import { Alert, AlertDescription } from "@kit/ui/alert";
import { Button } from "@kit/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { PageHeader } from "@kit/ui/page-header";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@kit/ui/select";
import { Textarea } from "@kit/ui/textarea";
import { formatMoney } from "@/lib/refunds/format";
import { ADMIN_APPROVAL_THRESHOLD_MINOR } from "@/lib/refunds/service";
import { PAYMENT_METHODS, REASON_LABELS, REFUND_REASONS } from "@/lib/refunds/types";
import { requestRefund } from "../actions";

export default async function NewRefundPage({ searchParams }: PageProps<"/refunds/new">) {
  await requireRole("Ledger.Operator");
  const { error } = await searchParams;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="New refund" description="Submitted refunds go to an approver before any money moves." />

      {typeof error === "string" && (
        <Alert variant="danger">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Refund details</CardTitle>
          <CardDescription>Refunds go back to the customer&apos;s original payment method.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={requestRefund} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="orderId">Order ID</Label>
              <Input id="orderId" name="orderId" required placeholder="ORD-50200" className="font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="amount">Amount (USD)</Label>
              <Input id="amount" name="amount" required inputMode="decimal" placeholder="129.99" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="customerName">Customer name</Label>
              <Input id="customerName" name="customerName" required placeholder="Jane Doe" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="customerEmail">Customer email</Label>
              <Input id="customerEmail" name="customerEmail" type="email" required placeholder="jane@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reason">Reason</Label>
              <Select name="reason" defaultValue="damaged" required>
                <SelectTrigger id="reason" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REFUND_REASONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {REASON_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="paymentMethod">Original payment method</Label>
              <Select name="paymentMethod" defaultValue="Visa" required>
                <SelectTrigger id="paymentMethod" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="note">Note for the approver</Label>
              <Textarea id="note" name="note" placeholder="Ticket number, evidence, anything the approver should know" />
            </div>
            <Alert variant="info" className="sm:col-span-2">
              <Info />
              <AlertDescription>
                Refunds over {formatMoney(ADMIN_APPROVAL_THRESHOLD_MINOR)} need an Admin to approve. You can&apos;t approve your own request.
              </AlertDescription>
            </Alert>
            <div className="flex justify-end gap-2 sm:col-span-2">
              <Button asChild variant="ghost">
                <Link href="/refunds">Cancel</Link>
              </Button>
              <Button type="submit">Submit for approval</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
