export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'STAFF' | 'MHO_ADMIN' | 'MHO_HEAD' | 'LGU_HR'

export type LeaveType =
  | 'Vacation Leave'
  | 'Sick Leave'
  | 'Emergency Leave'
  | 'Maternity Leave'
  | 'Paternity Leave'
  | 'Special Privilege Leave'
  | 'Other'

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
          position?: string | null
          vacation_credits?: number
          sick_credits?: number
          emergency_credits?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
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
          p_user_id: string
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
          p_user_id: string
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
          p_user_id: string
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
          p_admin_id: string
          p_remarks?: string | null
        }
        Returns: Database['public']['Tables']['leave_applications']['Row']
      }
    }
    Enums: {
      user_role: UserRole
      leave_type: LeaveType
      leave_status: LeaveStatus
    }
  }
}
