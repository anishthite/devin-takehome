"use client";

import { useState, type ReactNode } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  CreditCard,
  Info,
  Landmark,
  MoreHorizontal,
  PiggyBank,
  Plus,
  Send,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/ui-components/alert";
import { Amount } from "@/ui-components/amount";
import { Avatar, AvatarFallback } from "@/ui-components/avatar";
import { Badge } from "@/ui-components/badge";
import { BalanceCard } from "@/ui-components/balance-card";
import { Banner } from "@/ui-components/banner";
import { Button } from "@/ui-components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui-components/card";
import { Checkbox } from "@/ui-components/checkbox";
import { CurrencyInput } from "@/ui-components/currency-input";
import { Delta } from "@/ui-components/delta";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/ui-components/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/ui-components/dropdown-menu";
import { FlowChart, FlowLegend } from "@/ui-components/flow-chart";
import { GoalProgress } from "@/ui-components/goal-progress";
import { Input } from "@/ui-components/input";
import { Label } from "@/ui-components/label";
import { LogoMark } from "@/ui-components/logo";
import { PaymentCard } from "@/ui-components/payment-card";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui-components/popover";
import { Progress } from "@/ui-components/progress";
import { RadioGroup, RadioGroupItem } from "@/ui-components/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/ui-components/select";
import { Separator } from "@/ui-components/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/ui-components/sheet";
import { Skeleton } from "@/ui-components/skeleton";
import { Toaster } from "@/ui-components/sonner";
import { Sparkline } from "@/ui-components/sparkline";
import { StatCard } from "@/ui-components/stat-card";
import { StatusBadge } from "@/ui-components/status-badge";
import { Switch } from "@/ui-components/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui-components/tabs";
import { Textarea } from "@/ui-components/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/ui-components/toggle-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui-components/tooltip";
import {
  TransactionGroupLabel,
  TransactionList,
  TransactionRow,
} from "@/ui-components/transaction-list";

const SWATCHES = [
  { name: "Ink", token: "--ink", className: "bg-ink" },
  { name: "Primary", token: "--primary", className: "bg-primary" },
  { name: "Brand", token: "--brand", className: "bg-brand" },
  { name: "Brand strong", token: "--brand-strong", className: "bg-brand-strong" },
  { name: "Gain", token: "--gain", className: "bg-gain" },
  { name: "Loss", token: "--loss", className: "bg-loss" },
  { name: "Warning", token: "--warning", className: "bg-warning" },
  { name: "Info", token: "--info", className: "bg-info" },
  { name: "Muted", token: "--muted", className: "bg-muted" },
  { name: "Border", token: "--border", className: "bg-border" },
];

const BALANCE_HISTORY = [212, 218, 215, 224, 231, 227, 236, 241, 238, 247, 252, 249, 258, 263];

const FLOW = Array.from({ length: 14 }, (_, i) => ({
  label: `Sep ${i + 17}`,
  inflow: [184, 420, 0, 97, 150, 0, 312, 260, 0, 149, 98, 402, 0, 211][i] * 100_00,
  outflow: [48, 120, 312, 0, 64, 125, 0, 73, 210, 0, 21, 98, 312, 47][i] * 100_00,
}));

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function SendPaymentDialog() {
  const [amount, setAmount] = useState("1250.00");
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="brand">
          <Send /> New payment
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New payment</DialogTitle>
          <DialogDescription>Drafts need an Approver before they are released.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <CurrencyInput size="hero" value={amount} onValueChange={setAmount} aria-label="Amount" />
          <div className="grid gap-2">
            <Label htmlFor="payee">Counterparty</Label>
            <Select defaultValue="northwind">
              <SelectTrigger id="payee" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="northwind">Northwind Traders</SelectItem>
                <SelectItem value="contoso">Contoso Ltd</SelectItem>
                <SelectItem value="litware">Litware Leasing</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Rail</Label>
            <RadioGroup defaultValue="ach" className="grid grid-cols-3 gap-2">
              {["ach", "wire", "rtp"].map((rail) => (
                <Label
                  key={rail}
                  className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 uppercase has-[[data-state=checked]]:border-brand has-[[data-state=checked]]:bg-brand-soft"
                >
                  <RadioGroupItem value={rail} /> {rail}
                </Label>
              ))}
            </RadioGroup>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="memo">Memo</Label>
            <Textarea id="memo" placeholder="Invoice #4821" className="w-full" />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <DialogClose asChild>
            <Button
              onClick={() =>
                toast.success("Draft created", {
                  description: `$${amount} to Northwind Traders is awaiting approval.`,
                })
              }
            >
              Create draft
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function Gallery() {
  const [amount, setAmount] = useState("");
  return (
    <TooltipProvider>
      <Tabs defaultValue="finance" className="gap-6">
        <TabsList>
          <TabsTrigger value="finance">Finance</TabsTrigger>
          <TabsTrigger value="primitives">Primitives</TabsTrigger>
          <TabsTrigger value="forms">Forms & overlays</TabsTrigger>
          <TabsTrigger value="tokens">Tokens</TabsTrigger>
        </TabsList>

        <TabsContent value="finance" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <BalanceCard
              variant="ink"
              label="Operating account"
              balance={263_418.52}
              change={3.42}
              changeLabel="vs last 14d"
              history={BALANCE_HISTORY}
              actions={
                <>
                  <Button size="sm" variant="brand">
                    <Send /> Pay
                  </Button>
                  <Button size="sm" variant="secondary">
                    <Plus /> Request
                  </Button>
                </>
              }
            />
            <BalanceCard
              label="Reserve account"
              balance={88_120}
              change={-0.84}
              changeLabel="vs last 14d"
              history={[...BALANCE_HISTORY].reverse()}
            />
            <div className="grid gap-4">
              <StatCard label="Inflow · 14d" value={<Amount value={192_650} size="xl" className="text-2xl" />} icon={<ArrowDownLeft />} tone="gain" change={12.4} hint="vs prior" />
              <StatCard label="Outflow · 14d" value={<Amount value={143_080} size="xl" className="text-2xl" />} icon={<ArrowUpRight />} change={6.1} invertChange hint="vs prior" />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>FlowChart</CardTitle>
                <CardDescription>Inflow vs outflow per day, minor units in, formatted out.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <FlowLegend />
                <FlowChart data={FLOW} minor />
              </CardContent>
            </Card>
            <Section title="TransactionList" description="Compact feed with status + signed amounts.">
              <TransactionList>
                <TransactionGroupLabel>Today</TransactionGroupLabel>
                <TransactionRow merchant="Contoso Ltd" category="Wire" date="Quarterly retainer" amount={42_000_00} minor icon={<Building2 />} />
                <TransactionRow merchant="Adatum Payroll" category="ACH" date="Payroll run" amount={-31_200_00} minor status="pending" />
                <TransactionGroupLabel>Yesterday</TransactionGroupLabel>
                <TransactionRow merchant="Azure" category="Card" date="Cloud services" amount={-4_812_00} minor icon={<CreditCard />} />
                <TransactionRow merchant="Tailspin Toys" category="Card" date="Refund" amount={-640_00} minor status="failed" />
              </TransactionList>
            </Section>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Section title="PaymentCard" description="Ink, emerald and graphite issuer cards.">
              <div className="flex flex-col gap-3">
                <PaymentCard last4="4821" holder="Avery Admin" expiry="08/29" label="Ledger Corporate" />
                <PaymentCard variant="emerald" network="mastercard" last4="1193" holder="Jordan Approver" expiry="02/28" label="Ledger Expense" frozen />
              </div>
            </Section>
            <Section title="GoalProgress" description="Targets such as reserves or budget caps.">
              <div className="space-y-6">
                <GoalProgress name="Tax reserve" dueLabel="Due Jan 15" current={64_200} target={90_000} icon={<Landmark />} />
                <GoalProgress name="Runway buffer" dueLabel="6 months of opex" current={410_000} target={500_000} icon={<PiggyBank />} />
              </div>
            </Section>
            <Section title="Amount · Delta · Sparkline" description="Tabular money, trend chips, inline trends.">
              <div className="space-y-4">
                <Amount value={1_284_310.07} size="display" className="text-4xl" />
                <div className="flex flex-wrap items-center gap-3">
                  <Amount value={1250} signed tone="auto" />
                  <Amount value={-980.5} signed tone="auto" />
                  <Amount value={350_000} currency="JPY" />
                  <Amount value={1250} masked />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Delta value={4.21} />
                  <Delta value={-1.37} />
                  <Delta value={-2.5} invert suffix="spend" />
                  <Delta value={0} variant="inline" />
                </div>
                <Sparkline data={BALANCE_HISTORY} />
              </div>
            </Section>
          </div>
        </TabsContent>

        <TabsContent value="primitives" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Section title="Button" description="Primary is ink; brand emerald is reserved for money-moving CTAs.">
              <div className="flex flex-wrap gap-2">
                <Button>Primary</Button>
                <Button variant="brand">Brand</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="destructive">Reject</Button>
                <Button variant="link">Link</Button>
                <Button size="icon" variant="outline" aria-label="More">
                  <MoreHorizontal />
                </Button>
              </div>
            </Section>
            <Section title="Badge · StatusBadge" description="Soft tinted pills with a 20% ring.">
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Badge>Default</Badge>
                  <Badge variant="secondary">Secondary</Badge>
                  <Badge variant="outline">Outline</Badge>
                  <Badge variant="brand">Brand</Badge>
                  <Badge variant="success">Success</Badge>
                  <Badge variant="warning">Warning</Badge>
                  <Badge variant="danger">Danger</Badge>
                  <Badge variant="info">Info</Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge status="posted" />
                  <StatusBadge status="pending" />
                  <StatusBadge status="failed" />
                  <StatusBadge status="refunded" />
                  <StatusBadge status="draft" />
                </div>
              </div>
            </Section>
            <Section title="Alert · Banner" description="Inline notices and full-width page banners.">
              <div className="space-y-3">
                <Alert variant="warning">
                  <TriangleAlert />
                  <AlertTitle>3 payments awaiting approval</AlertTitle>
                  <AlertDescription>Release before 5pm ET for same-day ACH.</AlertDescription>
                </Alert>
                <Alert variant="danger">
                  <AlertDescription>Wire to Litware Leasing was returned by the receiving bank.</AlertDescription>
                </Alert>
                <Alert variant="info">
                  <Info />
                  <AlertDescription>Statements for September are ready.</AlertDescription>
                </Alert>
                <Banner className="rounded-md">Demo mode — mock sign-in and sample data</Banner>
              </div>
            </Section>
            <Section title="Avatar · Progress · Skeleton" description="Identity, progress and loading states.">
              <div className="space-y-4">
                <div className="flex gap-2">
                  {["AA", "JA", "SO", "RV"].map((i) => (
                    <Avatar key={i}>
                      <AvatarFallback className="bg-brand-soft text-xs font-semibold text-gain">{i}</AvatarFallback>
                    </Avatar>
                  ))}
                </div>
                <Progress value={62} />
                <div className="flex items-center gap-3">
                  <Skeleton className="size-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-2/3" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>
            </Section>
          </div>
        </TabsContent>

        <TabsContent value="forms" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Section title="Inputs" description="Currency, text, select, toggles.">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="amount">Amount</Label>
                  <CurrencyInput id="amount" value={amount} onValueChange={setAmount} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="ref">Reference</Label>
                  <Input id="ref" placeholder="pay_0042" className="font-mono" />
                </div>
                <ToggleGroup type="single" defaultValue="14d" variant="outline">
                  <ToggleGroupItem value="7d">7d</ToggleGroupItem>
                  <ToggleGroupItem value="14d">14d</ToggleGroupItem>
                  <ToggleGroupItem value="30d">30d</ToggleGroupItem>
                  <ToggleGroupItem value="qtd">QTD</ToggleGroupItem>
                </ToggleGroup>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <Label htmlFor="dual">Require dual approval over $10k</Label>
                  <Switch id="dual" defaultChecked />
                </div>
                <Label className="flex items-center gap-2 font-normal">
                  <Checkbox defaultChecked /> Email me when a payment fails
                </Label>
              </div>
            </Section>
            <Section title="Overlays" description="Dialog, sheet, menu, popover, tooltip, toast.">
              <div className="flex flex-wrap gap-2">
                <SendPaymentDialog />
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline">Payment details</Button>
                  </SheetTrigger>
                  <SheetContent>
                    <SheetHeader>
                      <SheetTitle>pay_0042</SheetTitle>
                      <SheetDescription>Contoso Ltd · Quarterly retainer</SheetDescription>
                    </SheetHeader>
                    <div className="space-y-4 px-4">
                      <Amount value={42_000} size="xl" signed tone="auto" />
                      <Separator />
                      <StatusBadge status="posted" />
                    </div>
                  </SheetContent>
                </Sheet>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      Actions <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuLabel>pay_0042</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>Approve</DropdownMenuItem>
                    <DropdownMenuItem>Download receipt</DropdownMenuItem>
                    <DropdownMenuItem variant="destructive">Reject</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost">
                      <ShieldCheck /> Who can approve?
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="text-sm">
                    Approvers and Admins can release payments. Operators can only draft.
                  </PopoverContent>
                </Popover>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="secondary" onClick={() => toast("Exported 248 entries to CSV")}>
                      Export
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Download the last 30 days as CSV</TooltipContent>
                </Tooltip>
              </div>
            </Section>
          </div>
        </TabsContent>

        <TabsContent value="tokens" className="space-y-4">
          <Section title="Color tokens" description="Defined in src/app/globals.css; see DESIGN.md.">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {SWATCHES.map((s) => (
                <div key={s.token} className="space-y-1.5">
                  <div className={`h-14 rounded-lg border ${s.className}`} />
                  <p className="text-sm font-medium">{s.name}</p>
                  <p className="font-mono text-xs text-muted-foreground">{s.token}</p>
                </div>
              ))}
            </div>
          </Section>
          <div className="grid gap-4 lg:grid-cols-2">
            <Section title="Inverse surface" description="bg-ink-glow + .dark, used on the sign-in hero.">
              <div className="dark flex h-40 flex-col justify-between rounded-xl bg-ink-glow p-5 text-ink-foreground">
                <LogoMark />
                <div>
                  <p className="text-lg font-semibold tracking-tight">Every payment, accounted for.</p>
                  <p className="text-sm text-muted-foreground">Muted text resolves to the dark palette.</p>
                </div>
              </div>
            </Section>
            <Section title="Type" description="Geist Sans for UI, Geist Mono for IDs; tabular figures for money.">
              <div className="space-y-2">
                <p className="text-2xl font-semibold tracking-tight">Welcome back, Avery</p>
                <p className="text-sm text-muted-foreground">Here&apos;s what moved through the ledger.</p>
                <p className="font-mono text-xs">pay_0042 · 00000000-0000-0000-0000-000000000000</p>
                <p className="tabular text-xl font-semibold">$1,111,111.11 / $8,888,888.88</p>
              </div>
            </Section>
          </div>
        </TabsContent>
      </Tabs>
      <Toaster position="bottom-right" />
    </TooltipProvider>
  );
}
