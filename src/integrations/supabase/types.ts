export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_broadcasts: {
        Row: {
          admin_id: string
          attachment_name: string | null
          attachment_url: string | null
          banner_url: string | null
          broadcast_type: string
          created_at: string
          id: string
          is_published: boolean | null
          media_type: string | null
          media_url: string | null
          message: string
          scheduled_for: string | null
          target_audience: string
          title: string
          video_link: string | null
        }
        Insert: {
          admin_id: string
          attachment_name?: string | null
          attachment_url?: string | null
          banner_url?: string | null
          broadcast_type?: string
          created_at?: string
          id?: string
          is_published?: boolean | null
          media_type?: string | null
          media_url?: string | null
          message: string
          scheduled_for?: string | null
          target_audience?: string
          title: string
          video_link?: string | null
        }
        Update: {
          admin_id?: string
          attachment_name?: string | null
          attachment_url?: string | null
          banner_url?: string | null
          broadcast_type?: string
          created_at?: string
          id?: string
          is_published?: boolean | null
          media_type?: string | null
          media_url?: string | null
          message?: string
          scheduled_for?: string | null
          target_audience?: string
          title?: string
          video_link?: string | null
        }
        Relationships: []
      }
      admin_permissions: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          permission: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          permission: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          permission?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_groups: {
        Row: {
          avatar_url: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string
          follower_user_id: string
          following_user_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_user_id: string
          following_user_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_user_id?: string
          following_user_id?: string
          id?: string
        }
        Relationships: []
      }
      friends: {
        Row: {
          created_at: string
          id: string
          recipient_id: string
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          recipient_id: string
          requester_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          recipient_id?: string
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "chat_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_messages: {
        Row: {
          content: string | null
          created_at: string
          group_id: string
          id: string
          media_url: string | null
          message_type: string
          sender_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          group_id: string
          id?: string
          media_url?: string | null
          message_type?: string
          sender_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          group_id?: string
          id?: string
          media_url?: string | null
          message_type?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "chat_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_admin_message: boolean | null
          is_read: boolean | null
          media_url: string | null
          message_type: string | null
          recipient_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_admin_message?: boolean | null
          is_read?: boolean | null
          media_url?: string | null
          message_type?: string | null
          recipient_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_admin_message?: boolean | null
          is_read?: boolean | null
          media_url?: string | null
          message_type?: string | null
          recipient_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean | null
          message: string | null
          related_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string | null
          related_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string | null
          related_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      organizer_applications: {
        Row: {
          aadhaar_number: string | null
          age: number | null
          created_at: string
          experience: string | null
          govt_id_proof_url: string | null
          id: string
          instagram_link: string | null
          name: string
          phone: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
          youtube_link: string | null
        }
        Insert: {
          aadhaar_number?: string | null
          age?: number | null
          created_at?: string
          experience?: string | null
          govt_id_proof_url?: string | null
          id?: string
          instagram_link?: string | null
          name: string
          phone?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
          youtube_link?: string | null
        }
        Update: {
          aadhaar_number?: string | null
          age?: number | null
          created_at?: string
          experience?: string | null
          govt_id_proof_url?: string | null
          id?: string
          instagram_link?: string | null
          name?: string
          phone?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          youtube_link?: string | null
        }
        Relationships: []
      }
      organizer_earnings: {
        Row: {
          amount: number
          created_at: string
          credited_at: string
          currency: string
          id: string
          settlement_date: string
          status: string
          tournament_id: string | null
          updated_at: string
          user_id: string
          withdrawn_at: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          credited_at?: string
          currency?: string
          id?: string
          settlement_date?: string
          status?: string
          tournament_id?: string | null
          updated_at?: string
          user_id: string
          withdrawn_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          credited_at?: string
          currency?: string
          id?: string
          settlement_date?: string
          status?: string
          tournament_id?: string | null
          updated_at?: string
          user_id?: string
          withdrawn_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizer_earnings_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          setting_key: string
          setting_value: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key: string
          setting_value: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      player_team_members: {
        Row: {
          id: string
          joined_at: string
          role: string
          team_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          role?: string
          team_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          role?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "player_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      player_teams: {
        Row: {
          created_at: string
          game: string | null
          id: string
          is_open_for_players: boolean | null
          leader_id: string
          logo_url: string | null
          max_members: number | null
          name: string
          slogan: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          game?: string | null
          id?: string
          is_open_for_players?: boolean | null
          leader_id: string
          logo_url?: string | null
          max_members?: number | null
          name: string
          slogan?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          game?: string | null
          id?: string
          is_open_for_players?: boolean | null
          leader_id?: string
          logo_url?: string | null
          max_members?: number | null
          name?: string
          slogan?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          date_of_birth: string | null
          device_id: string | null
          email: string
          full_name: string | null
          game_uid: string | null
          id: string
          in_game_name: string | null
          is_banned: boolean | null
          is_frozen: boolean | null
          location: string | null
          phone: string | null
          preferred_game: string | null
          updated_at: string
          user_id: string
          username: string | null
          wallet_balance: number | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          date_of_birth?: string | null
          device_id?: string | null
          email: string
          full_name?: string | null
          game_uid?: string | null
          id?: string
          in_game_name?: string | null
          is_banned?: boolean | null
          is_frozen?: boolean | null
          location?: string | null
          phone?: string | null
          preferred_game?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
          wallet_balance?: number | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          date_of_birth?: string | null
          device_id?: string | null
          email?: string
          full_name?: string | null
          game_uid?: string | null
          id?: string
          in_game_name?: string | null
          is_banned?: boolean | null
          is_frozen?: boolean | null
          location?: string | null
          phone?: string | null
          preferred_game?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
          wallet_balance?: number | null
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          admin_response: string | null
          attachments: Json | null
          created_at: string
          description: string
          id: string
          request_callback: boolean | null
          responded_at: string | null
          responded_by: string | null
          status: string
          topic: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_response?: string | null
          attachments?: Json | null
          created_at?: string
          description: string
          id?: string
          request_callback?: boolean | null
          responded_at?: string | null
          responded_by?: string | null
          status?: string
          topic: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_response?: string | null
          attachments?: Json | null
          created_at?: string
          description?: string
          id?: string
          request_callback?: boolean | null
          responded_at?: string | null
          responded_by?: string | null
          status?: string
          topic?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          appointed_by: string | null
          created_at: string
          email: string
          id: string
          is_active: boolean
          name: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          appointed_by?: string | null
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
          name: string
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          appointed_by?: string | null
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          name?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tournament_registrations: {
        Row: {
          id: string
          is_team_leader: boolean | null
          registered_at: string
          status: string | null
          team_members: string[] | null
          team_name: string | null
          tournament_id: string
          user_id: string
        }
        Insert: {
          id?: string
          is_team_leader?: boolean | null
          registered_at?: string
          status?: string | null
          team_members?: string[] | null
          team_name?: string | null
          tournament_id: string
          user_id: string
        }
        Update: {
          id?: string
          is_team_leader?: boolean | null
          registered_at?: string
          status?: string | null
          team_members?: string[] | null
          team_name?: string | null
          tournament_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_registrations_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_reports: {
        Row: {
          admin_notes: string | null
          attachments: Json | null
          created_at: string
          description: string
          id: string
          report_type: string
          reported_player_id: string
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          tournament_id: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          attachments?: Json | null
          created_at?: string
          description: string
          id?: string
          report_type?: string
          reported_player_id: string
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tournament_id: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          attachments?: Json | null
          created_at?: string
          description?: string
          id?: string
          report_type?: string
          reported_player_id?: string
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tournament_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_reports_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          created_at: string
          created_by: string | null
          current_prize_pool: number | null
          description: string | null
          end_date: string | null
          entry_fee: number | null
          game: string
          id: string
          image_url: string | null
          joined_users: string[] | null
          max_participants: number | null
          organizer_earnings: number | null
          platform_earnings: number | null
          prize_distribution: Json | null
          prize_pool: string | null
          registration_deadline: string | null
          room_id: string | null
          room_password: string | null
          rules: string | null
          start_date: string
          status: string | null
          title: string
          total_fees_collected: number | null
          tournament_mode: string | null
          tournament_type: string
          updated_at: string
          winner_declared_at: string | null
          winner_user_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          current_prize_pool?: number | null
          description?: string | null
          end_date?: string | null
          entry_fee?: number | null
          game: string
          id?: string
          image_url?: string | null
          joined_users?: string[] | null
          max_participants?: number | null
          organizer_earnings?: number | null
          platform_earnings?: number | null
          prize_distribution?: Json | null
          prize_pool?: string | null
          registration_deadline?: string | null
          room_id?: string | null
          room_password?: string | null
          rules?: string | null
          start_date: string
          status?: string | null
          title: string
          total_fees_collected?: number | null
          tournament_mode?: string | null
          tournament_type?: string
          updated_at?: string
          winner_declared_at?: string | null
          winner_user_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          current_prize_pool?: number | null
          description?: string | null
          end_date?: string | null
          entry_fee?: number | null
          game?: string
          id?: string
          image_url?: string | null
          joined_users?: string[] | null
          max_participants?: number | null
          organizer_earnings?: number | null
          platform_earnings?: number | null
          prize_distribution?: Json | null
          prize_pool?: string | null
          registration_deadline?: string | null
          room_id?: string | null
          room_password?: string | null
          rules?: string | null
          start_date?: string
          status?: string | null
          title?: string
          total_fees_collected?: number | null
          tournament_mode?: string | null
          tournament_type?: string
          updated_at?: string
          winner_declared_at?: string | null
          winner_user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          phone: string | null
          processed_by: string | null
          reason: string | null
          screenshot_url: string | null
          status: string
          type: string
          updated_at: string
          upi_id: string | null
          user_id: string
          utr_number: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          phone?: string | null
          processed_by?: string | null
          reason?: string | null
          screenshot_url?: string | null
          status?: string
          type: string
          updated_at?: string
          upi_id?: string | null
          user_id: string
          utr_number?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          phone?: string | null
          processed_by?: string | null
          reason?: string | null
          screenshot_url?: string | null
          status?: string
          type?: string
          updated_at?: string
          upi_id?: string | null
          user_id?: string
          utr_number?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_adjust_wallet: {
        Args: {
          p_action: string
          p_amount: number
          p_reason: string
          p_target_user_id: string
        }
        Returns: Json
      }
      admin_process_deposit: {
        Args: { p_action: string; p_deposit_id: string; p_reason?: string }
        Returns: Json
      }
      admin_process_withdrawal: {
        Args: { p_action: string; p_reason?: string; p_withdrawal_id: string }
        Returns: Json
      }
      create_notification: {
        Args: {
          p_message: string
          p_related_id?: string
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: undefined
      }
      has_admin_permission: {
        Args: { _permission: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_email: { Args: { _email: string }; Returns: boolean }
      is_creator: { Args: { _user_id: string }; Returns: boolean }
      is_organizer: { Args: { _user_id: string }; Returns: boolean }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      process_team_tournament_join:
        | {
            Args: {
              p_leader_id: string
              p_team_member_ids: string[]
              p_team_name: string
              p_tournament_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_leader_id: string
              p_team_member_ids: string[]
              p_team_name: string
              p_tournament_id: string
            }
            Returns: Json
          }
      process_team_winner_declaration: {
        Args: {
          p_organizer_id: string
          p_team_positions: Json
          p_tournament_id: string
        }
        Returns: Json
      }
      process_tournament_cancellation: {
        Args: {
          p_cancellation_reason: string
          p_organizer_id: string
          p_tournament_id: string
        }
        Returns: Json
      }
      process_tournament_exit: {
        Args: { p_tournament_id: string; p_user_id: string }
        Returns: Json
      }
      process_tournament_join: {
        Args: { p_tournament_id: string; p_user_id: string }
        Returns: Json
      }
      process_winner_declaration: {
        Args: {
          p_organizer_id: string
          p_tournament_id: string
          p_winner_positions: Json
        }
        Returns: Json
      }
      process_withdrawal: {
        Args: {
          p_amount: number
          p_phone: string
          p_upi_id: string
          p_user_id: string
        }
        Returns: Json
      }
      recalculate_tournament_prizepool: {
        Args: { p_tournament_id: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "user" | "organizer" | "creator"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user", "organizer", "creator"],
    },
  },
} as const
