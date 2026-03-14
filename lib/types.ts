export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]
export type AiAnalysisSource = 'openai' | 'deterministic'

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          slug: string
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          created_at?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          id: string
          org_id: string
          email: string
          full_name: string | null
          role: 'admin' | 'collector' | 'viewer'
          created_at: string | null
        }
        Insert: {
          id: string
          org_id: string
          email: string
          full_name?: string | null
          role?: 'admin' | 'collector' | 'viewer'
          created_at?: string | null
        }
        Update: {
          id?: string
          org_id?: string
          email?: string
          full_name?: string | null
          role?: 'admin' | 'collector' | 'viewer'
          created_at?: string | null
        }
        Relationships: []
      }
      debtors: {
        Row: {
          id: string
          org_id: string
          full_name: string
          email: string | null
          phone: string | null
          reference_number: string
          total_owed: number
          outstanding_amount: number
          days_overdue: number
          status:
            | 'current'
            | 'overdue_30'
            | 'overdue_60'
            | 'overdue_90'
            | 'in_payment_plan'
            | 'settled'
            | 'written_off'
          risk_score: number | null
          risk_label: 'low' | 'medium' | 'high' | 'critical' | null
          recommended_action: string | null
          best_contact_channel: 'sms' | 'email' | 'call' | null
          ai_summary: string | null
          ai_source: AiAnalysisSource
          ai_model: string | null
          contact_attempts: number
          failed_payments: number
          ai_analyzed_at: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          org_id: string
          full_name: string
          email?: string | null
          phone?: string | null
          reference_number: string
          total_owed?: number
          outstanding_amount?: number
          days_overdue?: number
          status?:
            | 'current'
            | 'overdue_30'
            | 'overdue_60'
            | 'overdue_90'
            | 'in_payment_plan'
            | 'settled'
            | 'written_off'
          risk_score?: number | null
          risk_label?: 'low' | 'medium' | 'high' | 'critical' | null
          recommended_action?: string | null
          best_contact_channel?: 'sms' | 'email' | 'call' | null
          ai_summary?: string | null
          ai_source?: AiAnalysisSource
          ai_model?: string | null
          contact_attempts?: number
          failed_payments?: number
          ai_analyzed_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          org_id?: string
          full_name?: string
          email?: string | null
          phone?: string | null
          reference_number?: string
          total_owed?: number
          outstanding_amount?: number
          days_overdue?: number
          status?:
            | 'current'
            | 'overdue_30'
            | 'overdue_60'
            | 'overdue_90'
            | 'in_payment_plan'
            | 'settled'
            | 'written_off'
          risk_score?: number | null
          risk_label?: 'low' | 'medium' | 'high' | 'critical' | null
          recommended_action?: string | null
          best_contact_channel?: 'sms' | 'email' | 'call' | null
          ai_summary?: string | null
          ai_source?: AiAnalysisSource
          ai_model?: string | null
          contact_attempts?: number
          failed_payments?: number
          ai_analyzed_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      accounts: {
        Row: {
          id: string
          debtor_id: string
          org_id: string
          loan_type: string
          original_amount: number
          outstanding_amount: number
          opened_at: string | null
          default_date: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          debtor_id: string
          org_id: string
          loan_type: string
          original_amount: number
          outstanding_amount: number
          opened_at?: string | null
          default_date?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          debtor_id?: string
          org_id?: string
          loan_type?: string
          original_amount?: number
          outstanding_amount?: number
          opened_at?: string | null
          default_date?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          id: string
          debtor_id: string
          org_id: string
          amount: number
          payment_date: string
          method: 'bank_transfer' | 'card' | 'cash' | 'cheque' | 'portal'
          status: 'pending' | 'completed' | 'failed'
          notes: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          debtor_id: string
          org_id: string
          amount: number
          payment_date?: string
          method?: 'bank_transfer' | 'card' | 'cash' | 'cheque' | 'portal'
          status?: 'pending' | 'completed' | 'failed'
          notes?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          debtor_id?: string
          org_id?: string
          amount?: number
          payment_date?: string
          method?: 'bank_transfer' | 'card' | 'cash' | 'cheque' | 'portal'
          status?: 'pending' | 'completed' | 'failed'
          notes?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      payment_plans: {
        Row: {
          id: string
          debtor_id: string
          org_id: string
          total_amount: number
          installment_amount: number
          frequency: 'weekly' | 'monthly'
          start_date: string
          installments_total: number
          installments_paid: number
          status: 'active' | 'completed' | 'defaulted' | 'cancelled'
          created_at: string | null
        }
        Insert: {
          id?: string
          debtor_id: string
          org_id: string
          total_amount: number
          installment_amount: number
          frequency: 'weekly' | 'monthly'
          start_date: string
          installments_total: number
          installments_paid?: number
          status?: 'active' | 'completed' | 'defaulted' | 'cancelled'
          created_at?: string | null
        }
        Update: {
          id?: string
          debtor_id?: string
          org_id?: string
          total_amount?: number
          installment_amount?: number
          frequency?: 'weekly' | 'monthly'
          start_date?: string
          installments_total?: number
          installments_paid?: number
          status?: 'active' | 'completed' | 'defaulted' | 'cancelled'
          created_at?: string | null
        }
        Relationships: []
      }
      payment_installments: {
        Row: {
          id: string
          plan_id: string
          due_date: string
          amount: number
          status: 'upcoming' | 'paid' | 'overdue' | 'skipped'
          paid_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          plan_id: string
          due_date: string
          amount: number
          status?: 'upcoming' | 'paid' | 'overdue' | 'skipped'
          paid_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          plan_id?: string
          due_date?: string
          amount?: number
          status?: 'upcoming' | 'paid' | 'overdue' | 'skipped'
          paid_at?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      campaigns: {
        Row: {
          id: string
          org_id: string
          name: string
          status: 'draft' | 'active' | 'completed' | 'paused'
          target_segment: 'all' | 'overdue_30' | 'overdue_60' | 'overdue_90' | 'in_payment_plan'
          channel: 'sms' | 'email' | 'call'
          message_template: string
          scheduled_at: string | null
          sent_count: number
          response_count: number
          created_at: string | null
        }
        Insert: {
          id?: string
          org_id: string
          name: string
          status?: 'draft' | 'active' | 'completed' | 'paused'
          target_segment: 'all' | 'overdue_30' | 'overdue_60' | 'overdue_90' | 'in_payment_plan'
          channel: 'sms' | 'email' | 'call'
          message_template: string
          scheduled_at?: string | null
          sent_count?: number
          response_count?: number
          created_at?: string | null
        }
        Update: {
          id?: string
          org_id?: string
          name?: string
          status?: 'draft' | 'active' | 'completed' | 'paused'
          target_segment?: 'all' | 'overdue_30' | 'overdue_60' | 'overdue_90' | 'in_payment_plan'
          channel?: 'sms' | 'email' | 'call'
          message_template?: string
          scheduled_at?: string | null
          sent_count?: number
          response_count?: number
          created_at?: string | null
        }
        Relationships: []
      }
      campaign_debtors: {
        Row: {
          id: string
          campaign_id: string
          debtor_id: string
          status: 'sent' | 'delivered' | 'responded' | 'failed'
          sent_at: string | null
          responded_at: string | null
        }
        Insert: {
          id?: string
          campaign_id: string
          debtor_id: string
          status?: 'sent' | 'delivered' | 'responded' | 'failed'
          sent_at?: string | null
          responded_at?: string | null
        }
        Update: {
          id?: string
          campaign_id?: string
          debtor_id?: string
          status?: 'sent' | 'delivered' | 'responded' | 'failed'
          sent_at?: string | null
          responded_at?: string | null
        }
        Relationships: []
      }
      communications: {
        Row: {
          id: string
          debtor_id: string
          org_id: string
          campaign_id: string | null
          channel: 'sms' | 'email' | 'call' | 'portal'
          direction: 'outbound' | 'inbound'
          status: 'sent' | 'delivered' | 'failed' | 'responded'
          message: string | null
          sent_at: string | null
        }
        Insert: {
          id?: string
          debtor_id: string
          org_id: string
          campaign_id?: string | null
          channel: 'sms' | 'email' | 'call' | 'portal'
          direction?: 'outbound' | 'inbound'
          status?: 'sent' | 'delivered' | 'failed' | 'responded'
          message?: string | null
          sent_at?: string | null
        }
        Update: {
          id?: string
          debtor_id?: string
          org_id?: string
          campaign_id?: string | null
          channel?: 'sms' | 'email' | 'call' | 'portal'
          direction?: 'outbound' | 'inbound'
          status?: 'sent' | 'delivered' | 'failed' | 'responded'
          message?: string | null
          sent_at?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          id: string
          org_id: string
          user_id: string | null
          action: string
          entity_type: string
          entity_id: string | null
          metadata: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          org_id: string
          user_id?: string | null
          action: string
          entity_type: string
          entity_id?: string | null
          metadata?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          org_id?: string
          user_id?: string | null
          action?: string
          entity_type?: string
          entity_id?: string | null
          metadata?: Json | null
          created_at?: string | null
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type TableInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type TableUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

export interface PortalLookupRequest {
  email: string
  reference_number: string
}

export interface PortalAccountSummary {
  debtor: Pick<
    Tables<'debtors'>,
    'id' | 'org_id' | 'full_name' | 'email' | 'reference_number' | 'outstanding_amount' | 'status'
  >
  plan:
    | (Pick<Tables<'payment_plans'>, 'id' | 'installments_paid' | 'installments_total' | 'status'> & {
        installments: Array<Pick<Tables<'payment_installments'>, 'id' | 'due_date' | 'amount' | 'status' | 'paid_at'>>
      })
    | null
  payments: Array<
    Pick<Tables<'payments'>, 'id' | 'amount' | 'payment_date' | 'method' | 'status' | 'created_at'>
  >
}

export interface PortalPaymentRequest extends PortalLookupRequest {
  amount: number
}

export interface PortalPaymentResponse {
  payment_id: string
  outstanding_amount: number
  status: Tables<'debtors'>['status']
  plan: PortalAccountSummary['plan']
}

export interface CampaignRespondRequest {
  campaign_id: string
  debtor_id: string
  communication_id?: string
  notes?: string
}

export interface ScoreRequest {
  debtor_id: string
}

export interface ScoreResponse {
  score: number
  risk_label: Tables<'debtors'>['risk_label']
  recommended_action: string
  best_contact_channel: NonNullable<Tables<'debtors'>['best_contact_channel']>
  best_contact_time: string
  ai_summary: string | null
  ai_source: AiAnalysisSource
  ai_model: string | null
}

export interface CampaignRespondResponse {
  campaign_id: string
  debtor_id: string
  response_count: number
}

export interface PaymentPlanCreateRequest {
  debtor_id: string
  total_amount: number
  installment_amount: number
  frequency: Tables<'payment_plans'>['frequency']
  start_date: string
  installments_total: number
}
