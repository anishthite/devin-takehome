# Ledger design system

Ledger is a payment ledger for finance teams. The UI should feel like a calm,
precise instrument: mostly neutral zinc surfaces, one confident emerald accent,
and numbers that line up. Everything in this folder is a shadcn/ui component
(`new-york` style, Radix primitives) themed with the tokens below, plus a set
of fintech-specific components built on top of them.

- Tokens live in `src/app/globals.css` (`:root` + `.dark`), mapped into
  Tailwind v4 with `@theme inline`.
- Add new shadcn components with `npx shadcn@latest add <name>`;
  `components.json` points the `ui` alias at `@/ui-components`.

## Principles

1. **Neutral first, emerald on purpose.** Chrome is zinc. Emerald marks the
   brand (logo, focus ring) and money coming *in*. Don't use it for decoration.
2. **Money is typography.** Amounts always use `tabular` figures, are
   right-aligned in tables, and render cents at 62% size / 60% opacity so the
   whole-dollar figure reads first (`<Amount>`).
3. **Color carries meaning, never alone.** Gain/loss/warning colors are
   always paired with a sign (`+` / `−`), an icon, or a label.
4. **Outflow is not an error.** Negative amounts stay in the foreground color;
   only *failed* things use the loss red. `Amount tone="auto"` is reserved for
   inflows and deltas.
5. **Server-first.** Display components (Amount, StatCard, StatusBadge,
   DescriptionList, PageHeader, Banner, Logo…) have no hooks and render in
   React Server Components. Only interactive or chart components are
   `"use client"`.

## Color

| Token | Light | Use |
|---|---|---|
| `--background` | `#fafafa` zinc-50 | App canvas |
| `--card` / `--popover` | `#ffffff` | Surfaces |
| `--foreground` / `--primary` | `#18181b` zinc-900 | Text, primary buttons, active nav |
| `--muted-foreground` | `#71717a` zinc-500 | Secondary text, table heads |
| `--border` / `--input` | `#e4e4e7` / `#d4d4d8` | Hairlines, field borders |
| `--brand` | `#10b981` emerald-500 | Logo mark, chart inflow, icons |
| `--brand-strong` | `#059669` emerald-600 | `Button variant="brand"` (money-moving CTAs) |
| `--ring` | `#10b981` | Focus rings everywhere |
| `--ink` | `#09090b` zinc-950 | Inverse hero surfaces (`bg-ink-glow`) |
| `--gain` / `--gain-soft` | `#047857` / `#ecfdf5` | Inflows, posted, positive deltas |
| `--loss` / `--loss-soft` | `#be123c` / `#fff1f2` | Failed, rejected, negative deltas |
| `--warning` / `--warning-soft` | `#b45309` / `#fffbeb` | Pending, sample data, attention |
| `--warning-strong` | `#fbbf24` amber-400 | Full-width demo `Banner` |
| `--info` / `--info-soft` | `#0369a1` / `#f0f9ff` | Refunds, neutral notices |
| `--chart-1` / `--chart-2` | emerald-500 / zinc-300 | Inflow / outflow bars |

Soft tones are always used as `bg-*-soft text-* ring-1 ring-*/20` (badges,
alerts). `.dark` redefines every token; apply it to a subtree (e.g. the
sign-in hero) to get an inverse section without a global theme switch.

`bg-ink-glow` is the signature surface: ink with an emerald glow top-right and
a faint sky glow bottom-left. Use it for at most one hero element per screen
(sign-in panel, `BalanceCard variant="ink"`, `PaymentCard`).

## Type

- **Geist Sans** for all UI, **Geist Mono** for IDs, tenant/object IDs,
  payment references and rails (`ACH`, `RTP`).
- Page titles `text-2xl font-semibold tracking-tight`; card titles
  `font-semibold`; meta text `text-xs text-muted-foreground`.
- Table heads are `text-xs uppercase tracking-wide`.

## Shape & spacing

- `--radius: 0.75rem`. Buttons/inputs `rounded-md` (10px), cards
  `rounded-xl` (16px), pills `rounded-full`, role chips `rounded-md`.
- Cards are `border bg-card shadow-sm` with 20px (`p-5`) padding.
- Page content is `max-w-6xl`, `space-y-6`, grids use `gap-4`.
- Sidebar is 240px, header 64px.

## Components

### shadcn primitives (themed)

`alert` (+ `danger` `warning` `info` `success`), `avatar`, `badge`
(+ `brand` `success` `warning` `danger` `info`), `button` (+ `brand`, `xl`),
`card`, `chart`, `checkbox`, `dialog`, `dropdown-menu`, `input`, `label`,
`popover`, `progress`, `radio-group`, `select`, `separator`, `sheet`,
`skeleton`, `sonner`, `switch`, `table`, `tabs`, `textarea`, `toggle`,
`toggle-group`, `tooltip`.

### Ledger components

| Component | Notes |
|---|---|
| `Logo`, `LogoMark` | Emerald tile with three ledger lines + wordmark. |
| `Amount` | Intl currency formatting, `minor` (cents in), `signed`, `tone="auto"`, `masked`, `hideCents`, sizes `sm`→`display`. Uses a true minus sign. |
| `Delta` | % change chip; `invert` for spend-type metrics where down is good. |
| `StatCard` | KPI tile with icon `tone` (`ink` `gain` `loss` `warning` `info` `neutral`), optional `change` and `hint`. |
| `StatusBadge` | `posted` `pending` `failed` `refunded` `draft` with a status dot. |
| `FlowChart`, `FlowLegend` | Recharts inflow/outflow bars with an `Amount` tooltip. Client. |
| `Sparkline` | Tiny area trend, auto gain/loss color. Client. |
| `BalanceCard` | Big balance with hide toggle, delta, sparkline, actions. `variant="ink"` for hero. Client. |
| `TransactionList`, `TransactionRow`, `TransactionGroupLabel` | Feed-style payments list; failed amounts are struck through. |
| `PaymentCard` | Issued card art: `ink` `emerald` `graphite`, Visa/Mastercard, `frozen`. |
| `GoalProgress` | Reserve/budget targets with progress bar. |
| `CurrencyInput` | Sanitised decimal entry with symbol + code, `size="hero"` for payment forms. Client. |
| `PageHeader` | Title, description, actions row. |
| `DescriptionList`, `DescriptionItem` | Key/value metadata; `mono` for IDs. |
| `Banner` | Full-width strip (`warning` `brand` `ink`), e.g. demo mode. |

## Do / don't

- Do use `Button variant="brand"` only for actions that move money (pay,
  release, approve). Everything else is `default` (ink) or `outline`.
- Do pass minor units straight from the ledger with `minor` instead of
  dividing in the page.
- Don't hard-code `zinc-*` / `emerald-*` utilities in app code — use the
  semantic tokens so `.dark` subtrees and future themes keep working.
- Don't color outflows red; red means something went wrong.
