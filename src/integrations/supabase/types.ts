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
      bookings: {
        Row: {
          booking_date: string | null
          booking_status: string | null
          bus_id: string
          co2_saved: number | null
          created_at: string | null
          fare: number
          id: string
          payment_method: string | null
          payment_status: string | null
          route_id: string
          seat_no: number | null
          travel_date: string | null
          user_id: string
        }
        Insert: {
          booking_date?: string | null
          booking_status?: string | null
          bus_id: string
          co2_saved?: number | null
          created_at?: string | null
          fare: number
          id?: string
          payment_method?: string | null
          payment_status?: string | null
          route_id: string
          seat_no?: number | null
          travel_date?: string | null
          user_id: string
        }
        Update: {
          booking_date?: string | null
          booking_status?: string | null
          bus_id?: string
          co2_saved?: number | null
          created_at?: string | null
          fare?: number
          id?: string
          payment_method?: string | null
          payment_status?: string | null
          route_id?: string
          seat_no?: number | null
          travel_date?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_bus_id_fkey"
            columns: ["bus_id"]
            isOneToOne: false
            referencedRelation: "buses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      buses: {
        Row: {
          bus_number: string
          capacity: number | null
          created_at: string | null
          current_location: Json | null
          driver_id: string | null
          id: string
          route_id: string | null
          status: string | null
          supervisor_id: string | null
          updated_at: string | null
        }
        Insert: {
          bus_number: string
          capacity?: number | null
          created_at?: string | null
          current_location?: Json | null
          driver_id?: string | null
          id?: string
          route_id?: string | null
          status?: string | null
          supervisor_id?: string | null
          updated_at?: string | null
        }
        Update: {
          bus_number?: string
          capacity?: number | null
          created_at?: string | null
          current_location?: Json | null
          driver_id?: string | null
          id?: string
          route_id?: string | null
          status?: string | null
          supervisor_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "buses_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      nfc_logs: {
        Row: {
          bus_id: string
          card_id: string
          co2_saved: number | null
          created_at: string | null
          distance: number | null
          fare: number | null
          id: string
          supervisor_id: string | null
          tap_in_location: Json | null
          tap_in_time: string | null
          tap_out_location: Json | null
          tap_out_time: string | null
          user_id: string | null
        }
        Insert: {
          bus_id: string
          card_id: string
          co2_saved?: number | null
          created_at?: string | null
          distance?: number | null
          fare?: number | null
          id?: string
          supervisor_id?: string | null
          tap_in_location?: Json | null
          tap_in_time?: string | null
          tap_out_location?: Json | null
          tap_out_time?: string | null
          user_id?: string | null
        }
        Update: {
          bus_id?: string
          card_id?: string
          co2_saved?: number | null
          created_at?: string | null
          distance?: number | null
          fare?: number | null
          id?: string
          supervisor_id?: string | null
          tap_in_location?: Json | null
          tap_in_time?: string | null
          tap_out_location?: Json | null
          tap_out_time?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nfc_logs_bus_id_fkey"
            columns: ["bus_id"]
            isOneToOne: false
            referencedRelation: "buses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          card_balance: number | null
          card_id: string | null
          created_at: string | null
          full_name: string
          id: string
          phone: string | null
          points: number | null
          total_co2_saved: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          card_balance?: number | null
          card_id?: string | null
          created_at?: string | null
          full_name: string
          id?: string
          phone?: string | null
          points?: number | null
          total_co2_saved?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          card_balance?: number | null
          card_id?: string | null
          created_at?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          points?: number | null
          total_co2_saved?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      reward_redemptions: {
        Row: {
          created_at: string | null
          id: string
          points_spent: number
          reward_id: string
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          points_spent: number
          reward_id: string
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          points_spent?: number
          reward_id?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_redemptions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      rewards: {
        Row: {
          active: boolean | null
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          points_required: number
        }
        Insert: {
          active?: boolean | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          points_required: number
        }
        Update: {
          active?: boolean | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          points_required?: number
        }
        Relationships: []
      }
      routes: {
        Row: {
          active: boolean | null
          base_fare: number | null
          created_at: string | null
          distance: number
          end_time: string | null
          fare_per_km: number | null
          id: string
          name: string
          start_time: string | null
          stops: Json
        }
        Insert: {
          active?: boolean | null
          base_fare?: number | null
          created_at?: string | null
          distance: number
          end_time?: string | null
          fare_per_km?: number | null
          id?: string
          name: string
          start_time?: string | null
          stops: Json
        }
        Update: {
          active?: boolean | null
          base_fare?: number | null
          created_at?: string | null
          distance?: number
          end_time?: string | null
          fare_per_km?: number | null
          id?: string
          name?: string
          start_time?: string | null
          stops?: Json
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string | null
          description: string | null
          id: string
          payment_method: string | null
          reference_id: string | null
          status: string | null
          transaction_type: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          description?: string | null
          id?: string
          payment_method?: string | null
          reference_id?: string | null
          status?: string | null
          transaction_type?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          id?: string
          payment_method?: string | null
          reference_id?: string | null
          status?: string | null
          transaction_type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      trips: {
        Row: {
          bus_id: string
          created_at: string | null
          distance_km: number | null
          driver_id: string
          end_location: Json | null
          end_time: string | null
          id: string
          passengers_count: number | null
          route_id: string
          start_location: Json | null
          start_time: string
          status: string
        }
        Insert: {
          bus_id: string
          created_at?: string | null
          distance_km?: number | null
          driver_id: string
          end_location?: Json | null
          end_time?: string | null
          id?: string
          passengers_count?: number | null
          route_id: string
          start_location?: Json | null
          start_time?: string
          status?: string
        }
        Update: {
          bus_id?: string
          created_at?: string | null
          distance_km?: number | null
          driver_id?: string
          end_location?: Json | null
          end_time?: string | null
          id?: string
          passengers_count?: number | null
          route_id?: string
          start_location?: Json | null
          start_time?: string
          status?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user" | "driver" | "supervisor"
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
      app_role: ["admin", "user", "driver", "supervisor"],
    },
  },
} as const
