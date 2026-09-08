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
