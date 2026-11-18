export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'STAFF' | 'MHO_ADMIN' | 'MHO_HEAD'
export type UserStatus = 'pending' | 'approved' | 'rejected'

export type LeaveType = string

export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string
          email: string
          role: UserRole
          status: UserStatus
          reviewed_by?: string | null
          reviewed_at?: string | null
          avatar_url?: string | null
          position: string | null
          vacation_credits: number
          sick_credits: number
          emergency_credits: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          full_name: string
          email: string
          role?: UserRole
          status?: UserStatus
          reviewed_by?: string | null
          reviewed_at?: string | null
          avatar_url?: string | null
          position?: string | null
          vacation_credits?: number
          sick_credits?: number
          emergency_credits?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          email?: string
          role?: UserRole
          status?: UserStatus
          reviewed_by?: string | null
          reviewed_at?: string | null
          avatar_url?: string | null
          position?: string | null
          vacation_credits?: number
          sick_credits?: number
          emergency_credits?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      leave_applications: {
        Row: {
          id: number
          user_id: string | null
          employee_name: string | null
          leave_type: LeaveType
          other_leave_type: string | null
          start_date: string
          end_date: string
          total_days: number
          reason: string | null
          status: LeaveStatus
          dss_recommendation: string | null
          created_by_admin_id: string | null
          processed_by_admin_id: string | null
          admin_remarks: string | null
          processed_at: string | null
          created_at: string
        }
        Insert: {
          id?: never
          user_id?: string | null
          employee_name?: string | null
          leave_type: LeaveType
          other_leave_type?: string | null
          start_date: string
          end_date: string
          total_days: number
          reason?: string | null
          status?: LeaveStatus
          dss_recommendation?: string | null
          created_by_admin_id?: string | null
          processed_by_admin_id?: string | null
          admin_remarks?: string | null
          processed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: never
          user_id?: string | null
          employee_name?: string | null
          leave_type?: LeaveType
          other_leave_type?: string | null
          start_date?: string
          end_date?: string
          total_days?: number
          reason?: string | null
          status?: LeaveStatus
          dss_recommendation?: string | null
          created_by_admin_id?: string | null
          processed_by_admin_id?: string | null
          admin_remarks?: string | null
          processed_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'leave_applications_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'leave_applications_created_by_admin_id_fkey'
            columns: ['created_by_admin_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'leave_applications_processed_by_admin_id_fkey'
            columns: ['processed_by_admin_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      leave_balances: {
        Row: {
          id: number
          user_id: string
          vacation_credits: number
          sick_credits: number
          emergency_credits: number
          updated_at: string
        }
        Insert: {
          id?: never
          user_id: string
          vacation_credits?: number
          sick_credits?: number
          emergency_credits?: number
          updated_at?: string
        }
        Update: {
          id?: never
          user_id?: string
          vacation_credits?: number
          sick_credits?: number
          emergency_credits?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'leave_balances_user_id_fkey'
            columns: ['user_id']
            isOneToOne: true
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      audit_logs: {
        Row: {
          id: number
          user_id: string | null
          action_type: string
          description: string
          ip_address: string | null
          created_at: string
        }
        Insert: {
          id?: never
          user_id?: string | null
          action_type: string
          description: string
          ip_address?: string | null
          created_at?: string
        }
        Update: {
          id?: never
          user_id?: string | null
          action_type?: string
          description?: string
          ip_address?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'audit_logs_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      leave_types: {
        Row: {
          code: string
          name: string
          legal_basis: string | null
          charged_to: 'VL' | 'SL' | 'NONE'
          requires_advance_filing: boolean
          min_advance_days: number
          sort_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          code: string
          name: string
          legal_basis?: string | null
          charged_to?: 'VL' | 'SL' | 'NONE'
          requires_advance_filing?: boolean
          min_advance_days?: number
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          code?: string
          name?: string
          legal_basis?: string | null
          charged_to?: 'VL' | 'SL' | 'NONE'
          requires_advance_filing?: boolean
          min_advance_days?: number
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          key: string
          value: string
          description: string | null
          updated_at: string
        }
        Insert: {
          key: string
          value: string
          description?: string | null
          updated_at?: string
        }
        Update: {
          key?: string
          value?: string
          description?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      count_weekdays: {
        Args: {
          p_start_date: string
          p_end_date: string
        }
        Returns: number
      }
      evaluate_leave_credits: {
        Args: {
          p_user_id: string | null
          p_leave_type: LeaveType
          p_days: number
        }
        Returns: {
          passed: boolean
          message: string
          available: number
        }[]
      }
      evaluate_schedule_conflict: {
        Args: {
          p_user_id: string | null
          p_start_date: string
          p_end_date: string
        }
        Returns: {
          passed: boolean
          warning: boolean
          message: string
        }[]
      }
      get_dss_recommendation: {
        Args: {
          p_user_id: string | null
          p_leave_type: LeaveType
          p_days: number
          p_start_date: string
          p_end_date: string
        }
        Returns: {
          recommendation: string
          reason: string
        }[]
      }
      approve_leave: {
        Args: {
          p_leave_id: number
          p_admin_id: string
          p_remarks?: string | null
        }
        Returns: Database['public']['Tables']['leave_applications']['Row']
      }
      reject_leave: {
        Args: {
          p_leave_id: number
          p_admin_id?: string | null
          p_remarks?: string | null
        }
        Returns: Database['public']['Tables']['leave_applications']['Row']
      }
      review_user: {
        Args: {
          p_user_id: string
          p_status: UserStatus
          p_role?: UserRole | null
        }
        Returns: Database['public']['Tables']['profiles']['Row']
      }
    }
    Enums: {
      user_role: UserRole
      user_status: UserStatus
      leave_status: LeaveStatus
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, 'public'>]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema['Tables'] & PublicSchema['Views'])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions['schema']]['Tables'] &
        Database[PublicTableNameOrOptions['schema']]['Views'])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions['schema']]['Tables'] &
      Database[PublicTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema['Tables'] &
        PublicSchema['Views'])
    ? (PublicSchema['Tables'] &
        PublicSchema['Views'])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema['Tables']
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema['Tables']
    ? PublicSchema['Tables'][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema['Tables']
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema['Tables']
    ? PublicSchema['Tables'][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema['Enums']
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions['schema']]['Enums'][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema['Enums']
    ? PublicSchema['Enums'][PublicEnumNameOrOptions]
    : never
