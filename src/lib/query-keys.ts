import type { DashboardFilters, DemoState } from '@/src/lib/types';

export const queryKeys = {
  workspace: (workspaceId: string) => ['workspace', workspaceId] as const,
  chats: (workspaceId: string) => ['chats', workspaceId] as const,
  suggestions: (workspaceId: string) => ['suggestions', workspaceId] as const,
  dashboard: (workspaceId: string, filters: DashboardFilters) =>
    ['dashboard', workspaceId, filters] as const,
  campaigns: (workspaceId: string, filters: DashboardFilters) =>
    ['campaigns', workspaceId, filters] as const,
  rules: (workspaceId: string, demo: DemoState) =>
    ['rules', workspaceId, demo] as const,
  activity: (workspaceId: string, demo: DemoState) =>
    ['activity', workspaceId, demo] as const,
  context: (workspaceId: string) => ['business-context', workspaceId] as const,
  stage: (workspaceId: string) => ['stage', workspaceId] as const,
  metaConnection: (workspaceId: string) =>
    ['meta-connection', workspaceId] as const,
  gateways: ['gateways'] as const,
};
