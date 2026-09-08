import { createOAuthState, sha256Hex } from './crypto';
import { SESSION_TTL_SECONDS, type IdentityProvider } from './auth-security';
import type { ProviderIdentity } from './auth-providers';

export interface LocalUser {
  id: string;
  name: string | null;
  email: string | null;
  defaultWorkspaceId: string;
}
export interface WorkspaceMembership {
  id: string;
  name: string;
  role: string;
}
export interface LoginState {
  provider: IdentityProvider;
  return_to: string | null;
  pkce_verifier: string;
}
export const consumeLoginState = (
  db: D1Database,
  stateHash: string,
  browserHash: string,
  provider: IdentityProvider,
  now: number,
) =>
  db
    .prepare(
      `DELETE FROM auth_oauth_states WHERE state_hash = ? AND browser_hash = ? AND provider = ? AND expires_at > ? RETURNING provider, return_to, pkce_verifier`,
    )
    .bind(stateHash, browserHash, provider, now)
    .first<LoginState>();
export const memberships = async (db: D1Database, userId: string) =>
  (
    await db
      .prepare(
        `SELECT w.id, w.name, m.role FROM auth_workspace_members m JOIN auth_workspaces w ON w.id = m.workspace_id WHERE m.user_id = ? ORDER BY w.created_at, w.id`,
      )
      .bind(userId)
      .all<WorkspaceMembership>()
  ).results;
const identityUser = (
  db: D1Database,
  provider: IdentityProvider,
  subject: string,
) =>
  db
    .prepare(
      `SELECT u.id, u.name, u.email, u.default_workspace_id AS defaultWorkspaceId FROM auth_users u JOIN auth_identities i ON i.user_id = u.id WHERE i.provider = ? AND i.subject = ?`,
    )
    .bind(provider, subject)
    .first<LocalUser>();
export const getOrCreateIdentity = async (
  db: D1Database,
  provider: IdentityProvider,
  identity: ProviderIdentity,
  now: number,
): Promise<LocalUser> => {
  const existing = await identityUser(db, provider, identity.subject);
  if (existing) return existing;
  const id = `usr_${crypto.randomUUID()}`;
  const workspaceId = `ws_${crypto.randomUUID()}`;
  try {
    // D1 batch is transactional. The unique provider/subject key arbitrates races;
    // a competing registration rolls back the entire new user/workspace batch.
    await db.batch([
      db
        .prepare(
          'INSERT INTO auth_users (id, name, email, default_workspace_id, created_at) VALUES (?, ?, ?, ?, ?)',
        )
        .bind(id, identity.name, identity.email, workspaceId, now),
      db
        .prepare(
          'INSERT INTO auth_identities (provider, subject, user_id, created_at) VALUES (?, ?, ?, ?)',
        )
        .bind(provider, identity.subject, id, now),
      db
        .prepare(
          'INSERT INTO auth_workspaces (id, name, created_at) VALUES (?, ?, ?)',
        )
        .bind(workspaceId, 'Personal workspace', now),
      db
        .prepare(
          'INSERT INTO auth_workspace_members (workspace_id, user_id, role, created_at) VALUES (?, ?, ?, ?)',
        )
        .bind(workspaceId, id, 'owner', now),
    ]);
  } catch {
    const winner = await identityUser(db, provider, identity.subject);
    if (winner) return winner;
    throw new Error(
      'Could not create account. Check authentication migrations.',
    );
  }
  return {
    id,
    name: identity.name,
    email: identity.email,
    defaultWorkspaceId: workspaceId,
  };
};
export const createSession = async (
  db: D1Database,
  userId: string,
  now: number,
  previousHash: string | null,
) => {
  const token = createOAuthState();
  const statements = [
    db
      .prepare(
        'INSERT INTO auth_sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)',
      )
      .bind(
        await sha256Hex(token),
        userId,
        now + SESSION_TTL_SECONDS * 1000,
        now,
      ),
  ];
  if (previousHash)
    statements.push(
      db
        .prepare('UPDATE auth_sessions SET revoked_at = ? WHERE token_hash = ?')
        .bind(now, previousHash),
    );
  await db.batch(statements);
  return token;
};
export const sessionUser = (db: D1Database, tokenHash: string, now: number) =>
  db
    .prepare(
      `SELECT u.id, u.name, u.email, u.default_workspace_id AS defaultWorkspaceId FROM auth_sessions s JOIN auth_users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ? AND s.revoked_at IS NULL`,
    )
    .bind(tokenHash, now)
    .first<LocalUser>();
