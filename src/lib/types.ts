export type DemoState = 'empty' | 'populated';
export type Channel = 'All channels' | 'Meta' | 'Google' | 'TikTok';
export type CampaignStatus = 'Active' | 'Paused' | 'Draft';

export interface Workspace {
  id: string;
  name: string;
  initials: string;
  accent: string;
  accountCount: number;
}

export interface ChatSummary {
  id: string;
  title: string;
  updatedAt: string;
}

export interface Suggestion {
  id: string;
  label: string;
  prompt: string;
  category: 'suggested' | 'meta';
}

export interface KpiMetric {
  id: 'spend' | 'revenue' | 'roas' | 'conversions';
  label: string;
  value: number;
  display: string;
  change: number;
  comparison: string;
  trend: number[];
}

export interface PerformancePoint {
  date: string;
  spend: number;
  revenue: number;
}

export interface Campaign {
  id: string;
  status: CampaignStatus;
  name: string;
  channel: Exclude<Channel, 'All channels'>;
  spend: number;
  revenue: number;
  roas: number;
  cpa: number;
  conversions: number;
  updatedAt: string;
}

export interface DashboardData {
  metrics: KpiMetric[];
  series: PerformancePoint[];
  channelMix: Array<{ channel: string; share: number; color: string }>;
  opportunities: Array<{
    id: string;
    title: string;
    detail: string;
    tone: 'good' | 'watch';
  }>;
}

export interface DashboardFilters {
  range: '7d' | '30d' | '90d';
  compare: 'previous' | 'year';
  channel: Channel;
  status: 'All statuses' | CampaignStatus;
  search: string;
  demo: DemoState;
}

export interface AutomationRule {
  id: string;
  name: string;
  condition: string;
  action: string;
  status: 'Running' | 'Paused';
  lastRun: string;
}

export interface ActivityItem {
  id: string;
  title: string;
  detail: string;
  time: string;
  kind: 'agent' | 'campaign' | 'alert';
}
