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
      achievements: {
        Row: {
          category: string
          created_at: string
          description: string
          icon: string
          id: string
          is_active: boolean
          name: string
          points: number
          requirement_type: string
          requirement_value: number
          reward_type: string
          reward_value: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          description: string
          icon?: string
          id?: string
          is_active?: boolean
          name: string
          points?: number
          requirement_type: string
          requirement_value?: number
          reward_type?: string
          reward_value?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          icon?: string
          id?: string
          is_active?: boolean
          name?: string
          points?: number
          requirement_type?: string
          requirement_value?: number
          reward_type?: string
          reward_value?: string | null
        }
        Relationships: []
      }
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
      ai_token_limits: {
        Row: {
          created_at: string
          daily_limit: number
          id: string
          is_enabled: boolean
          limit_type: string
          monthly_limit: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          daily_limit?: number
          id?: string
          is_enabled?: boolean
          limit_type: string
          monthly_limit?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          daily_limit?: number
          id?: string
          is_enabled?: boolean
          limit_type?: string
          monthly_limit?: number
          updated_at?: string
        }
        Relationships: []
      }
      ai_usage_logs: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          input_tokens: number | null
          model: string
          output_tokens: number | null
          request_type: string
          response_time_ms: number | null
          status: string
          total_tokens: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          input_tokens?: number | null
          model: string
          output_tokens?: number | null
          request_type?: string
          response_time_ms?: number | null
          status?: string
          total_tokens?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          input_tokens?: number | null
          model?: string
          output_tokens?: number | null
          request_type?: string
          response_time_ms?: number | null
          status?: string
          total_tokens?: number | null
          user_id?: string | null
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
      creator_custom_rules: {
        Row: {
          created_at: string | null
          creator_id: string
          custom_rules_content: string | null
          game: string
          id: string
          mode: string
          updated_at: string | null
          use_platform_rules: boolean | null
        }
        Insert: {
          created_at?: string | null
          creator_id: string
          custom_rules_content?: string | null
          game: string
          id?: string
          mode: string
          updated_at?: string | null
          use_platform_rules?: boolean | null
        }
        Update: {
          created_at?: string | null
          creator_id?: string
          custom_rules_content?: string | null
          game?: string
          id?: string
          mode?: string
          updated_at?: string | null
          use_platform_rules?: boolean | null
        }
        Relationships: []
      }
      creator_invite_links: {
        Row: {
          created_at: string | null
          creator_id: string
          id: string
          invite_code: string
          is_active: boolean | null
          link_name: string | null
          total_clicks: number | null
          total_qualified: number | null
          total_signups: number | null
        }
        Insert: {
          created_at?: string | null
          creator_id: string
          id?: string
          invite_code: string
          is_active?: boolean | null
          link_name?: string | null
          total_clicks?: number | null
          total_qualified?: number | null
          total_signups?: number | null
        }
        Update: {
          created_at?: string | null
          creator_id?: string
          id?: string
          invite_code?: string
          is_active?: boolean | null
          link_name?: string | null
          total_clicks?: number | null
          total_qualified?: number | null
          total_signups?: number | null
        }
        Relationships: []
      }
      creator_referrals: {
        Row: {
          id: string
          invite_link_id: string
          qualified_at: string | null
          referred_user_id: string
          registered_at: string | null
          status: string | null
        }
        Insert: {
          id?: string
          invite_link_id: string
          qualified_at?: string | null
          referred_user_id: string
          registered_at?: string | null
          status?: string | null
        }
        Update: {
          id?: string
          invite_link_id?: string
          qualified_at?: string | null
          referred_user_id?: string
          registered_at?: string | null
          status?: string | null
        }
        Relationships: []
      }
      dhana_balances: {
        Row: {
          available_dhana: number
          created_at: string
          id: string
          pending_dhana: number
          total_earned: number
          total_withdrawn: number
          updated_at: string
          user_id: string
        }
        Insert: {
          available_dhana?: number
          created_at?: string
          id?: string
          pending_dhana?: number
          total_earned?: number
          total_withdrawn?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          available_dhana?: number
          created_at?: string
          id?: string
          pending_dhana?: number
          total_earned?: number
          total_withdrawn?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      dhana_transactions: {
        Row: {
          amount: number
          available_at: string | null
          created_at: string
          description: string | null
          id: string
          status: string
          tournament_id: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          available_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          status?: string
          tournament_id?: string | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          available_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          status?: string
          tournament_id?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dhana_transactions_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      dhana_withdrawals: {
        Row: {
          amount: number
          created_at: string
          id: string
          phone: string | null
          processed_at: string | null
          processed_by: string | null
          rejection_reason: string | null
          status: string
          updated_at: string
          upi_id: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          phone?: string | null
          processed_at?: string | null
          processed_by?: string | null
          rejection_reason?: string | null
          status?: string
          updated_at?: string
          upi_id: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          phone?: string | null
          processed_at?: string | null
          processed_by?: string | null
          rejection_reason?: string | null
          status?: string
          updated_at?: string
          upi_id?: string
          user_id?: string
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
      local_tournament_applications: {
        Row: {
          admin_notes: string | null
          alternate_phone: string | null
          created_at: string
          entry_fee: number
          game: string
          id: string
          institution_name: string
          institution_type: string
          location_address: string
          location_lat: number | null
          location_lng: number | null
          max_participants: number
          primary_phone: string
          private_code: string | null
          prize_distribution: Json | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          tournament_date: string
          tournament_mode: string
          tournament_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          alternate_phone?: string | null
          created_at?: string
          entry_fee?: number
          game: string
          id?: string
          institution_name: string
          institution_type?: string
          location_address: string
          location_lat?: number | null
          location_lng?: number | null
          max_participants?: number
          primary_phone: string
          private_code?: string | null
          prize_distribution?: Json | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tournament_date: string
          tournament_mode?: string
          tournament_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          alternate_phone?: string | null
          created_at?: string
          entry_fee?: number
          game?: string
          id?: string
          institution_name?: string
          institution_type?: string
          location_address?: string
          location_lat?: number | null
          location_lng?: number | null
          max_participants?: number
          primary_phone?: string
          private_code?: string | null
          prize_distribution?: Json | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tournament_date?: string
          tournament_mode?: string
          tournament_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      local_tournaments: {
        Row: {
          application_id: string
          created_at: string
          current_prize_pool: number | null
          ended_at: string | null
          entry_fee: number
          game: string
          id: string
          instagram_link: string | null
          institution_name: string
          joined_users: string[] | null
          max_participants: number
          organizer_earnings: number | null
          organizer_id: string
          platform_earnings: number | null
          private_code: string
          prize_distribution: Json | null
          qr_code_url: string | null
          room_id: string | null
          room_password: string | null
          started_at: string | null
          status: string
          total_fees_collected: number | null
          tournament_date: string
          tournament_mode: string
          tournament_name: string
          updated_at: string
          winner_declared_at: string | null
          winner_user_id: string | null
          youtube_link: string | null
        }
        Insert: {
          application_id: string
          created_at?: string
          current_prize_pool?: number | null
          ended_at?: string | null
          entry_fee?: number
          game: string
          id?: string
          instagram_link?: string | null
          institution_name: string
          joined_users?: string[] | null
          max_participants?: number
          organizer_earnings?: number | null
          organizer_id: string
          platform_earnings?: number | null
          private_code: string
          prize_distribution?: Json | null
          qr_code_url?: string | null
          room_id?: string | null
          room_password?: string | null
          started_at?: string | null
          status?: string
          total_fees_collected?: number | null
          tournament_date: string
          tournament_mode?: string
          tournament_name: string
          updated_at?: string
          winner_declared_at?: string | null
          winner_user_id?: string | null
          youtube_link?: string | null
        }
        Update: {
          application_id?: string
          created_at?: string
          current_prize_pool?: number | null
          ended_at?: string | null
          entry_fee?: number
          game?: string
          id?: string
          instagram_link?: string | null
          institution_name?: string
          joined_users?: string[] | null
          max_participants?: number
          organizer_earnings?: number | null
          organizer_id?: string
          platform_earnings?: number | null
          private_code?: string
          prize_distribution?: Json | null
          qr_code_url?: string | null
          room_id?: string | null
          room_password?: string | null
          started_at?: string | null
          status?: string
          total_fees_collected?: number | null
          tournament_date?: string
          tournament_mode?: string
          tournament_name?: string
          updated_at?: string
          winner_declared_at?: string | null
          winner_user_id?: string | null
          youtube_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "local_tournaments_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "local_tournament_applications"
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
      payment_gateway_config: {
        Row: {
          additional_config: Json | null
          api_key_id: string | null
          api_key_secret: string | null
          created_at: string
          created_by: string | null
          currency: string
          display_name: string
          environment: string
          gateway_name: string
          id: string
          is_default: boolean
          is_enabled: boolean
          max_amount: number | null
          min_amount: number | null
          platform_fee_fixed: number | null
          platform_fee_percent: number | null
          supports_auto_credit: boolean | null
          supports_recurring: boolean | null
          supports_refunds: boolean | null
          updated_at: string
          updated_by: string | null
          webhook_secret: string | null
        }
        Insert: {
          additional_config?: Json | null
          api_key_id?: string | null
          api_key_secret?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          display_name: string
          environment?: string
          gateway_name: string
          id?: string
          is_default?: boolean
          is_enabled?: boolean
          max_amount?: number | null
          min_amount?: number | null
          platform_fee_fixed?: number | null
          platform_fee_percent?: number | null
          supports_auto_credit?: boolean | null
          supports_recurring?: boolean | null
          supports_refunds?: boolean | null
          updated_at?: string
          updated_by?: string | null
          webhook_secret?: string | null
        }
        Update: {
          additional_config?: Json | null
          api_key_id?: string | null
          api_key_secret?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          display_name?: string
          environment?: string
          gateway_name?: string
          id?: string
          is_default?: boolean
          is_enabled?: boolean
          max_amount?: number | null
          min_amount?: number | null
          platform_fee_fixed?: number | null
          platform_fee_percent?: number | null
          supports_auto_credit?: boolean | null
          supports_recurring?: boolean | null
          supports_refunds?: boolean | null
          updated_at?: string
          updated_by?: string | null
          webhook_secret?: string | null
        }
        Relationships: []
      }
      payment_gateway_transactions: {
        Row: {
          amount: number
          completed_at: string | null
          created_at: string
          currency: string
          error_code: string | null
          error_description: string | null
          gateway_fee: number | null
          gateway_name: string
          id: string
          metadata: Json | null
          net_amount: number | null
          order_id: string | null
          payment_id: string | null
          platform_fee: number | null
          signature: string | null
          status: string
          transaction_type: string
          updated_at: string
          user_id: string
          wallet_transaction_id: string | null
        }
        Insert: {
          amount: number
          completed_at?: string | null
          created_at?: string
          currency?: string
          error_code?: string | null
          error_description?: string | null
          gateway_fee?: number | null
          gateway_name: string
          id?: string
          metadata?: Json | null
          net_amount?: number | null
          order_id?: string | null
          payment_id?: string | null
          platform_fee?: number | null
          signature?: string | null
          status?: string
          transaction_type?: string
          updated_at?: string
          user_id: string
          wallet_transaction_id?: string | null
        }
        Update: {
          amount?: number
          completed_at?: string | null
          created_at?: string
          currency?: string
          error_code?: string | null
          error_description?: string | null
          gateway_fee?: number | null
          gateway_name?: string
          id?: string
          metadata?: Json | null
          net_amount?: number | null
          order_id?: string | null
          payment_id?: string | null
          platform_fee?: number | null
          signature?: string | null
          status?: string
          transaction_type?: string
          updated_at?: string
          user_id?: string
          wallet_transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_wallet_transaction"
            columns: ["wallet_transaction_id"]
            isOneToOne: false
            referencedRelation: "wallet_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_retry_queue: {
        Row: {
          amount: number
          created_at: string
          error_message: string | null
          id: string
          last_retry_at: string | null
          max_retries: number | null
          next_retry_at: string | null
          order_id: string | null
          payment_id: string | null
          retry_count: number | null
          status: string | null
          transaction_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          error_message?: string | null
          id?: string
          last_retry_at?: string | null
          max_retries?: number | null
          next_retry_at?: string | null
          order_id?: string | null
          payment_id?: string | null
          retry_count?: number | null
          status?: string | null
          transaction_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          error_message?: string | null
          id?: string
          last_retry_at?: string | null
          max_retries?: number | null
          next_retry_at?: string | null
          order_id?: string | null
          payment_id?: string | null
          retry_count?: number | null
          status?: string | null
          transaction_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_retry_queue_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "payment_gateway_transactions"
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
      player_bans: {
        Row: {
          ban_duration_hours: number | null
          ban_number: number
          ban_reason: string
          ban_type: string
          banned_at: string
          banned_by: string
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          lift_reason: string | null
          lifted_at: string | null
          lifted_by: string | null
          report_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ban_duration_hours?: number | null
          ban_number?: number
          ban_reason: string
          ban_type?: string
          banned_at?: string
          banned_by: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          lift_reason?: string | null
          lifted_at?: string | null
          lifted_by?: string | null
          report_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ban_duration_hours?: number | null
          ban_number?: number
          ban_reason?: string
          ban_type?: string
          banned_at?: string
          banned_by?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          lift_reason?: string | null
          lifted_at?: string | null
          lifted_by?: string | null
          report_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_bans_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "tournament_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      player_game_stats: {
        Row: {
          accuracy: number | null
          avg_damage_per_match: number | null
          avg_survival_time_minutes: number | null
          created_at: string
          current_level: number | null
          current_tier: string | null
          game_uid: string | null
          headshot_kills: number | null
          headshot_percentage: number | null
          highest_damage_single_match: number | null
          id: string
          in_game_name: string | null
          is_expired: boolean | null
          is_verified: boolean | null
          kd_ratio: number | null
          last_updated_at: string | null
          longest_kill_distance: number | null
          most_kills_single_match: number | null
          preferred_map: string | null
          preferred_mode: string | null
          stats_month: string | null
          stats_valid_until: string | null
          top_10_finishes: number | null
          total_damage: number | null
          total_deaths: number | null
          total_kills: number | null
          total_matches: number | null
          total_survival_time_seconds: number | null
          update_reminder_sent: boolean | null
          updated_at: string
          user_id: string
          verified_at: string | null
          verified_by: string | null
          win_rate: number | null
          wins: number | null
        }
        Insert: {
          accuracy?: number | null
          avg_damage_per_match?: number | null
          avg_survival_time_minutes?: number | null
          created_at?: string
          current_level?: number | null
          current_tier?: string | null
          game_uid?: string | null
          headshot_kills?: number | null
          headshot_percentage?: number | null
          highest_damage_single_match?: number | null
          id?: string
          in_game_name?: string | null
          is_expired?: boolean | null
          is_verified?: boolean | null
          kd_ratio?: number | null
          last_updated_at?: string | null
          longest_kill_distance?: number | null
          most_kills_single_match?: number | null
          preferred_map?: string | null
          preferred_mode?: string | null
          stats_month?: string | null
          stats_valid_until?: string | null
          top_10_finishes?: number | null
          total_damage?: number | null
          total_deaths?: number | null
          total_kills?: number | null
          total_matches?: number | null
          total_survival_time_seconds?: number | null
          update_reminder_sent?: boolean | null
          updated_at?: string
          user_id: string
          verified_at?: string | null
          verified_by?: string | null
          win_rate?: number | null
          wins?: number | null
        }
        Update: {
          accuracy?: number | null
          avg_damage_per_match?: number | null
          avg_survival_time_minutes?: number | null
          created_at?: string
          current_level?: number | null
          current_tier?: string | null
          game_uid?: string | null
          headshot_kills?: number | null
          headshot_percentage?: number | null
          highest_damage_single_match?: number | null
          id?: string
          in_game_name?: string | null
          is_expired?: boolean | null
          is_verified?: boolean | null
          kd_ratio?: number | null
          last_updated_at?: string | null
          longest_kill_distance?: number | null
          most_kills_single_match?: number | null
          preferred_map?: string | null
          preferred_mode?: string | null
          stats_month?: string | null
          stats_valid_until?: string | null
          top_10_finishes?: number | null
          total_damage?: number | null
          total_deaths?: number | null
          total_kills?: number | null
          total_matches?: number | null
          total_survival_time_seconds?: number | null
          update_reminder_sent?: boolean | null
          updated_at?: string
          user_id?: string
          verified_at?: string | null
          verified_by?: string | null
          win_rate?: number | null
          wins?: number | null
        }
        Relationships: []
      }
      player_game_stats_history: {
        Row: {
          avg_damage_per_match: number | null
          current_level: number | null
          current_tier: string | null
          headshot_percentage: number | null
          id: string
          kd_growth: number | null
          kd_ratio: number | null
          kills_growth: number | null
          period_type: string | null
          recorded_at: string
          tier_change: string | null
          total_deaths: number | null
          total_kills: number | null
          total_matches: number | null
          user_id: string
          win_rate: number | null
          wins: number | null
        }
        Insert: {
          avg_damage_per_match?: number | null
          current_level?: number | null
          current_tier?: string | null
          headshot_percentage?: number | null
          id?: string
          kd_growth?: number | null
          kd_ratio?: number | null
          kills_growth?: number | null
          period_type?: string | null
          recorded_at?: string
          tier_change?: string | null
          total_deaths?: number | null
          total_kills?: number | null
          total_matches?: number | null
          user_id: string
          win_rate?: number | null
          wins?: number | null
        }
        Update: {
          avg_damage_per_match?: number | null
          current_level?: number | null
          current_tier?: string | null
          headshot_percentage?: number | null
          id?: string
          kd_growth?: number | null
          kd_ratio?: number | null
          kills_growth?: number | null
          period_type?: string | null
          recorded_at?: string
          tier_change?: string | null
          total_deaths?: number | null
          total_kills?: number | null
          total_matches?: number | null
          user_id?: string
          win_rate?: number | null
          wins?: number | null
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
      player_team_requests: {
        Row: {
          created_at: string
          id: string
          message: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          team_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_team_requests_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "player_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      player_teams: {
        Row: {
          acting_leader_id: string | null
          created_at: string
          game: string | null
          id: string
          is_open_for_players: boolean | null
          leader_id: string
          logo_url: string | null
          max_members: number | null
          name: string
          requires_approval: boolean | null
          slogan: string | null
          updated_at: string
        }
        Insert: {
          acting_leader_id?: string | null
          created_at?: string
          game?: string | null
          id?: string
          is_open_for_players?: boolean | null
          leader_id: string
          logo_url?: string | null
          max_members?: number | null
          name: string
          requires_approval?: boolean | null
          slogan?: string | null
          updated_at?: string
        }
        Update: {
          acting_leader_id?: string | null
          created_at?: string
          game?: string | null
          id?: string
          is_open_for_players?: boolean | null
          leader_id?: string
          logo_url?: string | null
          max_members?: number | null
          name?: string
          requires_approval?: boolean | null
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
          last_activity_at: string | null
          location: string | null
          phone: string | null
          preferred_game: string | null
          updated_at: string
          user_id: string
          username: string | null
          wallet_balance: number | null
          withdrawable_balance: number | null
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
          last_activity_at?: string | null
          location?: string | null
          phone?: string | null
          preferred_game?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
          wallet_balance?: number | null
          withdrawable_balance?: number | null
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
          last_activity_at?: string | null
          location?: string | null
          phone?: string | null
          preferred_game?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
          wallet_balance?: number | null
          withdrawable_balance?: number | null
        }
        Relationships: []
      }
      push_notification_logs: {
        Row: {
          data: Json | null
          id: string
          message: string
          sent_at: string
          sent_by: string | null
          status: string
          target_count: number | null
          target_type: string
          title: string
          url: string | null
        }
        Insert: {
          data?: Json | null
          id?: string
          message: string
          sent_at?: string
          sent_by?: string | null
          status?: string
          target_count?: number | null
          target_type?: string
          title: string
          url?: string | null
        }
        Update: {
          data?: Json | null
          id?: string
          message?: string
          sent_at?: string
          sent_by?: string | null
          status?: string
          target_count?: number | null
          target_type?: string
          title?: string
          url?: string | null
        }
        Relationships: []
      }
      school_tournament_applications: {
        Row: {
          admin_notes: string | null
          alternate_phone: string | null
          created_at: string
          entry_fee: number | null
          entry_type: string
          full_address: string | null
          game: string
          id: string
          max_players: number
          organizer_name: string
          primary_phone: string
          prize_pool: number | null
          registration_deadline: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          school_city: string
          school_district: string
          school_image_url: string | null
          school_name: string
          school_state: string
          status: string
          tournament_date: string
          tournament_name: string
          updated_at: string
          user_id: string
          verification_type: string
        }
        Insert: {
          admin_notes?: string | null
          alternate_phone?: string | null
          created_at?: string
          entry_fee?: number | null
          entry_type?: string
          full_address?: string | null
          game: string
          id?: string
          max_players: number
          organizer_name: string
          primary_phone: string
          prize_pool?: number | null
          registration_deadline: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          school_city: string
          school_district: string
          school_image_url?: string | null
          school_name: string
          school_state: string
          status?: string
          tournament_date: string
          tournament_name: string
          updated_at?: string
          user_id: string
          verification_type?: string
        }
        Update: {
          admin_notes?: string | null
          alternate_phone?: string | null
          created_at?: string
          entry_fee?: number | null
          entry_type?: string
          full_address?: string | null
          game?: string
          id?: string
          max_players?: number
          organizer_name?: string
          primary_phone?: string
          prize_pool?: number | null
          registration_deadline?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          school_city?: string
          school_district?: string
          school_image_url?: string | null
          school_name?: string
          school_state?: string
          status?: string
          tournament_date?: string
          tournament_name?: string
          updated_at?: string
          user_id?: string
          verification_type?: string
        }
        Relationships: []
      }
      school_tournament_room_assignments: {
        Row: {
          created_at: string
          id: string
          is_winner: boolean | null
          match_rank: number | null
          room_id: string
          slot_number: number
          team_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_winner?: boolean | null
          match_rank?: number | null
          room_id: string
          slot_number: number
          team_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_winner?: boolean | null
          match_rank?: number | null
          room_id?: string
          slot_number?: number
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_tournament_room_assignments_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "school_tournament_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_tournament_room_assignments_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "school_tournament_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      school_tournament_rooms: {
        Row: {
          created_at: string
          id: string
          room_id: string | null
          room_name: string
          room_number: number
          room_password: string | null
          round_number: number
          scheduled_time: string | null
          status: string
          tournament_id: string
          updated_at: string
          winner_team_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          room_id?: string | null
          room_name: string
          room_number: number
          room_password?: string | null
          round_number: number
          scheduled_time?: string | null
          status?: string
          tournament_id: string
          updated_at?: string
          winner_team_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          room_id?: string | null
          room_name?: string
          room_number?: number
          room_password?: string | null
          round_number?: number
          scheduled_time?: string | null
          status?: string
          tournament_id?: string
          updated_at?: string
          winner_team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_tournament_rooms_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "school_tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_tournament_rooms_winner_team_id_fkey"
            columns: ["winner_team_id"]
            isOneToOne: false
            referencedRelation: "school_tournament_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      school_tournament_teams: {
        Row: {
          contact_number: string | null
          created_at: string
          current_round: number | null
          eliminated_at_round: number | null
          final_rank: number | null
          govt_id_number: string | null
          id: string
          is_eliminated: boolean | null
          is_verified: boolean | null
          leader_id: string
          member_1_id: string | null
          member_2_id: string | null
          member_3_id: string | null
          registered_at: string
          registration_method: string
          team_name: string
          tournament_id: string
          updated_at: string
          verification_notes: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          contact_number?: string | null
          created_at?: string
          current_round?: number | null
          eliminated_at_round?: number | null
          final_rank?: number | null
          govt_id_number?: string | null
          id?: string
          is_eliminated?: boolean | null
          is_verified?: boolean | null
          leader_id: string
          member_1_id?: string | null
          member_2_id?: string | null
          member_3_id?: string | null
          registered_at?: string
          registration_method?: string
          team_name: string
          tournament_id: string
          updated_at?: string
          verification_notes?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          contact_number?: string | null
          created_at?: string
          current_round?: number | null
          eliminated_at_round?: number | null
          final_rank?: number | null
          govt_id_number?: string | null
          id?: string
          is_eliminated?: boolean | null
          is_verified?: boolean | null
          leader_id?: string
          member_1_id?: string | null
          member_2_id?: string | null
          member_3_id?: string | null
          registered_at?: string
          registration_method?: string
          team_name?: string
          tournament_id?: string
          updated_at?: string
          verification_notes?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_tournament_teams_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "school_tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      school_tournaments: {
        Row: {
          application_id: string
          created_at: string
          current_players: number | null
          current_round: number | null
          ended_at: string | null
          entry_fee: number | null
          entry_type: string
          first_place_prize: number | null
          full_address: string | null
          game: string
          id: string
          max_players: number
          organizer_id: string
          players_per_room: number
          private_code: string
          prize_pool: number | null
          qr_code_url: string | null
          registration_deadline: string
          school_city: string
          school_district: string
          school_image_url: string | null
          school_name: string
          school_state: string
          second_place_prize: number | null
          started_at: string | null
          status: string
          third_place_prize: number | null
          total_collected: number | null
          total_rooms: number
          total_rounds: number | null
          tournament_date: string
          tournament_name: string
          updated_at: string
          verification_type: string
        }
        Insert: {
          application_id: string
          created_at?: string
          current_players?: number | null
          current_round?: number | null
          ended_at?: string | null
          entry_fee?: number | null
          entry_type?: string
          first_place_prize?: number | null
          full_address?: string | null
          game: string
          id?: string
          max_players: number
          organizer_id: string
          players_per_room?: number
          private_code: string
          prize_pool?: number | null
          qr_code_url?: string | null
          registration_deadline: string
          school_city: string
          school_district: string
          school_image_url?: string | null
          school_name: string
          school_state: string
          second_place_prize?: number | null
          started_at?: string | null
          status?: string
          third_place_prize?: number | null
          total_collected?: number | null
          total_rooms?: number
          total_rounds?: number | null
          tournament_date: string
          tournament_name: string
          updated_at?: string
          verification_type?: string
        }
        Update: {
          application_id?: string
          created_at?: string
          current_players?: number | null
          current_round?: number | null
          ended_at?: string | null
          entry_fee?: number | null
          entry_type?: string
          first_place_prize?: number | null
          full_address?: string | null
          game?: string
          id?: string
          max_players?: number
          organizer_id?: string
          players_per_room?: number
          private_code?: string
          prize_pool?: number | null
          qr_code_url?: string | null
          registration_deadline?: string
          school_city?: string
          school_district?: string
          school_image_url?: string | null
          school_name?: string
          school_state?: string
          second_place_prize?: number | null
          started_at?: string | null
          status?: string
          third_place_prize?: number | null
          total_collected?: number | null
          total_rooms?: number
          total_rounds?: number | null
          tournament_date?: string
          tournament_name?: string
          updated_at?: string
          verification_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_tournaments_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "school_tournament_applications"
            referencedColumns: ["id"]
          },
        ]
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
      team_messages: {
        Row: {
          content: string
          created_at: string
          edited_at: string | null
          id: string
          is_edited: boolean | null
          reactions: Json | null
          reply_to: string | null
          seen_by: string[] | null
          sender_id: string
          team_id: string
        }
        Insert: {
          content: string
          created_at?: string
          edited_at?: string | null
          id?: string
          is_edited?: boolean | null
          reactions?: Json | null
          reply_to?: string | null
          seen_by?: string[] | null
          sender_id: string
          team_id: string
        }
        Update: {
          content?: string
          created_at?: string
          edited_at?: string | null
          id?: string
          is_edited?: boolean | null
          reactions?: Json | null
          reply_to?: string | null
          seen_by?: string[] | null
          sender_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_messages_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "team_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_messages_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "player_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_requirements: {
        Row: {
          created_at: string | null
          description: string
          game: string
          id: string
          is_active: boolean | null
          role_needed: string
          team_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          game: string
          id?: string
          is_active?: boolean | null
          role_needed: string
          team_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          game?: string
          id?: string
          is_active?: boolean | null
          role_needed?: string
          team_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_requirements_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "player_teams"
            referencedColumns: ["id"]
          },
        ]
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
          giveaway_prize_pool: number | null
          id: string
          image_url: string | null
          instagram_link: string | null
          is_giveaway: boolean | null
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
          youtube_link: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          current_prize_pool?: number | null
          description?: string | null
          end_date?: string | null
          entry_fee?: number | null
          game: string
          giveaway_prize_pool?: number | null
          id?: string
          image_url?: string | null
          instagram_link?: string | null
          is_giveaway?: boolean | null
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
          youtube_link?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          current_prize_pool?: number | null
          description?: string | null
          end_date?: string | null
          entry_fee?: number | null
          game?: string
          giveaway_prize_pool?: number | null
          id?: string
          image_url?: string | null
          instagram_link?: string | null
          is_giveaway?: boolean | null
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
          youtube_link?: string | null
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_id: string
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
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
      user_stats: {
        Row: {
          created_at: string
          first_place_count: number
          id: string
          local_tournament_wins: number
          second_place_count: number
          third_place_count: number
          total_earnings: number
          tournament_participations: number
          tournament_wins: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          first_place_count?: number
          id?: string
          local_tournament_wins?: number
          second_place_count?: number
          third_place_count?: number
          total_earnings?: number
          tournament_participations?: number
          tournament_wins?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          first_place_count?: number
          id?: string
          local_tournament_wins?: number
          second_place_count?: number
          third_place_count?: number
          total_earnings?: number
          tournament_participations?: number
          tournament_wins?: number
          updated_at?: string
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
      add_to_retry_queue: {
        Args: {
          p_amount: number
          p_error_message?: string
          p_order_id?: string
          p_payment_id?: string
          p_transaction_id: string
          p_user_id: string
        }
        Returns: Json
      }
      admin_adjust_wallet: {
        Args: {
          p_action: string
          p_amount: number
          p_reason: string
          p_target_user_id: string
        }
        Returns: Json
      }
      admin_lift_ban: {
        Args: { p_ban_id: string; p_lift_reason: string }
        Returns: Json
      }
      admin_process_deposit: {
        Args: { p_action: string; p_deposit_id: string; p_reason?: string }
        Returns: Json
      }
      admin_process_dhana_withdrawal: {
        Args: { p_action: string; p_reason?: string; p_withdrawal_id: string }
        Returns: Json
      }
      admin_process_withdrawal: {
        Args: { p_action: string; p_reason?: string; p_withdrawal_id: string }
        Returns: Json
      }
      admin_restore_account: {
        Args: { p_reason: string; p_user_id: string }
        Returns: Json
      }
      admin_terminate_account: {
        Args: { p_reason: string; p_user_id: string }
        Returns: Json
      }
      ai_unban_user: {
        Args: {
          p_user_id: string
          p_verified_email: string
          p_verified_phone: string
          p_verified_uid: string
        }
        Returns: Json
      }
      approve_local_tournament: {
        Args: { p_admin_notes?: string; p_application_id: string }
        Returns: Json
      }
      ban_player_from_report: {
        Args: { p_ban_reason: string; p_report_id: string }
        Returns: Json
      }
      calculate_tournament_structure: {
        Args: { p_game: string; p_max_players: number }
        Returns: Json
      }
      cancel_local_tournament: {
        Args: { p_organizer_id: string; p_tournament_id: string }
        Returns: Json
      }
      check_and_award_achievements: {
        Args: { p_user_id: string }
        Returns: Json
      }
      check_and_ban_inactive_user: {
        Args: { p_user_id: string }
        Returns: Json
      }
      check_user_ban_status: { Args: { p_user_id: string }; Returns: Json }
      claim_stats_bonus: {
        Args: {
          p_bonus_amount: number
          p_milestone_points: number
          p_user_id: string
        }
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
      create_school_tournament_from_application: {
        Args: { p_application_id: string }
        Returns: string
      }
      credit_dhana_commission: {
        Args: {
          p_amount: number
          p_description?: string
          p_tournament_id: string
          p_user_id: string
        }
        Returns: Json
      }
      declare_local_winner:
        | {
            Args: {
              p_organizer_id: string
              p_tournament_id: string
              p_winner_positions: Json
            }
            Returns: Json
          }
        | {
            Args: {
              p_organizer_id: string
              p_prize_distribution?: Json
              p_tournament_id: string
              p_winner_positions: Json
            }
            Returns: Json
          }
      declare_room_winner: {
        Args: { p_room_id: string; p_winner_team_id: string }
        Returns: boolean
      }
      generate_private_code: { Args: never; Returns: string }
      generate_tournament_round_rooms: {
        Args: { p_round_number: number; p_tournament_id: string }
        Returns: number
      }
      get_active_payment_gateway: {
        Args: never
        Returns: {
          api_key_id: string
          display_name: string
          environment: string
          gateway_name: string
          is_enabled: boolean
          max_amount: number
          min_amount: number
        }[]
      }
      get_user_ban_count: { Args: { p_user_id: string }; Returns: number }
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
      join_local_tournament:
        | { Args: { p_private_code: string; p_user_id: string }; Returns: Json }
        | { Args: { p_private_code: string; p_user_id: string }; Returns: Json }
      process_dhana_maturation: { Args: never; Returns: Json }
      process_giveaway_tournament_creation: {
        Args: {
          p_organizer_id: string
          p_prize_pool: number
          p_tournament_id: string
        }
        Returns: Json
      }
      process_local_tournament_exit: {
        Args: { p_tournament_id: string }
        Returns: Json
      }
      process_retry_queue_item: { Args: { p_queue_id: string }; Returns: Json }
      process_team_tournament_join: {
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
      recalculate_local_tournament_prizepool: {
        Args: { p_tournament_id: string }
        Returns: Json
      }
      recalculate_tournament_prizepool: {
        Args: { p_tournament_id: string }
        Returns: Json
      }
      register_school_tournament_team: {
        Args: {
          p_leader_id: string
          p_member_1_id?: string
          p_member_2_id?: string
          p_member_3_id?: string
          p_registration_method?: string
          p_team_name: string
          p_tournament_id: string
        }
        Returns: string
      }
      reject_local_tournament: {
        Args: { p_application_id: string; p_reason: string }
        Returns: Json
      }
      request_dhana_withdrawal: {
        Args: {
          p_amount: number
          p_phone?: string
          p_upi_id: string
          p_user_id: string
        }
        Returns: Json
      }
      update_local_tournament_prize_distribution: {
        Args: {
          p_organizer_id: string
          p_prize_distribution: Json
          p_tournament_id: string
        }
        Returns: Json
      }
      update_retry_status: {
        Args: {
          p_error_message?: string
          p_queue_id: string
          p_success: boolean
        }
        Returns: Json
      }
      update_user_activity: { Args: { p_user_id: string }; Returns: undefined }
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
