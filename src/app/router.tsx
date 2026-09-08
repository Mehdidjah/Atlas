import {
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
  Link,
  Outlet,
  redirect,
} from '@tanstack/react-router';
import { z } from 'zod';
import {
  PageSkeleton,
  QueryError,
} from '@/src/components/feedback/query-state';

const demoSearchSchema = z.object({
  demo: z.enum(['empty', 'populated']).optional(),
});

const metaConnectionSearchSchema = z.object({
  meta: z.enum(['connected', 'cancelled', 'error']).optional(),
  reason: z.string().max(80).optional(),
});

const authSearchSchema = z.object({
  returnTo: z
    .string()
    .max(500)
    .refine((value) => value.startsWith('/') && !value.startsWith('//'))
    .optional(),
});

const performanceSearchSchema = z.object({
  range: z.enum(['7d', '30d', '90d']).optional(),
  compare: z.enum(['previous', 'year']).optional(),
  channel: z.enum(['All channels', 'Meta', 'Google', 'TikTok']).optional(),
  status: z.enum(['All statuses', 'Active', 'Paused', 'Draft']).optional(),
  q: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).optional(),
  sort: z.string().max(60).optional(),
  demo: z.enum(['empty', 'populated']).optional(),
});

function RootLayout() {
  return <Outlet />;
}

const rootRoute = createRootRoute({
  component: RootLayout,
  pendingComponent: () => (
    <div className="min-h-screen bg-white">
      <PageSkeleton />
    </div>
  ),
  errorComponent: ({ reset }) => (
    <div className="flex min-h-screen bg-white">
      <QueryError retry={reset} />
    </div>
  ),
  notFoundComponent: () => (
    <div className="grid min-h-screen place-items-center bg-[#161616] p-6 text-center text-white">
      <div>
        <div className="text-[72px] font-black text-white/20">404</div>
        <h1 className="text-[30px] font-semibold">
          This workspace view doesn’t exist.
        </h1>
        <Link
          to="/workspaces/$workspaceId/overview"
          params={{ workspaceId: 'demo' }}
          className="mt-6 inline-grid h-11 place-items-center rounded-full bg-white px-5 font-semibold text-[#161616]"
        >
          Return home
        </Link>
      </div>
    </div>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({
      to: '/workspaces/$workspaceId/overview',
      params: { workspaceId: 'demo' },
    });
  },
});

const signInRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sign-in',
  validateSearch: (search) => authSearchSchema.parse(search),
  component: lazyRouteComponent(
    () => import('@/src/features/auth/auth-page'),
    'SignInPage',
  ),
});

const signUpRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sign-up',
  validateSearch: (search) => authSearchSchema.parse(search),
  component: lazyRouteComponent(
    () => import('@/src/features/auth/auth-page'),
    'SignUpPage',
  ),
});

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/workspaces/$workspaceId/overview',
  validateSearch: (search) => demoSearchSchema.parse(search),
  component: lazyRouteComponent(
    () => import('@/src/features/home/home-page'),
    'HomePage',
  ),
});

const chatRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/workspaces/$workspaceId/overview/chat/$chatId',
  validateSearch: (search) => demoSearchSchema.parse(search),
  component: lazyRouteComponent(
    () => import('@/src/features/home/home-page'),
    'HomePage',
  ),
});

const performanceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/workspaces/$workspaceId/performance',
  validateSearch: (search) => performanceSearchSchema.parse(search),
  component: lazyRouteComponent(
    () => import('@/src/features/performance/performance-page'),
    'PerformanceOverviewPage',
  ),
});

const rulesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/workspaces/$workspaceId/performance/rules',
  validateSearch: (search) => performanceSearchSchema.parse(search),
  component: lazyRouteComponent(
    () => import('@/src/features/performance/performance-page'),
    'RulesPage',
  ),
});

const analyzeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/workspaces/$workspaceId/performance/analyze',
  validateSearch: (search) => performanceSearchSchema.parse(search),
  component: lazyRouteComponent(
    () => import('@/src/features/performance/performance-page'),
    'AnalyzePage',
  ),
});

const launchRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/workspaces/$workspaceId/performance/launch',
  validateSearch: (search) => performanceSearchSchema.parse(search),
  component: lazyRouteComponent(
    () => import('@/src/features/performance/performance-page'),
    'LaunchPage',
  ),
});

const activityRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/workspaces/$workspaceId/performance/activity',
  validateSearch: (search) => performanceSearchSchema.parse(search),
  component: lazyRouteComponent(
    () => import('@/src/features/performance/performance-page'),
    'ActivityPage',
  ),
});

const stageRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/workspaces/$workspaceId/stage',
  validateSearch: (search) => demoSearchSchema.parse(search),
  component: lazyRouteComponent(
    () => import('@/src/features/stage/stage-page'),
    'StagePage',
  ),
});

const hubRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/hub',
  component: lazyRouteComponent(
    () => import('@/src/features/hub/hub-page'),
    'HubPage',
  ),
});

const metaConnectionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/workspaces/$workspaceId/connections/meta',
  validateSearch: (search) => metaConnectionSearchSchema.parse(search),
  component: lazyRouteComponent(
    () => import('@/src/features/connections/meta-connection-page'),
    'MetaConnectionPage',
  ),
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  signInRoute,
  signUpRoute,
  homeRoute,
  chatRoute,
  performanceRoute,
  rulesRoute,
  analyzeRoute,
  launchRoute,
  activityRoute,
  stageRoute,
  hubRoute,
  metaConnectionRoute,
]);

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  defaultPendingMs: 180,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
