import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const bundle = await build({
  stdin: {
    contents:
      "export * from './src/features/performance/performance-store'; export * from './src/features/home/conversation-store'; export { safeAuthReturnTo } from './src/lib/auth-api';",
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
const values = new Map();
globalThis.localStorage = {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, String(value)),
  removeItem: (key) => values.delete(key),
  clear: () => values.clear(),
};
beforeEach(() => values.clear());
const defaults = {
  range: '30d',
  compare: 'previous',
  channel: 'All channels',
  status: 'All statuses',
  search: '',
  demo: 'populated',
};
const draftInput = {
  name: 'Summer essentials',
  channel: 'Meta',
  objective: 'Sales',
  dailyBudget: 37,
};
const near = (actual, expected, label) =>
  assert.ok(
    Math.abs(actual - expected) < 0.015,
    `${label}: ${actual} != ${expected}`,
  );

test('48 filter combinations keep table, daily series, and KPIs coherent', () => {
  let cases = 0;
  for (const range of ['7d', '30d', '90d']) {
    for (const channel of ['All channels', 'Meta', 'Google', 'TikTok']) {
      for (const status of ['All statuses', 'Active', 'Paused', 'Draft']) {
        const filters = { ...defaults, range, channel, status };
        const { campaigns, series } = api.performanceDataset(filters, 'test-a');
        const dashboard = api.dashboardData(filters, 'test-a');
        assert.ok(
          campaigns.every(
            (row) => channel === 'All channels' || row.channel === channel,
          ),
        );
        assert.ok(
          campaigns.every(
            (row) => status === 'All statuses' || row.status === status,
          ),
        );
        assert.equal(
          series.length,
          campaigns.length ? Number.parseInt(range) : 0,
        );
        const spend = campaigns.reduce((sum, row) => sum + row.spend, 0);
        const revenue = campaigns.reduce((sum, row) => sum + row.revenue, 0);
        const conversions = campaigns.reduce(
          (sum, row) => sum + row.conversions,
          0,
        );
        near(
          series.reduce((sum, row) => sum + row.spend, 0),
          spend,
          'series spend',
        );
        near(
          series.reduce((sum, row) => sum + row.revenue, 0),
          revenue,
          'series revenue',
        );
        if (campaigns.length) {
          const metric = (id) =>
            dashboard.metrics.find((item) => item.id === id).value;
          near(metric('spend'), spend, 'KPI spend');
          near(metric('revenue'), revenue, 'KPI revenue');
          near(metric('roas'), spend ? revenue / spend : 0, 'ROAS');
          assert.equal(metric('conversions'), conversions);
          near(dashboard.cpa, conversions ? spend / conversions : 0, 'CPA');
        } else assert.deepEqual(dashboard.metrics, []);
        cases += 1;
      }
    }
  }
  assert.equal(cases, 48);
});

test('search and empty mode do not invent results', () => {
  const matching = api.performanceDataset(
    { ...defaults, search: 'CATALOG' },
    'test-a',
  );
  assert.ok(matching.campaigns.length > 0);
  assert.ok(
    matching.campaigns.every((row) =>
      row.name.toLowerCase().includes('catalog'),
    ),
  );
  assert.deepEqual(
    api.dashboardData({ ...defaults, search: 'not-a-campaign-9815' }, 'test-a')
      .metrics,
    [],
  );
  assert.deepEqual(
    api.dashboardData({ ...defaults, demo: 'empty' }, 'test-a').metrics,
    [],
  );
});

test('90-day history is not the 30-day chart relabeled', () => {
  const month = api.performanceDataset(defaults, 'test-a').series;
  const quarter = api.performanceDataset(
    { ...defaults, range: '90d' },
    'test-a',
  ).series;
  assert.equal(month.length, 30);
  assert.equal(quarter.length, 90);
  assert.notEqual(month[0].date, quarter[0].date);
});

test('draft review, persistence, and approval remain workspace-scoped and never publish', () => {
  const draft = api.performanceStore.saveDraft(draftInput, 'test-a');
  assert.equal(draft.approval, 'Needs review');
  assert.equal(api.performanceStore.drafts('test-a')[0].id, draft.id);
  assert.deepEqual(api.performanceStore.drafts('test-b'), []);
  assert.throws(() => api.performanceStore.approve(draft.id, 'test-b'));
  const approved = api.performanceStore.approve(draft.id, 'test-a');
  assert.equal(approved.approval, 'Approved locally');
  assert.equal(approved.status, 'Draft');
  assert.throws(() => api.performanceStore.approve(draft.id, 'test-a'));
  const activity = api.performanceStore.activity('test-a');
  assert.equal(activity.length, 2);
  assert.ok(
    activity.every(
      (item) => item.actor === 'user' && item.entityId === draft.id,
    ),
  );
  assert.deepEqual(api.performanceStore.activity('test-b'), []);
});

test('sample status change updates filters, records activity, and cannot activate drafts', () => {
  const activeFilters = { ...defaults, status: 'Active' };
  const campaign = api.performanceDataset(activeFilters, 'test-a').campaigns[0];
  api.performanceStore.updateStatus(campaign.id, 'Paused', 'test-a');
  assert.ok(
    !api
      .performanceDataset(activeFilters, 'test-a')
      .campaigns.some((row) => row.id === campaign.id),
  );
  assert.ok(
    api
      .performanceDataset(activeFilters, 'test-b')
      .campaigns.some((row) => row.id === campaign.id),
  );
  assert.equal(api.performanceStore.activity('test-a')[0].action, 'status');
  assert.throws(() =>
    api.performanceStore.updateStatus(campaign.id, 'Paused', 'test-a'),
  );
  const draft = api.performanceDataset(
    { ...defaults, status: 'Draft' },
    'test-a',
  ).campaigns[0];
  assert.throws(() =>
    api.performanceStore.updateStatus(draft.id, 'Active', 'test-a'),
  );
});

test('invalid budgets and blank names never reach saved drafts', () => {
  for (const dailyBudget of [-1, 0, 9, 1001, Number.NaN]) {
    assert.throws(() =>
      api.performanceStore.saveDraft({ ...draftInput, dailyBudget }, 'test-a'),
    );
  }
  assert.throws(() =>
    api.performanceStore.saveDraft({ ...draftInput, name: '   ' }, 'test-a'),
  );
  assert.deepEqual(api.performanceStore.drafts('test-a'), []);
  assert.deepEqual(api.performanceStore.activity('test-a'), []);
});

test('rule drafts are saved paused and do not execute automatically', () => {
  const rule = api.performanceStore.saveRule(
    { name: 'Review high CPA', metric: 'CPA', threshold: 35 },
    'test-a',
  );
  assert.equal(rule.status, 'Paused');
  assert.equal(api.performanceStore.rules('test-a').length, 1);
  assert.deepEqual(api.performanceStore.rules('test-b'), []);
  assert.match(rule.lastRun, /Never run/);
});

test('invalid saved data fails without overwriting the original', () => {
  const key = 'aster-performance-v1-test-a';
  values.set(key, '{invalid');
  assert.throws(
    () => api.performanceStore.drafts('test-a'),
    /could not be read/,
  );
  assert.throws(() => api.performanceStore.saveDraft(draftInput, 'test-a'));
  assert.equal(values.get(key), '{invalid');
});

test('chat messages are isolated by workspace and conversation, with interrupted-send recovery', () => {
  const messages = [
    {
      id: 'message-1',
      role: 'user',
      content: 'Help me plan a campaign',
      createdAt: '2026-09-09T10:00:00Z',
      status: 'pending',
    },
  ];
  assert.equal(api.saveMessages('test-a', 'chat-1', messages), '');
  assert.equal(
    api.readMessages('test-a', 'chat-1').messages[0].status,
    'failed',
  );
  assert.deepEqual(api.readMessages('test-b', 'chat-1').messages, []);
  assert.deepEqual(api.readMessages('test-a', 'chat-2').messages, []);
  const reply = api.groundedReply(
    'Launch my campaign',
    api.dashboardData(defaults, 'test-a'),
    '',
  );
  assert.match(reply, /cannot publish/);
  assert.match(reply, /No ads were changed/);
});

test('frontend return destinations reject redirect escape variants', () => {
  for (const value of [
    '//evil.example',
    '/\\evil.example',
    '/workspaces/demo/overview/../connections',
    '/workspaces/demo/overview%2f..',
    'https://evil.example',
    '/sign-in',
    '/workspaces/demo/overview\n',
  ]) {
    assert.equal(api.safeAuthReturnTo(value), undefined);
  }
  assert.equal(
    api.safeAuthReturnTo('/workspaces/demo/connections/meta'),
    '/workspaces/demo/connections/meta',
  );
});
