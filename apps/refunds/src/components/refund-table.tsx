import Link from "next/link";
import { Amount } from "@kit/ui/amount";
import { Badge } from "@kit/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@kit/ui/table";
import { RefundStatusBadge } from "@/components/refund-status-badge";
import { formatDate } from "@/lib/refunds/format";
import { REASON_LABELS, type Refund } from "@/lib/refunds/types";

export function RefundTable({ refunds, empty = "No refunds." }: { refunds: readonly Refund[]; empty?: string }) {
  return (
    <Table>
      <TableHeader className="bg-muted/50 [&_tr]:border-t">
        <TableRow className="text-xs tracking-wide uppercase hover:bg-transparent">
          <TableHead className="px-5 text-muted-foreground">Customer</TableHead>
          <TableHead className="px-5 text-muted-foreground">Reason</TableHead>
          <TableHead className="px-5 text-muted-foreground">Method</TableHead>
          <TableHead className="px-5 text-muted-foreground">Requested</TableHead>
          <TableHead className="px-5 text-muted-foreground">Status</TableHead>
          <TableHead className="px-5 text-right text-muted-foreground">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {refunds.length === 0 && (
          <TableRow>
            <TableCell colSpan={6} className="px-5 py-6 text-center text-muted-foreground">
              {empty}
            </TableCell>
          </TableRow>
        )}
        {refunds.map((r) => (
          <TableRow key={r.id}>
            <TableCell className="px-5 py-3">
              <Link href={`/refunds/${r.id}`} className="font-medium hover:underline">
                {r.customerName}
              </Link>
              <p className="font-mono text-xs text-muted-foreground">{r.orderId}</p>
            </TableCell>
            <TableCell className="px-5 py-3">{REASON_LABELS[r.reason]}</TableCell>
            <TableCell className="px-5 py-3">
              <Badge variant="outline" className="rounded-md font-mono text-[11px]">
                {r.paymentMethod}
              </Badge>
            </TableCell>
            <TableCell className="px-5 py-3 text-muted-foreground">
              {formatDate(r.requestedAt)}
              <p className="text-xs">{r.requestedByName}</p>
            </TableCell>
            <TableCell className="px-5 py-3">
              <RefundStatusBadge status={r.status} />
            </TableCell>
            <TableCell className="px-5 py-3 text-right">
              <Amount value={r.amountMinor} minor size="sm" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
