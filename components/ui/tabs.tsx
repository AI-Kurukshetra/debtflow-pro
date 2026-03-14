'use client'

import * as React from 'react'
import { cn } from '@/lib/cn'

type TabsContextValue = {
  value: string
  setValue: (v: string) => void
}

const TabsContext = React.createContext<TabsContextValue | null>(null)

export function Tabs({
  defaultValue,
  value,
  onValueChange,
  className,
  children,
}: {
  defaultValue?: string
  value?: string
  onValueChange?: (v: string) => void
  className?: string
  children: React.ReactNode
}) {
  const [internal, setInternal] = React.useState(defaultValue ?? '')
  const current = value ?? internal
  const setValue = (v: string) => {
    if (onValueChange) onValueChange(v)
    if (value === undefined) setInternal(v)
  }
  return (
    <TabsContext.Provider value={{ value: current, setValue }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  )
}

export function TabsList({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('inline-flex gap-2 rounded-md bg-gray-100 p-1', className)} {...props} />
}

export function TabsTrigger({
  value,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }) {
  const ctx = React.useContext(TabsContext)
  if (!ctx) return null
  const active = ctx.value === value
  return (
    <button
      className={cn(
        'rounded-md px-3 py-1.5 text-sm font-medium',
        active ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600',
        className
      )}
      onClick={() => ctx.setValue(value)}
      {...props}
    />
  )
}

export function TabsContent({
  value,
  className,
  children,
}: {
  value: string
  className?: string
  children: React.ReactNode
}) {
  const ctx = React.useContext(TabsContext)
  if (!ctx || ctx.value !== value) return null
  return <div className={className}>{children}</div>
}
