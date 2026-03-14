---
name: ui
description: UI patterns, page structure, component conventions, and design decisions for DebtFlow Pro. Read this skill before building any page, component, table, form, modal, chart, or layout element. Also read this when deciding which shadcn/ui component to use, how to handle loading/empty states, or how to structure a two-panel debtor detail view.
---

# UI — DebtFlow Pro

This skill defines how every screen in the app should look and behave. Read the section relevant to what you are building, then implement it consistently with the rest of the app.

---

## Design Principles

- **Data density over decoration.** This is a tool for collectors who stare at it all day. Information should be easy to scan, not impressive to look at.
- **Progressive disclosure.** Show the summary in the list. Show the detail in the detail view. Don't cram everything into one row.
- **Always show something.** Every data-dependent view has three states: loading (skeleton), empty (helpful message + CTA), and populated. Never show a blank white screen.
- **Mobile matters for the portal only.** The lender dashboard is desktop-first. The `/portal` page must work well on a phone — large tap targets, readable text, no horizontal scroll.

---

## Layout Shell

### Dashboard layout structure

The `(dashboard)/layout.tsx` is a horizontal split: fixed sidebar on the left, scrollable content area on the right.

```tsx
// app/(dashboard)/layout.tsx
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'
import { Navbar } from '@/components/layout/Navbar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
```

### Sidebar nav items (in order)
```
Overview     → /dashboard
Debtors      → /debtors
Campaigns    → /campaigns
Payments     → /payments
Analytics    → /analytics
```

---

## Page Structure

Every page follows this exact three-part structure. Do not invent variations.

```tsx
export default function SomePage() {
  return (
    <div className="space-y-6">

      {/* 1. Page header — always present */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Page Title</h1>
          <p className="text-sm text-gray-500 mt-1">Brief description of this section</p>
        </div>
        {/* Primary action button goes here if applicable */}
        <Button>Add Debtor</Button>
      </div>

      {/* 2. Stats row — only on Dashboard and Analytics */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total Outstanding" value="$284,500" sub="+$12k this month" trend="up" />
        ...
      </div>

      {/* 3. Main content area */}
      <Card>
        <CardContent className="p-0">
          {/* Table, list, or chart goes here */}
        </CardContent>
      </Card>

    </div>
  )
}
```

---

## Reusable Components

### StatCard
```tsx
function StatCard({ label, value, sub, trend }: {
  label: string
  value: string
  sub?: string
  trend?: 'up' | 'down' | 'neutral'
}) {
  const trendColor = trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-500'
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
        {sub && <p className={`text-sm mt-1 ${trendColor}`}>{sub}</p>}
      </CardContent>
    </Card>
  )
}
```

### StatusBadge
Use this on every debtor row and detail page. Do not use ad-hoc colors — use this component.

```tsx
// components/debtors/StatusBadge.tsx
const STATUS_CONFIG = {
  current:         { label: 'Current',          cls: 'bg-gray-100 text-gray-700' },
  overdue_30:      { label: '30+ Days',          cls: 'bg-yellow-100 text-yellow-800' },
  overdue_60:      { label: '60+ Days',          cls: 'bg-orange-100 text-orange-800' },
  overdue_90:      { label: '90+ Days',          cls: 'bg-red-100 text-red-800' },
  in_payment_plan: { label: 'Payment Plan',      cls: 'bg-blue-100 text-blue-800' },
  settled:         { label: 'Settled',           cls: 'bg-green-100 text-green-800' },
  written_off:     { label: 'Written Off',       cls: 'bg-gray-200 text-gray-600' },
} as const

export function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]
    ?? { label: status, cls: 'bg-gray-100 text-gray-600' }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.cls}`}>
      {config.label}
    </span>
  )
}
```

### Loading skeleton
Use shadcn's Skeleton for every loading state. Match the shape to the content being loaded.

```tsx
// Table loading
{loading && (
  <div className="space-y-3 p-4">
    {Array.from({ length: 8 }).map((_, i) => (
      <Skeleton key={i} className="h-12 w-full rounded" />
    ))}
  </div>
)}
```

### Empty state
Every list that might have no items needs this. The CTA should match the action the user needs to take.

```tsx
{!loading && items.length === 0 && (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="text-5xl mb-4">{icon}</div>
    <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
    <p className="text-sm text-gray-500 mt-1 mb-4 max-w-xs">{description}</p>
    <Button onClick={onAction}>{actionLabel}</Button>
  </div>
)}
```

---

## Debtor List Page (`/debtors`)

The list view has three parts: filter bar, table, and pagination.

### Filter bar
Filters are query params, not client state — changing a filter navigates to a new URL. This makes filters shareable and preserves state on refresh.

```
Filters: All | Current | 30+ Days | 60+ Days | 90+ Days | Payment Plan | Settled
Search: text input → ilike on full_name
```

### Table columns
```
Debtor name + reference number (stacked)
Outstanding amount (right-aligned, bold)
Days overdue
Risk score badge
Status badge
Last contact date
→ View button (navigates to /debtors/[id])
```

Make the entire row clickable (`cursor-pointer`), not just the button.

---

## Debtor Detail Page (`/debtors/[id]`)

The detail page has two zones: a header with summary stats, and a tabbed content area.

### Header (always visible)
```
Full name (large)
Reference number (muted)
─── three stat chips: Total Owed | Outstanding | Days Overdue
─── Status badge + Risk score badge (side by side)
─── Actions: [Create Payment Plan] [Log Contact] [Re-analyze]
```

### Tabs
```
Overview         → AI insight card + account details + contact info
Payment History  → table of past payments + "Log Payment" button
Communications   → timeline of outreach attempts + "Log Contact" button
Payment Plan     → installment tracker (progress bar + table of installments)
```

### Installment tracker (Payment Plan tab)
Show a progress bar at the top: `{paid} of {total} installments paid`. Below it, a table of all installments with columns: Due Date | Amount | Status. Paid rows show a green checkmark. Overdue rows show a red warning.

---

## Campaign Pages

### Campaign list (`/campaigns`)
Show campaigns as cards in a grid (not a table). Each card shows: name, channel badge, target segment, status badge, and three metrics (Sent / Responded / Response Rate).

### Campaign form (Sheet/Drawer)
Open a `<Sheet>` from the right when creating a campaign. Fields:
1. Campaign name
2. Target segment (dropdown)
3. Channel (SMS / Email)
4. Message template (textarea with variable hints: `{{debtor_name}}`, `{{amount}}`, `{{reference}}`)
5. Send now or schedule (date picker)

After submit: close the sheet, refresh the list, show a toast.

---

## Analytics Page (`/analytics`)

### Recovery rate chart
Line chart using Recharts. X-axis: last 30 days. Y-axis: recovery rate %. Use a smooth monotone line in indigo.

```tsx
<ResponsiveContainer width="100%" height={240}>
  <LineChart data={data}>
    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
    <YAxis tick={{ fontSize: 12 }} unit="%" domain={[0, 100]} />
    <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
    <Line type="monotone" dataKey="rate" stroke="#6366f1" strokeWidth={2} dot={false} />
  </LineChart>
</ResponsiveContainer>
```

### Status breakdown donut chart
```tsx
const COLORS = {
  current: '#9ca3af', overdue_30: '#fbbf24', overdue_60: '#f97316',
  overdue_90: '#ef4444', in_payment_plan: '#3b82f6', settled: '#22c55e',
}

<PieChart width={280} height={200}>
  <Pie data={statusData} cx={140} cy={100} innerRadius={55} outerRadius={80} dataKey="value" paddingAngle={2}>
    {statusData.map(entry => <Cell key={entry.name} fill={COLORS[entry.name as keyof typeof COLORS]} />)}
  </Pie>
  <Tooltip formatter={(v: number) => `${v} debtors`} />
  <Legend />
</PieChart>
```

---

## Portal Page (`/portal`) — Public, mobile-first

The portal has two views: lookup form → account view. There is no login.

### Lookup form
Centered card, full-width on mobile, 400px max on desktop.
- Email input
- Reference number input (format hint: "e.g. REF-APX-0001")
- Submit button → queries Supabase, shows account view or error

### Account view
Once found, show:
- Debtor name (greeting: "Hello, {first name}")
- Outstanding balance (very large text, prominent)
- Status badge
- If a payment plan exists: show installments paid vs total
- "Make a Payment" button → opens an amount input → on confirm, inserts into `payments` table and reduces `outstanding_amount`
- Payment confirmation screen with a checkmark

Keep the design clean and reassuring. Debtors using this are often stressed — avoid alarming colors for the balance.

---

## Formatting Utilities (`lib/utils.ts`)

Add these helpers and use them everywhere. Never format currency or dates inline.

```ts
export const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

export const formatDate = (d: string | Date) =>
  new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(d))

export const formatRelativeDate = (d: string | Date) => {
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return `${days} days ago`
}
```