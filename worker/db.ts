/// <reference types="@cloudflare/workers-types" />

import type { MetaAdAccount, StoredConnection } from './types';

interface OAuthStateRow extends Record<string, unknown> {
  user_id: string;
  workspace_id: string;
  return_to: string;
  expires_at: number;
}

interface AccountSelectionRow extends Record<string, unknown> {
  meta_account_id: string;
  selected: number;
}

interface PublicAccountRow extends Record<string, unknown> {
  meta_account_id: string;
  account_id: string | null;
  name: string;
  account_status: number | null;
  currency: string | null;
  timezone_name: string | null;
  business_id: string | null;
  business_name: string | null;
  selected: number;
}

export const pruneExpiredOAuthStates = (db: D1Database, now: number) =>
  db.prepare('DELETE FROM oauth_states WHERE expires_at <= ?').bind(now).run();

export const insertOAuthState = (
  db: D1Database,
  input: {
    stateHash: string;
    userId: string;
    workspaceId: string;
    returnTo: string;
    expiresAt: number;
    createdAt: number;
  },
) =>
  db
    .prepare(
      `INSERT INTO oauth_states
        (state_hash, user_id, workspace_id, return_to, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      input.stateHash,
      input.userId,
      input.workspaceId,
      input.returnTo,
      input.expiresAt,
      input.createdAt,
    )
    .run();

export const consumeOAuthState = (
  db: D1Database,
  stateHash: string,
  userId: string,
  now: number,
) =>
  db
    .prepare(
      `DELETE FROM oauth_states
       WHERE state_hash = ? AND user_id = ? AND expires_at > ?
       RETURNING user_id, workspace_id, return_to, expires_at`,
    )
    .bind(stateHash, userId, now)
    .first<OAuthStateRow>();

export const getStoredConnection = (
  db: D1Database,
  userId: string,
  workspaceId: string,
) =>
  db
    .prepare(
      `SELECT id, meta_user_id, meta_user_name, token_ciphertext, token_iv,
              token_expires_at, scopes, status, last_synced_at, created_at,
              updated_at
       FROM meta_connections
       WHERE user_id = ? AND workspace_id = ?`,
    )
    .bind(userId, workspaceId)
    .first<StoredConnection>();

export const getPublicAccounts = async (
  db: D1Database,
  connectionId: string,
) => {
  const result = await db
    .prepare(
      `SELECT meta_account_id, account_id, name, account_status, currency,
              timezone_name, business_id, business_name, selected
       FROM meta_ad_accounts
       WHERE connection_id = ?
       ORDER BY selected DESC, name COLLATE NOCASE ASC`,
    )
    .bind(connectionId)
    .all<PublicAccountRow>();
  return result.results;
};

const replaceAccounts = async (
  db: D1Database,
  connectionId: string,
  accounts: MetaAdAccount[],
  now: number,
) => {
  const priorResult = await db
    .prepare(
      `SELECT meta_account_id, selected
       FROM meta_ad_accounts
       WHERE connection_id = ?`,
    )
    .bind(connectionId)
    .all<AccountSelectionRow>();
  const priorSelections = new Map(
    priorResult.results.map((row) => [row.meta_account_id, row.selected]),
  );
  const incomingIds = new Set(accounts.map((account) => account.id));

  const statements = accounts.map((account) =>
    db
      .prepare(
        `INSERT INTO meta_ad_accounts
          (id, connection_id, meta_account_id, account_id, name,
           account_status, currency, timezone_name, business_id,
           business_name, selected, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(connection_id, meta_account_id) DO UPDATE SET
           account_id = excluded.account_id,
           name = excluded.name,
           account_status = excluded.account_status,
           currency = excluded.currency,
           timezone_name = excluded.timezone_name,
           business_id = excluded.business_id,
           business_name = excluded.business_name,
           updated_at = excluded.updated_at`,
      )
      .bind(
        crypto.randomUUID(),
        connectionId,
        account.id,
        account.account_id ?? null,
        account.name?.trim() || account.account_id || account.id,
        account.account_status ?? null,
        account.currency ?? null,
        account.timezone_name ?? null,
        account.business?.id ?? null,
        account.business?.name ?? null,
        priorSelections.get(account.id) ?? 1,
        now,
        now,
      ),
  );
  for (let start = 0; start < statements.length; start += 75) {
    await db.batch(statements.slice(start, start + 75));
  }

  const removed = priorResult.results
    .filter((row) => !incomingIds.has(row.meta_account_id))
    .map((row) =>
      db
        .prepare(
          `DELETE FROM meta_ad_accounts
           WHERE connection_id = ? AND meta_account_id = ?`,
        )
        .bind(connectionId, row.meta_account_id),
    );
  for (let start = 0; start < removed.length; start += 75) {
    await db.batch(removed.slice(start, start + 75));
  }
};

export const saveMetaConnection = async (
  db: D1Database,
  input: {
    userId: string;
    workspaceId: string;
    metaUserId: string;
    metaUserName: string | null;
    tokenCiphertext: string;
    tokenIv: string;
    tokenExpiresAt: number | null;
    scopes: string[];
    accounts: MetaAdAccount[];
    now: number;
  },
) => {
  const proposedId = crypto.randomUUID();
  const connection = await db
    .prepare(
      `INSERT INTO meta_connections
        (id, user_id, workspace_id, meta_user_id, meta_user_name,
         token_ciphertext, token_iv, token_expires_at, scopes, status,
         last_synced_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)
       ON CONFLICT(user_id, workspace_id) DO UPDATE SET
         meta_user_id = excluded.meta_user_id,
         meta_user_name = excluded.meta_user_name,
         token_ciphertext = excluded.token_ciphertext,
         token_iv = excluded.token_iv,
         token_expires_at = excluded.token_expires_at,
         scopes = excluded.scopes,
         status = 'active',
         last_synced_at = excluded.last_synced_at,
         updated_at = excluded.updated_at
       RETURNING id`,
    )
    .bind(
      proposedId,
      input.userId,
      input.workspaceId,
      input.metaUserId,
      input.metaUserName,
      input.tokenCiphertext,
      input.tokenIv,
      input.tokenExpiresAt,
      JSON.stringify(input.scopes),
      input.now,
      input.now,
      input.now,
    )
    .first<{ id: string }>();
  if (!connection) throw new Error('Failed to persist the Meta connection.');
  await replaceAccounts(db, connection.id, input.accounts, input.now);
  return connection.id;
};

export const setSelectedAccounts = async (
  db: D1Database,
  connectionId: string,
  accountIds: string[],
  now: number,
) => {
  if (!accountIds.length) {
    return db
      .prepare(
        `UPDATE meta_ad_accounts
         SET selected = 0, updated_at = ?
         WHERE connection_id = ?`,
      )
      .bind(now, connectionId)
      .run();
  }
  const placeholders = accountIds.map(() => '?').join(', ');
  return db
    .prepare(
      `UPDATE meta_ad_accounts
       SET selected = CASE WHEN meta_account_id IN (${placeholders}) THEN 1 ELSE 0 END,
           updated_at = ?
       WHERE connection_id = ?`,
    )
    .bind(...accountIds, now, connectionId)
    .run();
};

export const deleteMetaConnection = (
  db: D1Database,
  userId: string,
  workspaceId: string,
) =>
  db
    .prepare(
      'DELETE FROM meta_connections WHERE user_id = ? AND workspace_id = ?',
    )
    .bind(userId, workspaceId)
    .run();
