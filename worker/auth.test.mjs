import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { build } from 'esbuild';

const output = await build({
  stdin: {
    contents:
      "export * from './worker/auth-security'; export * from './worker/auth-store'; export * from './worker/auth-providers'; export * from './worker/auth'; export * from './worker/crypto';",
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
});
const api = await import(
  `data:text/javascript;base64,${Buffer.from(output.outputFiles[0].text).toString('base64')}`
);
function database() {
  const sql = new DatabaseSync(':memory:');
  sql.exec('PRAGMA foreign_keys = ON');
  sql.exec(readFileSync('drizzle/0001_aster_identity.sql', 'utf8'));
  const wrap = (text, values = []) => ({
    bind: (...args) => wrap(text, args),
    first: async () => sql.prepare(text).get(...values) ?? null,
    all: async () => ({ results: sql.prepare(text).all(...values) }),
    run: async () => sql.prepare(text).run(...values),
    execute: () => sql.prepare(text).run(...values),
  });
  return {
    sql,
    prepare: (text) => wrap(text),
    batch: async (statements) => {
      sql.exec('BEGIN');
      try {
        const results = statements.map((statement) => statement.execute());
        sql.exec('COMMIT');
        return results;
      } catch (error) {
        sql.exec('ROLLBACK');
        throw error;
      }
    },
  };
}
const configured = (DB) => ({
  DB,
  AUTH_ORIGIN: 'https://aster.example',
  AUTH_GOOGLE_CLIENT_ID: 'test-client',
  AUTH_GOOGLE_CLIENT_SECRET: 'test-only-placeholder',
});
test('redirect allowlist rejects all authority/encoding/path escape variants', () => {
  for (const value of [
    'https://evil.example',
    '//evil.example',
    '/\\evil.example',
    '/workspaces/ws/overview/../connections',
    '/workspaces/ws/overview%2f..',
    '/workspaces/ws/overview?x=%255c',
    '/workspaces/ws/overview#evil',
    '/workspaces/ws/overview\n',
    '/api/auth/google/start',
    '/workspaces/ws/connections/evil',
  ])
    assert.equal(api.safeReturnTo(value), null, value);
  const safe = '/workspaces/ws/performance?range=7d';
  assert.equal(api.safeReturnTo(safe), safe);
  assert.equal(api.authorizedReturnTo(safe, 'mine', ['ws', 'mine']), safe);
  assert.equal(
    api.authorizedReturnTo(safe, 'mine', ['mine']),
    '/workspaces/mine/connections',
  );
  assert.equal(
    api.authorizedReturnTo('/workspaces/demo/overview', 'mine', [
      'demo',
      'mine',
    ]),
    '/workspaces/mine/connections',
  );
});
test('secure cookies, duplicate rejection, opaque tokens and RFC7636 PKCE', async () => {
  assert.equal(
    api.cookie(api.SESSION_COOKIE, 'value', 600),
    '__Host-aster-session=value; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600',
  );
  assert.equal(
    api.readCookie(
      new Request('https://aster.example', { headers: { cookie: 'a=1; a=2' } }),
      'a',
    ),
    null,
  );
  assert.equal(api.opaqueToken(api.createOAuthState()), true);
  assert.equal(
    await api.pkceChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'),
    'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
  );
});
test('identity requires immutable subject and never falls back to email', () => {
  for (const provider of ['google', 'facebook'])
    for (const subject of [undefined, '', '   ', 123])
      assert.throws(() =>
        api.identityFromProfile(provider, {
          sub: subject,
          id: subject,
          email: 'same@example.test',
        }),
      );
  assert.equal(
    api.identityFromProfile('google', { sub: 'verified-subject' }).email,
    null,
  );
});
test('state requires correct browser/provider, expires, and consumes exactly once', async () => {
  const db = database();
  const insert = (hash, expiry) =>
    db.sql
      .prepare('INSERT INTO auth_oauth_states VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(hash, 'browser-hash', 'google', null, 'verifier', expiry, 1);
  insert('state-hash', 100);
  assert.equal(
    await api.consumeLoginState(
      db,
      'state-hash',
      'wrong-browser',
      'google',
      50,
    ),
    null,
  );
  assert.equal(
    await api.consumeLoginState(
      db,
      'state-hash',
      'browser-hash',
      'facebook',
      50,
    ),
    null,
  );
  assert.equal(
    (
      await api.consumeLoginState(
        db,
        'state-hash',
        'browser-hash',
        'google',
        50,
      )
    ).provider,
    'google',
  );
  assert.equal(
    await api.consumeLoginState(db, 'state-hash', 'browser-hash', 'google', 50),
    null,
  );
  insert('expired', 50);
  assert.equal(
    await api.consumeLoginState(db, 'expired', 'browser-hash', 'google', 50),
    null,
  );
  db.sql.close();
});
test('accounts do not link by email; sessions expire/revoke; membership is enforced', async () => {
  const db = database();
  const identity = {
    subject: 'subject-1',
    name: 'Test',
    email: 'same@example.test',
  };
  const google = await api.getOrCreateIdentity(db, 'google', identity, 1);
  assert.equal(
    (await api.getOrCreateIdentity(db, 'google', identity, 2)).id,
    google.id,
  );
  const facebook = await api.getOrCreateIdentity(db, 'facebook', identity, 2);
  assert.notEqual(google.id, facebook.id);
  const token = await api.createSession(db, google.id, 100, null);
  const hash = await api.sha256Hex(token);
  assert.equal((await api.sessionUser(db, hash, 101)).id, google.id);
  assert.equal(
    await api.sessionUser(db, hash, 100 + api.SESSION_TTL_SECONDS * 1000),
    null,
  );
  await api.createSession(db, google.id, 102, hash);
  assert.equal(await api.sessionUser(db, hash, 103), null);
  await api.requireWorkspaceAccess(
    { DB: db },
    { ...google, source: 'session' },
    google.defaultWorkspaceId,
  );
  await assert.rejects(
    api.requireWorkspaceAccess(
      { DB: db },
      { ...google, source: 'session' },
      facebook.defaultWorkspaceId,
    ),
    { code: 'workspace_forbidden' },
  );
  assert.equal(
    db.sql.prepare('SELECT COUNT(*) AS count FROM auth_users').get().count,
    2,
  );
  db.sql.close();
});
test('public spoofed headers ignored, capabilities honest, logout checks origin and revokes', async () => {
  const db = database();
  const headers = { 'oai-authenticated-user-id': 'spoofed' };
  assert.equal(
    await api.currentUser(new Request('https://aster.example', { headers }), {
      DB: db,
    }),
    null,
  );
  const capabilities = await api.handleAuthRequest(
    new Request('https://aster.example/api/auth/providers'),
    { DB: db },
  );
  assert.deepEqual(await capabilities.json(), {
    google: false,
    facebook: false,
    hosted: false,
  });
  await assert.rejects(
    api.handleAuthRequest(
      new Request('https://aster.example/api/auth/google/start'),
      { DB: db },
    ),
    { code: 'provider_unavailable' },
  );
  await assert.rejects(
    api.handleAuthRequest(
      new Request('https://aster.example/api/auth/logout', {
        method: 'POST',
        headers: { origin: 'https://evil.example' },
      }),
      { DB: db },
    ),
    { code: 'invalid_origin' },
  );
  const user = await api.getOrCreateIdentity(
    db,
    'google',
    { subject: 'logout-user', name: null, email: null },
    Date.now(),
  );
  const token = await api.createSession(db, user.id, Date.now(), null);
  const response = await api.handleAuthRequest(
    new Request('https://aster.example/api/auth/logout', {
      method: 'POST',
      headers: {
        origin: 'https://aster.example',
        cookie: `${api.SESSION_COOKIE}=${token}`,
      },
    }),
    { DB: db },
  );
  assert.equal(response.status, 204);
  assert.match(response.headers.get('set-cookie'), /Max-Age=0/);
  assert.equal(
    await api.sessionUser(db, await api.sha256Hex(token), Date.now()),
    null,
  );
  db.sql.close();
});
test('Google start sets browser binding and PKCE; cancelled callback consumes state', async () => {
  const db = database();
  const env = configured(db);
  const response = await api.handleAuthRequest(
    new Request(
      'https://aster.example/api/auth/google/start?returnTo=%2Fworkspaces%2Fdemo%2Foverview',
    ),
    env,
  );
  const location = new URL(response.headers.get('location'));
  assert.equal(location.origin, 'https://accounts.google.com');
  assert.equal(location.searchParams.get('code_challenge_method'), 'S256');
  assert.equal(location.searchParams.has('client_secret'), false);
  const binding = response.headers.get('set-cookie').split(';')[0];
  const callback = new Request(
    `https://aster.example/api/auth/google/callback?${new URLSearchParams({ state: location.searchParams.get('state'), error: 'access_denied' })}`,
    { headers: { cookie: binding } },
  );
  const cancelled = await api.handleAuthRequest(callback, env);
  assert.match(cancelled.headers.get('location'), /authError=cancelled/);
  const replay = await api.handleAuthRequest(callback, env);
  assert.match(replay.headers.get('location'), /authError=invalid_state/);
  db.sql.close();
});
test('Google verified-UserInfo callback creates personal workspace/session, then replay fails', async () => {
  const db = database();
  const env = configured(db);
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (input, init) => {
    const target =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    calls.push(target);
    if (target === 'https://oauth2.googleapis.com/token') {
      assert.equal(init.method, 'POST');
      assert.ok(new URLSearchParams(init.body).get('code_verifier'));
      return Response.json({
        access_token: 'unit-test-access-token',
        token_type: 'Bearer',
        expires_in: 3600,
        id_token: 'intentionally-not-trusted',
      });
    }
    assert.equal(target, 'https://openidconnect.googleapis.com/v1/userinfo');
    assert.equal(init.headers.Authorization, 'Bearer unit-test-access-token');
    return Response.json({
      sub: 'verified-google-subject',
      name: 'Test member',
      email: 'test@example.test',
    });
  };
  try {
    const start = await api.handleAuthRequest(
      new Request(
        'https://aster.example/api/auth/google/start?returnTo=%2Fworkspaces%2Fdemo%2Foverview',
      ),
      env,
    );
    const state = new URL(start.headers.get('location')).searchParams.get(
      'state',
    );
    const callback = new Request(
      `https://aster.example/api/auth/google/callback?${new URLSearchParams({ state, code: 'test-only-code' })}`,
      { headers: { cookie: start.headers.get('set-cookie').split(';')[0] } },
    );
    const success = await api.handleAuthRequest(callback, env);
    assert.match(
      success.headers.get('location'),
      /^\/workspaces\/ws_[a-z0-9-]+\/connections$/,
    );
    const sessionCookie = success.headers
      .getSetCookie()
      .find((value) => value.startsWith(api.SESSION_COOKIE))
      .split(';')[0];
    const session = await api.handleAuthRequest(
      new Request('https://aster.example/api/auth/session', {
        headers: { cookie: sessionCookie },
      }),
      env,
    );
    const body = await session.json();
    assert.equal(body.user.name, 'Test member');
    assert.equal(body.workspaces.length, 1);
    assert.equal(body.workspaces[0].role, 'owner');
    assert.equal(body.user.defaultWorkspaceId, body.workspaces[0].id);
    assert.equal(calls.length, 2);
    assert.match(
      (await api.handleAuthRequest(callback, env)).headers.get('location'),
      /invalid_state/,
    );
  } finally {
    globalThis.fetch = originalFetch;
    db.sql.close();
  }
});
test('Facebook inspection rejects wrong app and mismatched immutable identity', async () => {
  const originalFetch = globalThis.fetch;
  const config = {
    provider: 'facebook',
    clientId: 'test-app',
    clientSecret: 'test-only-placeholder',
    redirectUri: 'https://aster.example/api/auth/facebook/callback',
    graphVersion: 'v26.0',
  };
  let appId = 'wrong-app';
  globalThis.fetch = async (input) => {
    const path = new URL(input).pathname;
    if (path.endsWith('/oauth/access_token'))
      return Response.json({
        access_token: 'test-token',
        token_type: 'bearer',
        expires_in: 3600,
      });
    if (path.endsWith('/debug_token'))
      return Response.json({
        data: {
          is_valid: true,
          app_id: appId,
          user_id: 'subject',
          expires_at: Date.now() / 1000 + 3600,
        },
      });
    return Response.json({ id: 'different-subject' });
  };
  try {
    await assert.rejects(api.exchangeIdentity(config, 'test-code', 'unused'), {
      code: 'provider_response_invalid',
    });
    appId = 'test-app';
    await assert.rejects(api.exchangeIdentity(config, 'test-code', 'unused'), {
      code: 'provider_response_invalid',
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
