export type UserRole = "client" | "admin";
export type GenerationStatus = "queued" | "running" | "succeeded" | "failed";
export type AssetKind =
  | "master_background"
  | "splash"
  | "button_preview"
  | "thumbnail"
  | "download_package";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface UserProfile {
  id: string;
  client_profile_id: string | null;
  role: UserRole;
  email: string;
  created_at: string;
}

export interface GenerationLimit {
  client_profile_id: string;
  max_generations: number | null;
  used_generations: number;
  updated_at: string;
}
