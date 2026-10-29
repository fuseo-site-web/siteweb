export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.18';
  };
  public: {
    Tables: {
      admin_users: {
        Row: {
          created_at: string;
          role: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          role: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          role?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      audit_log: {
        Row: {
          action: string;
          actor: string | null;
          id: number;
          ip_hash: string | null;
          meta: Json | null;
          target: string | null;
          ts: string;
        };
        Insert: {
          action: string;
          actor?: string | null;
          id?: never;
          ip_hash?: string | null;
          meta?: Json | null;
          target?: string | null;
          ts?: string;
        };
        Update: {
          action?: string;
          actor?: string | null;
          id?: never;
          ip_hash?: string | null;
          meta?: Json | null;
          target?: string | null;
          ts?: string;
        };
        Relationships: [];
      };
      events: {
        Row: {
          browser: string | null;
          channel: string | null;
          consent_version: string | null;
          country: string | null;
          device: string | null;
          id: number;
          is_entry: boolean;
          label: string | null;
          locale: string | null;
          name: string;
          path: string;
          referrer_host: string | null;
          session_id: string;
          source: string | null;
          target: string | null;
          ts: string;
          utm_campaign: string | null;
          utm_medium: string | null;
          utm_source: string | null;
          visitor_id: string;
        };
        Insert: {
          browser?: string | null;
          channel?: string | null;
          consent_version?: string | null;
          country?: string | null;
          device?: string | null;
          id?: never;
          is_entry?: boolean;
          label?: string | null;
          locale?: string | null;
          name: string;
          path: string;
          referrer_host?: string | null;
          session_id: string;
          source?: string | null;
          target?: string | null;
          ts?: string;
          utm_campaign?: string | null;
          utm_medium?: string | null;
          utm_source?: string | null;
          visitor_id: string;
        };
        Update: {
          browser?: string | null;
          channel?: string | null;
          consent_version?: string | null;
          country?: string | null;
          device?: string | null;
          id?: never;
          is_entry?: boolean;
          label?: string | null;
          locale?: string | null;
          name?: string;
          path?: string;
          referrer_host?: string | null;
          session_id?: string;
          source?: string | null;
          target?: string | null;
          ts?: string;
          utm_campaign?: string | null;
          utm_medium?: string | null;
          utm_source?: string | null;
          visitor_id?: string;
        };
        Relationships: [];
      };
      blog_posts: {
        Row: {
          body_md: string;
          cover_alt: string;
          cover_url: string | null;
          created_at: string;
          excerpt: string;
          id: string;
          locale: string;
          published_at: string | null;
          seo_description: string | null;
          seo_title: string | null;
          slug: string;
          status: string;
          title: string;
          topic: string;
          updated_at: string;
        };
        Insert: {
          body_md?: string;
          cover_alt?: string;
          cover_url?: string | null;
          created_at?: string;
          excerpt?: string;
          id?: string;
          locale?: string;
          published_at?: string | null;
          seo_description?: string | null;
          seo_title?: string | null;
          slug: string;
          status?: string;
          title: string;
          topic?: string;
          updated_at?: string;
        };
        Update: {
          body_md?: string;
          cover_alt?: string;
          cover_url?: string | null;
          created_at?: string;
          excerpt?: string;
          id?: string;
          locale?: string;
          published_at?: string | null;
          seo_description?: string | null;
          seo_title?: string | null;
          slug?: string;
          status?: string;
          title?: string;
          topic?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      consent_logs: {
        Row: {
          anon_id: string;
          choices: Json;
          id: string;
          policy_version: string;
          source: string;
          ts: string;
        };
        Insert: {
          anon_id: string;
          choices: Json;
          id?: string;
          policy_version: string;
          source?: string;
          ts?: string;
        };
        Update: {
          anon_id?: string;
          choices?: Json;
          id?: string;
          policy_version?: string;
          source?: string;
          ts?: string;
        };
        Relationships: [];
      };
      contact_messages: {
        Row: {
          assignee: string | null;
          created_at: string;
          email: string;
          id: string;
          kind: string;
          locale: string;
          message: string;
          name: string;
          phone: string | null;
          preferred_slot: string | null;
          status: string;
          subject: string;
        };
        Insert: {
          assignee?: string | null;
          created_at?: string;
          email: string;
          id?: string;
          kind?: string;
          locale?: string;
          message: string;
          name: string;
          phone?: string | null;
          preferred_slot?: string | null;
          status?: string;
          subject: string;
        };
        Update: {
          assignee?: string | null;
          created_at?: string;
          email?: string;
          id?: string;
          kind?: string;
          locale?: string;
          message?: string;
          name?: string;
          phone?: string | null;
          preferred_slot?: string | null;
          status?: string;
          subject?: string;
        };
        Relationships: [];
      };
      email_events: {
        Row: {
          id: string;
          resend_id: string;
          ts: string;
          type: string;
        };
        Insert: {
          id?: string;
          resend_id: string;
          ts?: string;
          type: string;
        };
        Update: {
          id?: string;
          resend_id?: string;
          ts?: string;
          type?: string;
        };
        Relationships: [];
      };
      entitlements: {
        Row: {
          amount_cents: number | null;
          cgv_accepted_at: string | null;
          cgv_version: string | null;
          created_at: string;
          currency: string | null;
          email: string;
          expires_at: string | null;
          id: string;
          offer: string;
          starts_at: string | null;
          status: string;
          stripe_payment_intent: string | null;
          stripe_session_id: string | null;
          trip_credits: number;
          user_id: string | null;
          withdrawal_waiver_at: string | null;
        };
        Insert: {
          amount_cents?: number | null;
          cgv_accepted_at?: string | null;
          cgv_version?: string | null;
          created_at?: string;
          currency?: string | null;
          email: string;
          expires_at?: string | null;
          id?: string;
          offer: string;
          starts_at?: string | null;
          status?: string;
          stripe_payment_intent?: string | null;
          stripe_session_id?: string | null;
          trip_credits?: number;
          user_id?: string | null;
          withdrawal_waiver_at?: string | null;
        };
        Update: {
          amount_cents?: number | null;
          cgv_accepted_at?: string | null;
          cgv_version?: string | null;
          created_at?: string;
          currency?: string | null;
          email?: string;
          expires_at?: string | null;
          id?: string;
          offer?: string;
          starts_at?: string | null;
          status?: string;
          stripe_payment_intent?: string | null;
          stripe_session_id?: string | null;
          trip_credits?: number;
          user_id?: string | null;
          withdrawal_waiver_at?: string | null;
        };
        Relationships: [];
      };
      gsc_daily: {
        Row: {
          clicks: number;
          ctr: number;
          date: string;
          impressions: number;
          page: string;
          position: number;
          query: string;
        };
        Insert: {
          clicks?: number;
          ctr?: number;
          date: string;
          impressions?: number;
          page: string;
          position?: number;
          query: string;
        };
        Update: {
          clicks?: number;
          ctr?: number;
          date?: string;
          impressions?: number;
          page?: string;
          position?: number;
          query?: string;
        };
        Relationships: [];
      };
      health_consents: {
        Row: {
          granted_at: string;
          id: string;
          policy_version: string;
          purpose: string;
          user_id: string;
          withdrawn_at: string | null;
        };
        Insert: {
          granted_at?: string;
          id?: string;
          policy_version: string;
          purpose?: string;
          user_id: string;
          withdrawn_at?: string | null;
        };
        Update: {
          granted_at?: string;
          id?: string;
          policy_version?: string;
          purpose?: string;
          user_id?: string;
          withdrawn_at?: string | null;
        };
        Relationships: [];
      };
      medical_screenings: {
        Row: {
          answers_enc: string;
          key_id: string;
          melatonin_eligible: boolean;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          answers_enc: string;
          key_id: string;
          melatonin_eligible: boolean;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          answers_enc?: string;
          key_id?: string;
          melatonin_eligible?: boolean;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      newsletter_subscribers: {
        Row: {
          consent_at: string | null;
          consent_text_version: string | null;
          created_at: string;
          email: string;
          id: string;
          source: string | null;
          status: string;
          token_hash: string | null;
          unsubscribed_at: string | null;
        };
        Insert: {
          consent_at?: string | null;
          consent_text_version?: string | null;
          created_at?: string;
          email: string;
          id?: string;
          source?: string | null;
          status?: string;
          token_hash?: string | null;
          unsubscribed_at?: string | null;
        };
        Update: {
          consent_at?: string | null;
          consent_text_version?: string | null;
          created_at?: string;
          email?: string;
          id?: string;
          source?: string | null;
          status?: string;
          token_hash?: string | null;
          unsubscribed_at?: string | null;
        };
        Relationships: [];
      };
      promo_codes: {
        Row: {
          active: boolean;
          code_hmac: string;
          created_at: string;
          created_by: string | null;
          expires_at: string | null;
          id: string;
          offer: string;
          quota: number;
          redeemed_count: number;
        };
        Insert: {
          active?: boolean;
          code_hmac: string;
          created_at?: string;
          created_by?: string | null;
          expires_at?: string | null;
          id?: string;
          offer: string;
          quota: number;
          redeemed_count?: number;
        };
        Update: {
          active?: boolean;
          code_hmac?: string;
          created_at?: string;
          created_by?: string | null;
          expires_at?: string | null;
          id?: string;
          offer?: string;
          quota?: number;
          redeemed_count?: number;
        };
        Relationships: [];
      };
      promo_redemptions: {
        Row: {
          entitlement_id: string | null;
          id: string;
          promo_id: string;
          redeemed_at: string;
          user_id: string | null;
        };
        Insert: {
          entitlement_id?: string | null;
          id?: string;
          promo_id: string;
          redeemed_at?: string;
          user_id?: string | null;
        };
        Update: {
          entitlement_id?: string | null;
          id?: string;
          promo_id?: string;
          redeemed_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'promo_redemptions_entitlement_id_fkey';
            columns: ['entitlement_id'];
            isOneToOne: false;
            referencedRelation: 'entitlements';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'promo_redemptions_promo_id_fkey';
            columns: ['promo_id'];
            isOneToOne: false;
            referencedRelation: 'promo_codes';
            referencedColumns: ['id'];
          },
        ];
      };
      rate_limits: {
        Row: {
          count: number;
          key_hash: string;
          window_start: string;
        };
        Insert: {
          count?: number;
          key_hash: string;
          window_start: string;
        };
        Update: {
          count?: number;
          key_hash?: string;
          window_start?: string;
        };
        Relationships: [];
      };
      sleep_profiles: {
        Row: {
          key_id: string;
          payload_enc: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          key_id: string;
          payload_enc: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          key_id?: string;
          payload_enc?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      user_profiles: {
        Row: {
          birth_date: string | null;
          country: string | null;
          created_at: string;
          first_name: string | null;
          home_airport: string | null;
          last_name: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          birth_date?: string | null;
          country?: string | null;
          created_at?: string;
          first_name?: string | null;
          home_airport?: string | null;
          last_name?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          birth_date?: string | null;
          country?: string | null;
          created_at?: string;
          first_name?: string | null;
          home_airport?: string | null;
          last_name?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      stripe_events: {
        Row: {
          id: string;
          processed_at: string;
          type: string;
        };
        Insert: {
          id: string;
          processed_at?: string;
          type: string;
        };
        Update: {
          id?: string;
          processed_at?: string;
          type?: string;
        };
        Relationships: [];
      };
      trips: {
        Row: {
          created_at: string;
          delete_after: string | null;
          engine_version: string;
          entitlement_id: string | null;
          id: string;
          inputs_enc: string;
          key_id: string;
          plan_enc: string | null;
          route_summary: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          delete_after?: string | null;
          engine_version: string;
          entitlement_id?: string | null;
          id?: string;
          inputs_enc: string;
          key_id: string;
          plan_enc?: string | null;
          route_summary: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          delete_after?: string | null;
          engine_version?: string;
          entitlement_id?: string | null;
          id?: string;
          inputs_enc?: string;
          key_id?: string;
          plan_enc?: string | null;
          route_summary?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'trips_entitlement_id_fkey';
            columns: ['entitlement_id'];
            isOneToOne: false;
            referencedRelation: 'entitlements';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      admin_breakdown: {
        Args: { p_dim: string; p_from: string; p_to: string };
        Returns: { sessions: number; value: string }[];
      };
      admin_channels_daily: {
        Args: { p_from: string; p_to: string };
        Returns: { channel: string; day: string; sessions: number }[];
      };
      admin_daily: {
        Args: { p_from: string; p_to: string };
        Returns: {
          clicks: number;
          day: string;
          page_views: number;
          sessions: number;
          visitors: number;
        }[];
      };
      admin_entry_pages: {
        Args: { p_from: string; p_limit?: number; p_to: string };
        Returns: { path: string; sessions: number }[];
      };
      admin_journey: {
        Args: { p_from: string; p_to: string };
        Returns: {
          clicked: number;
          multi_page: number;
          sessions: number;
          viewed_login: number;
          viewed_plan: number;
          viewed_pricing: number;
        }[];
      };
      admin_kpis: {
        Args: { p_from: string; p_to: string };
        Returns: { clicks: number; page_views: number; sessions: number; visitors: number }[];
      };
      admin_sources: {
        Args: { p_from: string; p_to: string };
        Returns: { channel: string; sessions: number; source: string; visitors: number }[];
      };
      admin_top_clicks: {
        Args: { p_from: string; p_limit?: number; p_to: string };
        Returns: {
          clicks: number;
          label: string;
          path: string;
          target: string | null;
          visitors: number;
        }[];
      };
      admin_top_pages: {
        Args: { p_from: string; p_limit?: number; p_to: string };
        Returns: { path: string; views: number; visitors: number }[];
      };
      rate_limit_hit: {
        Args: { p_key_hash: string; p_limit: number; p_window_seconds: number };
        Returns: boolean;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
