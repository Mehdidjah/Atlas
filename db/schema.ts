import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

export const oauthStates = sqliteTable(
  'oauth_states',
  {
    stateHash: text('state_hash').primaryKey(),
    userId: text('user_id').notNull(),
    workspaceId: text('workspace_id').notNull(),
    returnTo: text('return_to').notNull(),
    expiresAt: integer('expires_at').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [
    index('oauth_states_user_idx').on(table.userId),
    index('oauth_states_expiry_idx').on(table.expiresAt),
  ],
);

export const metaConnections = sqliteTable(
  'meta_connections',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    workspaceId: text('workspace_id').notNull(),
    metaUserId: text('meta_user_id').notNull(),
    metaUserName: text('meta_user_name'),
    tokenCiphertext: text('token_ciphertext').notNull(),
    tokenIv: text('token_iv').notNull(),
    tokenExpiresAt: integer('token_expires_at'),
    scopes: text('scopes').notNull(),
    status: text('status').notNull().default('active'),
    lastSyncedAt: integer('last_synced_at'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => [
    uniqueIndex('meta_connections_user_workspace_idx').on(
      table.userId,
      table.workspaceId,
    ),
    index('meta_connections_user_idx').on(table.userId),
  ],
);

export const metaAdAccounts = sqliteTable(
  'meta_ad_accounts',
  {
    id: text('id').primaryKey(),
    connectionId: text('connection_id')
      .notNull()
      .references(() => metaConnections.id, { onDelete: 'cascade' }),
    metaAccountId: text('meta_account_id').notNull(),
    accountId: text('account_id'),
    name: text('name').notNull(),
    accountStatus: integer('account_status'),
    currency: text('currency'),
    timezoneName: text('timezone_name'),
    businessId: text('business_id'),
    businessName: text('business_name'),
    selected: integer('selected', { mode: 'boolean' }).notNull().default(true),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => [
    uniqueIndex('meta_ad_accounts_connection_account_idx').on(
      table.connectionId,
      table.metaAccountId,
    ),
    index('meta_ad_accounts_connection_idx').on(table.connectionId),
    index('meta_ad_accounts_selected_idx').on(
      table.connectionId,
      table.selected,
    ),
  ],
);

// Aster identity is separate from Meta ad-account authorization.
export const authUsers = sqliteTable('auth_users', {
  id: text('id').primaryKey(),
  name: text('name'),
  email: text('email'), // Informational, intentionally not unique.
  defaultWorkspaceId: text('default_workspace_id').notNull(),
  createdAt: integer('created_at').notNull(),
});
export const authIdentities = sqliteTable(
  'auth_identities',
  {
    provider: text('provider').notNull(),
    subject: text('subject').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [
    uniqueIndex('auth_identity_subject_idx').on(table.provider, table.subject),
    index('auth_identity_user_idx').on(table.userId),
  ],
);
export const authWorkspaces = sqliteTable('auth_workspaces', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: integer('created_at').notNull(),
});
export const authWorkspaceMembers = sqliteTable(
  'auth_workspace_members',
  {
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => authWorkspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    role: text('role').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [
    uniqueIndex('auth_workspace_member_idx').on(
      table.workspaceId,
      table.userId,
    ),
    index('auth_workspace_user_idx').on(table.userId),
  ],
);
export const authSessions = sqliteTable(
  'auth_sessions',
  {
    tokenHash: text('token_hash').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    expiresAt: integer('expires_at').notNull(),
    createdAt: integer('created_at').notNull(),
    revokedAt: integer('revoked_at'),
  },
  (table) => [
    index('auth_session_expiry_idx').on(table.expiresAt),
    index('auth_session_user_idx').on(table.userId),
  ],
);
export const authOAuthStates = sqliteTable(
  'auth_oauth_states',
  {
    stateHash: text('state_hash').primaryKey(),
    browserHash: text('browser_hash').notNull(),
    provider: text('provider').notNull(),
    returnTo: text('return_to'),
    pkceVerifier: text('pkce_verifier').notNull(),
    expiresAt: integer('expires_at').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [index('auth_state_expiry_idx').on(table.expiresAt)],
);
