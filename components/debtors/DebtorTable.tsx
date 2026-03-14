'use client'

import { useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { StatusBadge } from '@/components/debtors/StatusBadge'
import { RiskScoreBadge } from '@/components/debtors/RiskScoreBadge'
import type { Tables } from '@/lib/types'

export type DebtorListItem = Pick<
  Tables<'debtors'>,
  'id' | 'full_name' | 'email' | 'reference_number' | 'outstanding_amount' | 'days_overdue' | 'status' | 'risk_score' | 'risk_label'
> & {
  last_contact_at: string | null
}

export function DebtorTable({ debtors }: { debtors: DebtorListItem[] }) {
  const router = useRouter()
  if (debtors.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="text-4xl mb-3">No debtors</div>
        <p className="text-sm text-gray-500">Try adjusting your filters or add new debtors.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Debtor</TableHead>
            <TableHead className="text-right hidden sm:table-cell">Outstanding</TableHead>
            <TableHead className="hidden md:table-cell">Days Overdue</TableHead>
            <TableHead className="hidden lg:table-cell">Risk</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden lg:table-cell">Last Contact</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {debtors.map((debtor) => (
            <TableRow
              key={debtor.id}
              className="cursor-pointer hover:bg-blue-50/50 transition-colors"
              onClick={() => router.push(`/debtors/${debtor.id}`)}
            >
              <TableCell>
                <div className="font-medium text-gray-900">{debtor.full_name}</div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                  <span>{debtor.reference_number}</span>
                  {debtor.email && (
                    <>
                      <span className="w-0.5 h-0.5 rounded-full bg-gray-300" />
                      <span className="truncate">{debtor.email}</span>
                    </>
                  )}
                </div>
                <div className="text-sm font-semibold text-gray-900 mt-1 sm:hidden">
                  {formatCurrency(Number(debtor.outstanding_amount))}
                </div>
              </TableCell>
              <TableCell className="text-right font-semibold hidden sm:table-cell">
                {formatCurrency(Number(debtor.outstanding_amount))}
              </TableCell>
              <TableCell className="hidden md:table-cell">{debtor.days_overdue}</TableCell>
              <TableCell className="hidden lg:table-cell">
                {debtor.risk_label && debtor.risk_score !== null ? (
                  <RiskScoreBadge score={debtor.risk_score} label={debtor.risk_label} />
                ) : (
                  <span className="text-xs text-gray-400">Not scored</span>
                )}
              </TableCell>
              <TableCell>
                <StatusBadge status={debtor.status} />
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                <span className="text-xs text-gray-500">
                  {debtor.last_contact_at ? new Date(debtor.last_contact_at).toLocaleDateString() : 'No contact yet'}
                </span>
              </TableCell>
              <TableCell>
                <span className="text-sm font-medium text-blue-600 hover:text-blue-700">View</span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
