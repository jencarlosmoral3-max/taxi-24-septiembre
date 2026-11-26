
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "app_config": {
                  Row: {
                    "base_cents": number,"id": boolean,"min_fare_cents": number,"offer_ttl_s": number,"per_km_cents": number,"per_min_cents": number,"ride_ttl_s": number,"search_radius_m": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "base_cents": number,"id"?: boolean,"min_fare_cents": number,"offer_ttl_s"?: number,"per_km_cents": number,"per_min_cents": number,"ride_ttl_s": number,"search_radius_m": number,"updated_at"?: string
                  }
                  Update: {
                    "base_cents"?: number,"id"?: boolean,"min_fare_cents"?: number,"offer_ttl_s"?: number,"per_km_cents"?: number,"per_min_cents"?: number,"ride_ttl_s"?: number,"search_radius_m"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"config_audit": {
                  Row: {
                    "changed_at": string,"changed_by": string | null,"id": number,"new": Json | null,"old": Json | null
                  }
                  ComputedFields: never
                  Insert: {
                    "changed_at"?: string,"changed_by"?: string | null,"id"?: never,"new"?: Json | null,"old"?: Json | null
                  }
                  Update: {
                    "changed_at"?: string,"changed_by"?: string | null,"id"?: never,"new"?: Json | null,"old"?: Json | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "config_audit_changed_by_fkey"
      columns: ["changed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"driver_documents": {
                  Row: {
                    "created_at": string,"driver_id": string,"id": string,"reason": string | null,"reviewed_at": string | null,"reviewed_by": string | null,"status": Database["public"]['Enums']["document_status"],"storage_path": string,"type": Database["public"]['Enums']["document_type"]
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"driver_id": string,"id"?: string,"reason"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: Database["public"]['Enums']["document_status"],"storage_path": string,"type": Database["public"]['Enums']["document_type"]
                  }
                  Update: {
                    "created_at"?: string,"driver_id"?: string,"id"?: string,"reason"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: Database["public"]['Enums']["document_status"],"storage_path"?: string,"type"?: Database["public"]['Enums']["document_type"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "driver_documents_driver_id_fkey"
      columns: ["driver_id"]
isOneToOne: false
      referencedRelation: "drivers"
      referencedColumns: ["profile_id"]
    },{
      foreignKeyName: "driver_documents_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"driver_locations": {
                  Row: {
                    "driver_id": string,"heading": number | null,"is_online": boolean,"location": unknown,"speed": number | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "driver_id": string,"heading"?: number | null,"is_online"?: boolean,"location": unknown,"speed"?: number | null,"updated_at"?: string
                  }
                  Update: {
                    "driver_id"?: string,"heading"?: number | null,"is_online"?: boolean,"location"?: unknown,"speed"?: number | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "driver_locations_driver_id_fkey"
      columns: ["driver_id"]
isOneToOne: true
      referencedRelation: "drivers"
      referencedColumns: ["profile_id"]
    }
                  ]
                },"drivers": {
                  Row: {
                    "approved_at": string | null,"ci_number": string | null,"created_at": string,"license_number": string | null,"profile_id": string,"rejected_reason": string | null,"status": Database["public"]['Enums']["driver_status"],"union_member_number": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "approved_at"?: string | null,"ci_number"?: string | null,"created_at"?: string,"license_number"?: string | null,"profile_id": string,"rejected_reason"?: string | null,"status"?: Database["public"]['Enums']["driver_status"],"union_member_number"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "approved_at"?: string | null,"ci_number"?: string | null,"created_at"?: string,"license_number"?: string | null,"profile_id"?: string,"rejected_reason"?: string | null,"status"?: Database["public"]['Enums']["driver_status"],"union_member_number"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "drivers_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "avatar_path": string | null,"created_at": string,"deleted_at": string | null,"full_name": string | null,"id": string,"push_token": string | null,"rating_avg": number | null,"rating_count": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_path"?: string | null,"created_at"?: string,"deleted_at"?: string | null,"full_name"?: string | null,"id": string,"push_token"?: string | null,"rating_avg"?: number | null,"rating_count"?: number,"updated_at"?: string
                  }
                  Update: {
                    "avatar_path"?: string | null,"created_at"?: string,"deleted_at"?: string | null,"full_name"?: string | null,"id"?: string,"push_token"?: string | null,"rating_avg"?: number | null,"rating_count"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"ratings": {
                  Row: {
                    "comment": string | null,"created_at": string,"id": string,"ratee_id": string,"rater_id": string,"ride_id": string,"stars": number
                  }
                  ComputedFields: never
                  Insert: {
                    "comment"?: string | null,"created_at"?: string,"id"?: string,"ratee_id": string,"rater_id": string,"ride_id": string,"stars": number
                  }
                  Update: {
                    "comment"?: string | null,"created_at"?: string,"id"?: string,"ratee_id"?: string,"rater_id"?: string,"ride_id"?: string,"stars"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "ratings_ratee_id_fkey"
      columns: ["ratee_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ratings_rater_id_fkey"
      columns: ["rater_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ratings_ride_id_fkey"
      columns: ["ride_id"]
isOneToOne: false
      referencedRelation: "rides"
      referencedColumns: ["id"]
    }
                  ]
                },"ride_offers": {
                  Row: {
                    "created_at": string,"driver_id": string,"expires_at": string,"id": string,"price_cents": number,"ride_id": string,"status": Database["public"]['Enums']["offer_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"driver_id": string,"expires_at": string,"id"?: string,"price_cents": number,"ride_id": string,"status"?: Database["public"]['Enums']["offer_status"]
                  }
                  Update: {
                    "created_at"?: string,"driver_id"?: string,"expires_at"?: string,"id"?: string,"price_cents"?: number,"ride_id"?: string,"status"?: Database["public"]['Enums']["offer_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "ride_offers_driver_id_fkey"
      columns: ["driver_id"]
isOneToOne: false
      referencedRelation: "drivers"
      referencedColumns: ["profile_id"]
    },{
      foreignKeyName: "ride_offers_ride_id_fkey"
      columns: ["ride_id"]
isOneToOne: false
      referencedRelation: "rides"
      referencedColumns: ["id"]
    }
                  ]
                },"ride_track_points": {
                  Row: {
                    "location": unknown,"recorded_at": string,"ride_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "location": unknown,"recorded_at": string,"ride_id": string
                  }
                  Update: {
                    "location"?: unknown,"recorded_at"?: string,"ride_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "ride_track_points_ride_id_fkey"
      columns: ["ride_id"]
isOneToOne: false
      referencedRelation: "rides"
      referencedColumns: ["id"]
    }
                  ]
                },"rides": {
                  Row: {
                    "accepted_offer_id": string | null,"assigned_at": string | null,"cancel_reason": string | null,"cancelled_at": string | null,"comment": string | null,"completed_at": string | null,"created_at": string,"destination": unknown,"destination_text": string | null,"driver_arrived_at": string | null,"driver_id": string | null,"expires_at": string,"final_fare_cents": number | null,"id": string,"offered_fare_cents": number,"origin": unknown,"origin_text": string | null,"passenger_count": number,"passenger_id": string,"started_at": string | null,"status": Database["public"]['Enums']["ride_status"],"vehicle_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "accepted_offer_id"?: string | null,"assigned_at"?: string | null,"cancel_reason"?: string | null,"cancelled_at"?: string | null,"comment"?: string | null,"completed_at"?: string | null,"created_at"?: string,"destination": unknown,"destination_text"?: string | null,"driver_arrived_at"?: string | null,"driver_id"?: string | null,"expires_at": string,"final_fare_cents"?: number | null,"id"?: string,"offered_fare_cents": number,"origin": unknown,"origin_text"?: string | null,"passenger_count"?: number,"passenger_id": string,"started_at"?: string | null,"status"?: Database["public"]['Enums']["ride_status"],"vehicle_id"?: string | null
                  }
                  Update: {
                    "accepted_offer_id"?: string | null,"assigned_at"?: string | null,"cancel_reason"?: string | null,"cancelled_at"?: string | null,"comment"?: string | null,"completed_at"?: string | null,"created_at"?: string,"destination"?: unknown,"destination_text"?: string | null,"driver_arrived_at"?: string | null,"driver_id"?: string | null,"expires_at"?: string,"final_fare_cents"?: number | null,"id"?: string,"offered_fare_cents"?: number,"origin"?: unknown,"origin_text"?: string | null,"passenger_count"?: number,"passenger_id"?: string,"started_at"?: string | null,"status"?: Database["public"]['Enums']["ride_status"],"vehicle_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "rides_accepted_offer_fk"
      columns: ["accepted_offer_id"]
isOneToOne: false
      referencedRelation: "ride_offers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "rides_driver_id_fkey"
      columns: ["driver_id"]
isOneToOne: false
      referencedRelation: "drivers"
      referencedColumns: ["profile_id"]
    },{
      foreignKeyName: "rides_passenger_id_fkey"
      columns: ["passenger_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "rides_vehicle_id_fkey"
      columns: ["vehicle_id"]
isOneToOne: false
      referencedRelation: "vehicles"
      referencedColumns: ["id"]
    }
                  ]
                },"sos_events": {
                  Row: {
                    "client_event_id": string | null,"created_at": string,"handled_at": string | null,"handled_by": string | null,"id": string,"location": unknown,"ride_id": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "client_event_id"?: string | null,"created_at"?: string,"handled_at"?: string | null,"handled_by"?: string | null,"id"?: string,"location"?: unknown,"ride_id"?: string | null,"user_id": string
                  }
                  Update: {
                    "client_event_id"?: string | null,"created_at"?: string,"handled_at"?: string | null,"handled_by"?: string | null,"id"?: string,"location"?: unknown,"ride_id"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "sos_events_handled_by_fkey"
      columns: ["handled_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sos_events_ride_id_fkey"
      columns: ["ride_id"]
isOneToOne: false
      referencedRelation: "rides"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sos_events_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"vehicles": {
                  Row: {
                    "brand": string | null,"color": string | null,"created_at": string,"driver_id": string,"id": string,"model": string | null,"plate": string,"ruat": string | null,"soat_expires_at": string | null,"updated_at": string,"year": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "brand"?: string | null,"color"?: string | null,"created_at"?: string,"driver_id": string,"id"?: string,"model"?: string | null,"plate": string,"ruat"?: string | null,"soat_expires_at"?: string | null,"updated_at"?: string,"year"?: number | null
                  }
                  Update: {
                    "brand"?: string | null,"color"?: string | null,"created_at"?: string,"driver_id"?: string,"id"?: string,"model"?: string | null,"plate"?: string,"ruat"?: string | null,"soat_expires_at"?: string | null,"updated_at"?: string,"year"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "vehicles_driver_id_fkey"
      columns: ["driver_id"]
isOneToOne: false
      referencedRelation: "drivers"
      referencedColumns: ["profile_id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "accept_offer":
{ Args: { "p_offer_id": string }; Returns: string
                           },
"cancel_ride":
{ Args: { "p_reason"?: string,"p_ride_id": string }; Returns: undefined
                           },
"complete_ride":
{ Args: { "p_ride_id": string }; Returns: undefined
                           },
"create_ride":
{ Args: { "p_comment"?: string,"p_dest_lat": number,"p_dest_lng": number,"p_dest_text": string,"p_offered_fare_cents": number,"p_origin_lat": number,"p_origin_lng": number,"p_origin_text": string,"p_passenger_count"?: number }; Returns: string
                           },
"driver_arrived":
{ Args: { "p_ride_id": string }; Returns: undefined
                           },
"expire_stale":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"get_my_driver_application":
{ Args: Record<PropertyKey, never>; Returns: {
              "approved_at": string,"rejected_reason": string,"status": Database["public"]['Enums']["driver_status"],"union_member_number": string
            }[]
                           },
"get_my_phone":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"get_nearby_requests":
{ Args: Record<PropertyKey, never>; Returns: Json[]
                           },
"get_ride_contact":
{ Args: { "p_ride_id": string }; Returns: {
              "full_name": string,"phone": string
            }[]
                           },
"make_offer":
{ Args: { "p_price_cents": number,"p_ride_id": string }; Returns: string
                           },
"rate_ride":
{ Args: { "p_comment"?: string,"p_ride_id": string,"p_stars": number }; Returns: undefined
                           },
"set_my_phone":
{ Args: { "p_phone": string }; Returns: undefined
                           },
"start_ride":
{ Args: { "p_ride_id": string }; Returns: undefined
                           },
"trigger_sos":
{ Args: { "p_client_event_id": string,"p_lat": number,"p_lng": number,"p_ride_id"?: string }; Returns: string
                           },
"upsert_driver_location":
{ Args: { "p_heading"?: number,"p_is_online"?: boolean,"p_lat": number,"p_lng": number,"p_speed"?: number }; Returns: undefined
                           }
          }
          Enums: {
            "document_status": "pending"|"approved"|"rejected","document_type": "license"|"ci_front"|"ci_back"|"ruat"|"soat"|"vehicle_photo"|"selfie","driver_status": "pending"|"approved"|"suspended"|"rejected","offer_status": "active"|"accepted"|"rejected"|"expired"|"withdrawn","ride_status": "requested"|"assigned"|"driver_arrived"|"in_progress"|"completed"|"cancelled_passenger"|"cancelled_driver"|"expired"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "document_status": ["pending", "approved", "rejected"],"document_type": ["license", "ci_front", "ci_back", "ruat", "soat", "vehicle_photo", "selfie"],"driver_status": ["pending", "approved", "suspended", "rejected"],"offer_status": ["active", "accepted", "rejected", "expired", "withdrawn"],"ride_status": ["requested", "assigned", "driver_arrived", "in_progress", "completed", "cancelled_passenger", "cancelled_driver", "expired"]
          }
        }
} as const
