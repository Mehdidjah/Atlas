/// <reference types="@cloudflare/workers-types" />

export interface Env {
  AUTH_ORIGIN?: string;
  AUTH_GOOGLE_CLIENT_ID?: string;
  AUTH_GOOGLE_CLIENT_SECRET?: string;
  AUTH_FACEBOOK_APP_ID?: string;
  AUTH_FACEBOOK_APP_SECRET?: string;
  AUTH_FACEBOOK_GRAPH_VERSION?: string;
  AUTH_TRUST_HOST_HEADERS?: string;
  ASSETS: Fetcher;
  DB: D1Database;
  META_APP_ID?: string;
  META_APP_SECRET?: string;
  META_GRAPH_VERSION?: string;
  META_LOGIN_CONFIG_ID?: string;
  META_REDIRECT_URI?: string;
  META_TOKEN_ENCRYPTION_KEY?: string;
}

export interface AuthenticatedUser {
  source: 'session' | 'hosted';
  defaultWorkspaceId: string;
  id: string;
  email: string | null;
  name: string | null;
}

export interface MetaConfig {
  appId: string;
  appSecret: string;
  encryptionKey: string;
  graphVersion: string;
  loginConfigId?: string;
}

export interface MetaAdAccount {
  id: string;
  account_id?: string;
  name?: string;
  account_status?: number;
  currency?: string;
  timezone_name?: string;
  business?: {
    id?: string;
    name?: string;
  };
}

export interface MetaTokenDetails {
  accessToken: string;
  expiresAt: number | null;
  scopes: string[];
  userId: string;
}

export interface StoredConnection extends Record<string, unknown> {
  id: string;
  meta_user_id: string;
  meta_user_name: string | null;
  token_ciphertext: string;
  token_iv: string;
  token_expires_at: number | null;
  scopes: string;
  status: string;
  last_synced_at: number | null;
  created_at: number;
  updated_at: number;
}
