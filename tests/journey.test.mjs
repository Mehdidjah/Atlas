import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const bundle = await build({
  stdin: {
    contents:
      "export * from './src/lib/workspace-journey'; export * from './src/features/home/conversation-store'; export { resolveWorkspaceDataMode } from './src/lib/workspaces';",
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
});
const api = await import(
  `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`
);
const now = Date.UTC(2026, 8, 9, 10, 25);
const session = {
  user: {
    id: 'ux-member',
    name: 'Aster Test Member',
    email: null,
    defaultWorkspaceId: 'owned-workspace',
  },
  workspaces: [
    { id: 'owned-workspace', name: 'My advertising workspace', role: 'owner' },
  ],
};
const account = {
  metaAccountId: 'act_728593461',
  accountId: '728593461',
  name: 'Example shop advertising',
  accountStatus: 1,
  currency: 'USD',
  timezoneName: 'America/New_York',
  businessId: null,
  businessName: null,
  selected: false,
};
const active = {
  configured: true,
  redirectUri: 'https://aster.example/api/meta/callback',
  requiredPermissions: ['ads_read'],
  connection: {
    id: 'connection-ux',
    metaUserId: '681294735',
    metaUserName: 'Example Member',
    status: 'active',
    scopes: ['ads_read'],
    tokenExpiresAt: now + 60_000,
    lastSyncedAt: null,
    connectedAt: now - 120_000,
    updatedAt: now,
  },
  accounts: [account],
};
const ready = { ...active, accounts: [{ ...account, selected: true }] };
const journey = (patch = {}) =>
  api.deriveWorkspaceJourney({
    workspaceId: 'owned-workspace',
    session,
    meta: ready,
    now,
    ...patch,
  });
const guest = () =>
  journey({
    workspaceId: 'demo',
    session: { user: null, workspaces: [] },
    meta: undefined,
  });

test('anonymous users create Aster identity before authorizing Meta', () => {
  const value = guest();
  assert.equal(value.phase, 'sign-in');
  assert.equal(value.action.route.to, '/sign-up');
  assert.equal(value.signedIn, false);
  assert.equal(value.steps[0].current, true);
  assert.equal(value.metaReady, false);
  // Stale Meta data is not proof of a signed-in Aster identity.
  assert.equal(
    journey({ session: { user: null, workspaces: [] } }).metaReady,
    false,
  );
});

test('account errors and expired sessions never look like completed account setup', () => {
  const failed = journey({ sessionFailed: true });
  assert.equal(failed.phase, 'account-error');
  assert.equal(failed.signedIn, false);
  assert.equal(failed.steps[0].complete, false);
  const expired = journey({
    metaAuthRequired: true,
    metaFailed: true,
    metaErrorCode: 'authentication_required',
  });
  assert.equal(expired.action.route.to, '/sign-in');
  assert.match(expired.action.label, /Sign in/);
  assert.equal(expired.metaReady, false);
});

test('loading is explicit and cannot mark a connection ready', () => {
  const identity = journey({
    session: undefined,
    sessionPending: true,
    meta: undefined,
  });
  assert.equal(identity.phase, 'checking');
  assert.equal(identity.loading, true);
  const meta = journey({ meta: undefined, metaPending: true });
  assert.equal(meta.phase, 'checking-meta');
  assert.equal(meta.loading, true);
});

test('unconfigured, disconnected, expired and failed Meta states have distinct next actions', () => {
  assert.equal(
    journey({ meta: { ...active, configured: false } }).phase,
    'meta-unavailable',
  );
  assert.equal(
    journey({ meta: { ...active, connection: null, accounts: [] } }).phase,
    'connect-meta',
  );
  assert.equal(
    journey({
      meta: {
        ...ready,
        connection: { ...ready.connection, tokenExpiresAt: now - 1 },
      },
    }).phase,
    'reconnect-meta',
  );
  assert.equal(
    journey({ metaFailed: true, metaErrorCode: 'network_error' }).phase,
    'meta-error',
  );
  assert.equal(
    journey({ metaFailed: true, metaErrorCode: 'network_error' }).metaReady,
    false,
  );
});

test('authorization, accessible accounts and saved selection are different steps', () => {
  assert.equal(
    journey({ meta: { ...active, accounts: [] } }).phase,
    'no-accounts',
  );
  const unselected = journey({ meta: active });
  assert.equal(unselected.phase, 'choose-accounts');
  assert.equal(unselected.steps[1].complete, false);
  const selected = journey();
  assert.equal(selected.phase, 'campaigns');
  assert.equal(selected.steps[1].complete, true);
  assert.equal(
    selected.action.route.to,
    '/workspaces/$workspaceId/performance',
  );
});

test('saved selection never implies live reporting, eligible spend, publishing or live AI', () => {
  const value = journey({
    meta: {
      ...ready,
      accounts: [{ ...account, selected: true, accountStatus: 2 }],
    },
  });
  assert.equal(value.metaReady, true); // selection only, including historical read-only accounts
  assert.deepEqual(value.capabilities, {
    liveReporting: false,
    livePublishing: false,
    liveAi: false,
  });
  assert.match(value.action.detail, /not enabled/);
  assert.equal(value.steps[2].complete, false);
});

test('demo setup uses the real personal workspace without moving sample planning there', () => {
  const value = journey({ workspaceId: 'demo' });
  assert.equal(value.connectionWorkspaceId, 'owned-workspace');
  assert.equal(value.routes.connection.params.workspaceId, 'owned-workspace');
  const planning = { ...value, dataWorkspaceId: 'demo' };
  assert.equal(
    api.assistantNextAction('meta-connect', planning).route.params.workspaceId,
    'owned-workspace',
  );
  assert.equal(
    api.assistantNextAction('campaign-planning', planning).route.params
      .workspaceId,
    'demo',
  );
});

test('planning and budget help remain usable in the demo without sign-in or metrics', () => {
  const planning = { ...guest(), dataWorkspaceId: 'demo' };
  for (const intent of ['campaign-planning', 'budget', 'publishing']) {
    const action = api.assistantNextAction(intent, planning);
    assert.equal(
      action.route.to,
      '/workspaces/$workspaceId/performance/launch',
    );
  }
  const response = api.groundedReply(
    'Help me plan my first campaign',
    undefined,
    '',
    planning,
  );
  assert.match(response, /objective/i);
  assert.match(response, /not a live|demo|deterministic/i);
});

test('setup guidance does not prepend unrelated sample performance or promise live access', () => {
  const response = api.groundedReply(
    'How do I connect Meta?',
    undefined,
    '',
    guest(),
  );
  assert.doesNotMatch(response, /70\.2|ROAS|spend,.*revenue/i);
  assert.match(response, /Aster|Google|Facebook/);
  const action = api.assistantNextAction('meta-connect', guest());
  assert.equal(action.route.to, '/sign-up');
});

test('assistant intent routing distinguishes connection, selection, planning and execution', () => {
  const cases = [
    ['How do I sign in to Aster?', 'identity'],
    ['How do I connect Meta?', 'meta-connect'],
    ['Which ad account should I select?', 'account-selection'],
    ['What permissions does Aster need?', 'permissions'],
    ['Plan my first campaign', 'campaign-planning'],
    ['Explain the sample performance', 'performance'],
    ['Review my budget safely', 'budget'],
    ['Publish my Meta campaign now', 'publishing'],
    ['Can you pause this campaign?', 'publishing'],
  ];
  for (const [prompt, expected] of cases)
    assert.equal(api.classifyAssistantIntent(prompt), expected, prompt);
});

test('only a completed response with matching user provenance offers a next action', () => {
  const planning = { ...guest(), dataWorkspaceId: 'demo' };
  const base = { createdAt: '2026-09-09T10:25:00Z', status: 'sent' };
  const messages = [
    {
      ...base,
      id: 'publish-question',
      role: 'user',
      content: 'Publish this campaign',
    },
    { ...base, id: 'setup-question', role: 'user', content: 'Connect Meta' },
    {
      ...base,
      id: 'answer',
      role: 'assistant',
      content: 'Draft review only.',
      replyToId: 'publish-question',
    },
  ];
  assert.equal(
    api.assistantMessageAction(messages, planning).route.to,
    '/workspaces/$workspaceId/performance/launch',
  );
  assert.equal(
    api.assistantMessageAction(
      [...messages.slice(0, -1), { ...messages.at(-1), status: 'failed' }],
      planning,
    ),
    undefined,
  );
  assert.equal(
    api.assistantMessageAction(
      [
        ...messages.slice(0, -1),
        { ...messages.at(-1), replyToId: 'missing-question' },
      ],
      planning,
    ),
    undefined,
  );
});

test('Home and Campaigns share sample opt-in rules without polluting customer workspaces', () => {
  for (const workspaceId of ['demo', 'north', 'studio']) {
    assert.equal(api.resolveWorkspaceDataMode(workspaceId), 'populated');
    assert.equal(api.resolveWorkspaceDataMode(workspaceId, 'empty'), 'empty');
  }
  assert.equal(api.resolveWorkspaceDataMode('owned-workspace'), 'empty');
  assert.equal(
    api.resolveWorkspaceDataMode('owned-workspace', 'populated'),
    'populated',
  );
  assert.equal(
    api.resolveWorkspaceDataMode('owned-workspace', 'empty'),
    'empty',
  );
  assert.equal(
    api.resolveWorkspaceDataMode('demo', undefined, 'empty'),
    'empty',
  );
});
