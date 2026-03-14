# Frontend Development Skill — DebtFlow Pro

This skill defines all frontend patterns, conventions, and best practices for building UI components, pages, and user interactions in DebtFlow Pro.

---

## Core Principles

1. **Server Components First** — Default to server components; only use `'use client'` when necessary
2. **TypeScript Everywhere** — All components, props, and state must be typed
3. **Progressive Enhancement** — Build for functionality first, enhance with interactivity
4. **Accessibility First** — Semantic HTML, ARIA labels, keyboard navigation
5. **Mobile-First Design** — Responsive layouts that work on all screen sizes

---

## Component Architecture

### Server vs Client Components

**Use Server Components (default)** when:
- Fetching data from Supabase
- Rendering static content
- No browser APIs needed
- No interactivity required

**Use Client Components (`'use client'`)** when:
- Using React hooks (`useState`, `useEffect`, `useRouter`)
- Handling user interactions (clicks, form inputs)
- Using browser APIs (localStorage, window, etc.)
- Real-time updates or subscriptions

**Pattern:**
```typescript
// Server Component (default)
import { createServerClient } from '@/lib/supabase/server'

export default async function Page() {
  const supabase = await createServerClient()
  const { data } = await supabase.from('debtors').select('*')
  return <div>{/* render data */}</div>
}

// Client Component (when needed)
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function InteractiveComponent() {
  const [state, setState] = useState('')
  const router = useRouter()
  // ... interactivity
}
```

### Component Structure

Every component file should follow this structure:

```typescript
// 1. Imports (grouped: React, Next.js, lib, components, types)
'use client' // only if needed

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { Tables } from '@/lib/types'

// 2. Type definitions (if component-specific)
interface ComponentProps {
  data: Tables<'debtors'>
  onAction?: () => void
}

// 3. Component implementation
export function ComponentName({ data, onAction }: ComponentProps) {
  // Hooks
  const router = useRouter()
  const [state, setState] = useState('')

  // Early returns for edge cases
  if (!data) return <EmptyState />

  // Main render
  return (
    <div>
      {/* JSX */}
    </div>
  )
}

// 4. Helper components (if small and component-specific)
function EmptyState() {
  return <div>No data</div>
}
```

---

## Styling with Tailwind CSS

### Design System

**Colors:**
- Primary text: `text-gray-900`
- Secondary text: `text-gray-500`
- Muted text: `text-gray-400`
- Borders: `border-gray-200`, `border-gray-100`
- Backgrounds: `bg-white`, `bg-gray-50`, `bg-gray-100`
- Hover states: `hover:bg-gray-100`

**Spacing:**
- Use Tailwind's spacing scale: `p-4`, `px-6`, `py-2`, `space-y-4`, `gap-4`
- Consistent padding: `px-6 py-4` for cards, `px-3 py-2` for buttons

**Typography:**
- Headings: `text-2xl font-semibold`, `text-lg font-semibold`
- Body: `text-sm`, `text-xs`
- Font weights: `font-medium`, `font-semibold`, `font-bold`

**Layout:**
- Grid: `grid grid-cols-1 md:grid-cols-3 gap-4`
- Flex: `flex items-center justify-between`
- Container: `max-w-7xl mx-auto px-4`

### Utility Classes

Use the `cn()` utility for conditional classes:

```typescript
import { cn } from '@/lib/cn'

<button className={cn(
  'px-4 py-2 rounded-md',
  isActive && 'bg-blue-500 text-white',
  !isActive && 'bg-gray-100 text-gray-700'
)}>
```

### Responsive Design

Always design mobile-first:

```typescript
// Mobile-first: base styles for mobile, then md: for desktop
<div className="flex flex-col md:flex-row gap-4">
  <div className="w-full md:w-1/2">...</div>
</div>

// Hide/show based on screen size
<aside className="hidden md:flex">...</aside>
```

---

## Data Fetching Patterns

### Server Components

```typescript
import { createServerClient } from '@/lib/supabase/server'

export default async function Page() {
  const supabase = await createServerClient()
  
  // Always destructure and handle errors
  const { data, error } = await supabase
    .from('debtors')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    // Handle error (redirect, show error page, etc.)
    return <ErrorState message={error.message} />
  }

  if (!data || data.length === 0) {
    return <EmptyState />
  }

  return <DataView data={data} />
}
```

### Client Components

```typescript
'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function ClientDataComponent() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()
      const { data, error } = await supabase.from('debtors').select('*')
      
      if (error) {
        setError(error.message)
      } else {
        setData(data)
      }
      setLoading(false)
    }
    
    fetchData()
  }, [])

  if (loading) return <Skeleton />
  if (error) return <ErrorState message={error} />
  if (!data || data.length === 0) return <EmptyState />
  
  return <DataView data={data} />
}
```

---

## State Management

### Local State with useState

For component-level state:

```typescript
'use client'
import { useState } from 'react'

export function FormComponent() {
  const [name, setName] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = async () => {
    // Validation
    if (!name.trim()) {
      setErrors({ name: 'Name is required' })
      return
    }

    // Submit logic
  }

  return (
    <form>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      {errors.name && <p className="text-red-500 text-xs">{errors.name}</p>}
    </form>
  )
}
```

### URL State with useRouter

For navigation and URL-based state:

```typescript
'use client'
import { useRouter, useSearchParams } from 'next/navigation'

export function FilterComponent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleFilter = (status: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('status', status)
    router.push(`/debtors?${params.toString()}`)
  }
}
```

---

## Form Handling

### Controlled Inputs

Always use controlled inputs with `useState`:

```typescript
'use client'
import { useState } from 'react'

export function PaymentForm() {
  const [amount, setAmount] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    setLoading(true)

    // Validation
    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrors({ amount: 'Please enter a valid amount' })
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: numAmount }),
      })

      const result = await response.json()
      if (result.error) {
        setErrors({ submit: result.error })
      } else {
        // Success: close modal, show toast, refresh data
        router.refresh()
      }
    } catch (err) {
      setErrors({ submit: 'Something went wrong' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label className="block text-sm font-medium mb-1">Amount</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full px-3 py-2 border rounded-md"
          disabled={loading}
        />
        {errors.amount && (
          <p className="text-red-500 text-xs mt-1">{errors.amount}</p>
        )}
      </div>
      {errors.submit && (
        <p className="text-red-500 text-xs mt-2">{errors.submit}</p>
      )}
      <button type="submit" disabled={loading}>
        {loading ? 'Processing...' : 'Submit'}
      </button>
    </form>
  )
}
```

### Form Validation Rules

- Validate client-side before submit
- Show inline error messages below each field
- Use clear, actionable error messages
- Disable submit button during loading
- Clear errors when user starts typing

---

## Loading and Empty States

### Three-State Pattern

Every data-driven component must handle three states:

1. **Loading** — Show skeleton or spinner
2. **Empty** — Show empty state with helpful message and CTA
3. **Data** — Render the actual content

```typescript
export function DataComponent({ data, loading }: Props) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="text-4xl mb-3">📭</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">No data found</h3>
        <p className="text-sm text-gray-500 mb-4">Try adjusting your filters or add new records.</p>
        <Button onClick={handleAdd}>Add New</Button>
      </div>
    )
  }

  return (
    <div>
      {data.map((item) => (
        <ItemCard key={item.id} item={item} />
      ))}
    </div>
  )
}
```

### Skeleton Components

Use shadcn/ui Skeleton component for loading states:

```typescript
import { Skeleton } from '@/components/ui/skeleton'

<Skeleton className="h-4 w-32" />
<Skeleton className="h-16 w-full" />
```

---

## Error Handling

### API Route Errors

Always return consistent error format:

```typescript
// app/api/example/route.ts
export async function POST(request: Request) {
  try {
    // ... logic
    return Response.json({ success: true }, { status: 200 })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Something went wrong' },
      { status: 500 }
    )
  }
}
```

### Client-Side Error Handling

```typescript
'use client'
import { useState } from 'react'

export function Component() {
  const [error, setError] = useState<string | null>(null)

  const handleAction = async () => {
    try {
      const response = await fetch('/api/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
      })

      const result = await response.json()
      if (result.error) {
        setError(result.error)
        return
      }

      // Success handling
    } catch (err) {
      setError('Network error. Please try again.')
    }
  }

  return (
    <div>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
          {error}
        </div>
      )}
      {/* Rest of component */}
    </div>
  )
}
```

### Error Boundaries

For critical errors, use Next.js error boundaries:

```typescript
// app/error.tsx
'use client'
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h2 className="text-2xl font-semibold mb-4">Something went wrong!</h2>
      <button onClick={reset} className="px-4 py-2 bg-blue-500 text-white rounded">
        Try again
      </button>
    </div>
  )
}
```

---

## Navigation and Routing

### Client-Side Navigation

```typescript
'use client'
import { useRouter } from 'next/navigation'

export function NavigationComponent() {
  const router = useRouter()

  const handleNavigate = (id: string) => {
    router.push(`/debtors/${id}`)
  }

  // For refresh after mutation
  router.refresh()
}
```

### Link Components

Use Next.js Link for internal navigation:

```typescript
import Link from 'next/link'

<Link href="/debtors" className="text-blue-600 hover:underline">
  View Debtors
</Link>
```

---

## Tables and Lists

### Table Pattern

```typescript
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export function DataTable({ items }: { items: Item[] }) {
  if (items.length === 0) {
    return <EmptyState />
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell>{item.name}</TableCell>
            <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
            <TableCell><StatusBadge status={item.status} /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
```

### Clickable Rows

```typescript
<TableRow
  className="cursor-pointer hover:bg-gray-50"
  onClick={() => router.push(`/debtors/${debtor.id}`)}
>
  {/* cells */}
</TableRow>
```

---

## Cards and Containers

### Card Pattern

```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
</Card>
```

### Stat Cards

```typescript
function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
        {sub && <p className="text-sm mt-1 text-gray-500">{sub}</p>}
      </CardContent>
    </Card>
  )
}
```

---

## Modals and Dialogs

### Using shadcn/ui Dialog

```typescript
'use client'
import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

export function ModalForm() {
  const [open, setOpen] = useState(false)

  const handleSuccess = () => {
    setOpen(false)
    // Show toast, refresh data
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Open Modal</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Form Title</DialogTitle>
        </DialogHeader>
        <FormComponent onSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  )
}
```

---

## Badges and Status Indicators

### Status Badge Pattern

```typescript
import { cn } from '@/lib/cn'

export function StatusBadge({ status }: { status: string }) {
  const variants = {
    current: 'bg-green-100 text-green-800',
    overdue_30: 'bg-yellow-100 text-yellow-800',
    overdue_60: 'bg-orange-100 text-orange-800',
    overdue_90: 'bg-red-100 text-red-800',
    settled: 'bg-blue-100 text-blue-800',
  }

  return (
    <span className={cn(
      'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
      variants[status as keyof typeof variants] || 'bg-gray-100 text-gray-800'
    )}>
      {status.replace('_', ' ')}
    </span>
  )
}
```

---

## Utility Functions

### Formatting

Use utilities from `lib/utils.ts`:

```typescript
import { formatCurrency, formatDate, formatRelativeDate } from '@/lib/utils'

formatCurrency(1234.56) // "$1,235"
formatDate('2024-01-15') // "Jan 15, 2024"
formatRelativeDate('2024-01-10') // "5 days ago"
```

---

## Accessibility

### Semantic HTML

- Use proper heading hierarchy (`h1` → `h2` → `h3`)
- Use `<button>` for actions, `<a>` for navigation
- Use `<label>` for form inputs
- Use ARIA attributes when needed

### Keyboard Navigation

- All interactive elements must be keyboard accessible
- Use `tabIndex` sparingly (prefer semantic HTML)
- Focus management in modals

### Screen Readers

- Provide `aria-label` for icon-only buttons
- Use `aria-describedby` for form field descriptions
- Announce dynamic content changes with `aria-live`

---

## Performance Best Practices

### Image Optimization

```typescript
import Image from 'next/image'

<Image
  src="/logo.png"
  alt="Logo"
  width={200}
  height={50}
  priority // for above-the-fold images
/>
```

### Code Splitting

- Use dynamic imports for heavy components:
```typescript
import dynamic from 'next/dynamic'

const HeavyChart = dynamic(() => import('@/components/HeavyChart'), {
  loading: () => <Skeleton />,
  ssr: false, // if client-only
})
```

### Memoization

Use `useMemo` and `useCallback` sparingly, only when profiling shows performance issues.

---

## Mobile Considerations

### Touch Targets

- Minimum 44x44px for interactive elements
- Adequate spacing between clickable items

### Viewport

- Portal page (`/portal`) is designed for mobile-first
- Use responsive breakpoints: `sm:`, `md:`, `lg:`, `xl:`

### Mobile Navigation

- Sidebar hidden on mobile (`hidden md:flex`)
- Consider bottom navigation for mobile if needed

---

## Testing Considerations

### Component Testing

- Test loading, empty, and data states
- Test error handling
- Test form validation
- Test accessibility (keyboard navigation, screen readers)

### Integration Testing

- Test data fetching flows
- Test form submissions
- Test navigation flows

---

## Common Patterns

### Search and Filter

```typescript
'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export function SearchFilter() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') || '')

  const handleSearch = (value: string) => {
    setQuery(value)
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set('q', value)
    } else {
      params.delete('q')
    }
    router.push(`/debtors?${params.toString()}`)
  }

  return (
    <input
      type="text"
      value={query}
      onChange={(e) => handleSearch(e.target.value)}
      placeholder="Search debtors..."
      className="w-full px-4 py-2 border rounded-md"
    />
  )
}
```

### Pagination

```typescript
export function Pagination({ page, totalPages }: { page: number; totalPages: number }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(newPage))
    router.push(`/debtors?${params.toString()}`)
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={() => handlePageChange(page - 1)}
        disabled={page === 1}
      >
        Previous
      </Button>
      <span className="text-sm text-gray-500">
        Page {page} of {totalPages}
      </span>
      <Button
        onClick={() => handlePageChange(page + 1)}
        disabled={page === totalPages}
      >
        Next
      </Button>
    </div>
  )
}
```

---

## Checklist for New Components

- [ ] Proper TypeScript types for all props
- [ ] Handles loading, empty, and data states
- [ ] Error handling implemented
- [ ] Responsive design (mobile-first)
- [ ] Accessibility (semantic HTML, keyboard navigation)
- [ ] Uses utility functions for formatting
- [ ] Follows naming conventions
- [ ] Server component by default (only `'use client'` if needed)
- [ ] Proper error messages for users
- [ ] Loading states during async operations

---

## References

- [Next.js App Router Docs](https://nextjs.org/docs/app)
- [shadcn/ui Components](https://ui.shadcn.com)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [React Server Components](https://react.dev/blog/2023/03/22/react-labs-what-we-have-been-working-on-march-2023#react-server-components)
