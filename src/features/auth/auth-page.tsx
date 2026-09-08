import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { isDemoWorkspace } from '@/src/lib/workspaces';
import {
  ArrowRight,
  BellRing,
  Bot,
  ChartNoAxesCombined,
  Check,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import {
  authApi,
  safeAuthReturnTo,
  type AuthProvider,
} from '@/src/lib/auth-api';
type AuthMode = 'sign-in' | 'sign-up';

const errors: Record<string, string> = {
  cancelled:
    'Sign-in was cancelled. No new session was created. Choose a provider to try again.',
  invalid_state:
    'This sign-in request expired or belongs to another browser. Start again below.',
  provider_unavailable:
    'This provider is not configured for this deployment. Explore the demo or contact the administrator.',
  provider_failed:
    'Your account could not be verified. Try again, or contact the administrator if this continues.',
  workspace_unavailable:
    'Your workspace is not available. Contact the administrator before trying again.',
};
function ProviderMark({ provider }: { provider: AuthProvider }) {
  return provider === 'google' ? (
    <svg className="size-5" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.36Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.96-.9 6.61-2.41l-3.24-2.51c-.9.6-2.05.96-3.37.96-2.6 0-4.8-1.75-5.59-4.1H3.06v2.59A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.41 13.94a6 6 0 0 1 0-3.88V7.47H3.06a10 10 0 0 0 0 9.06l3.35-2.59Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.96c1.47 0 2.79.5 3.82 1.49l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.94 5.47l3.35 2.59A6 6 0 0 1 12 5.96Z"
      />
    </svg>
  ) : (
    <svg
      className="size-5 text-[#1877f2]"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M24 12a12 12 0 1 0-13.9 11.85v-8.38H7.08V12h3.02V9.36c0-3 1.79-4.66 4.52-4.66 1.31 0 2.68.23 2.68.23v2.95h-1.51c-1.49 0-1.96.92-1.96 1.86V12h3.34l-.53 3.47h-2.81v8.38A12 12 0 0 0 24 12Z" />
    </svg>
  );
}

const productSignals = [
  {
    icon: ChartNoAxesCombined,
    label: 'Sample performance',
    value: '4.8× ROAS',
    tone: 'bg-[#dff6e8] text-[#26794a]',
  },
  {
    icon: BellRing,
    label: 'Draft review',
    value: 'Review locally',
    tone: 'bg-[#fff0a8] text-[#6b5500]',
  },
  {
    icon: Bot,
    label: 'Guided planning',
    value: 'You decide',
    tone: 'bg-[#e9e2ff] text-[#5e3db8]',
  },
];

const signUpBenefits = [
  'Connect Meta ad accounts securely',
  'Explore sample campaigns and performance',
  'Prepare and review drafts before any action',
];

function ProductPanel() {
  return (
    <section className="relative flex min-h-screen overflow-hidden bg-[linear-gradient(145deg,#202020_0%,#13251f_58%,#0d1714_100%)] p-8 text-white lg:p-12 xl:p-16">
      <div
        className="pointer-events-none absolute -left-36 top-1/3 size-[520px] rounded-full bg-[#734ede]/20 blur-[120px]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -right-40 -top-44 size-[520px] rounded-full bg-[#45b97c]/15 blur-[120px]"
        aria-hidden="true"
      />
      <div className="relative mx-auto flex w-full max-w-[660px] flex-col">
        <Link
          to="/"
          className="aster-gradient-wordmark w-fit text-[30px] font-black leading-none tracking-[-.07em]"
          aria-label="Aster home"
        >
          ASTER
        </Link>
        <div className="my-auto py-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[12px] font-semibold text-white/70 backdrop-blur">
            <Sparkles className="size-3.5 text-[#91e5b2]" />
            AI-assisted ad planning
          </div>
          <h2 className="mt-7 max-w-[560px] text-[52px] font-semibold leading-[52px] tracking-[-.045em] xl:text-[62px] xl:leading-[61px]">
            Every campaign.
            <span className="block text-white/42">One clear view.</span>
          </h2>
          <p className="mt-5 max-w-[500px] text-[18px] leading-7 text-white/58">
            Explore sample performance and prepare campaign drafts with guided
            planning. Live reporting and publishing are not available in this
            build.
          </p>

          <div className="mt-10 grid max-w-[570px] gap-3 sm:grid-cols-3">
            {productSignals.map(({ icon: Icon, label, value, tone }) => (
              <div
                key={label}
                className="rounded-2xl border border-white/10 bg-white/[.065] p-4 backdrop-blur-sm"
              >
                <span
                  className={`grid size-8 place-items-center rounded-xl ${tone}`}
                >
                  <Icon className="size-4" />
                </span>
                <div className="mt-5 text-[12px] text-white/45">{label}</div>
                <div className="mt-1 font-semibold text-white/90">{value}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 text-[12px] text-white/35">
          <ShieldCheck className="size-4" />
          Secure workspace identity · Encrypted ad credentials
        </div>
      </div>
    </section>
  );
}

function AuthForm({ mode }: { mode: AuthMode }) {
  const queryClient = useQueryClient();
  const providersQuery = useQuery({
    queryKey: ['auth', 'providers'],
    queryFn: authApi.providers,
    retry: false,
  });
  const sessionQuery = useQuery({
    queryKey: ['auth', 'session'],
    queryFn: authApi.session,
    retry: false,
    staleTime: 30_000,
  });
  const providers = providersQuery.data;
  const session = sessionQuery.isError ? undefined : sessionQuery.data;
  const loading = providersQuery.isPending || sessionQuery.isPending;
  const [error, setError] = useState<string | null>(() => {
    const key = new URLSearchParams(window.location.search).get('authError');
    return key
      ? (errors[key] ?? 'Sign-in could not be completed. Please start again.')
      : null;
  });
  const [pending, setPending] = useState<
    AuthProvider | 'hosted' | 'logout' | null
  >(null);
  const requestedReturnTo = safeAuthReturnTo(
    new URLSearchParams(window.location.search).get('returnTo'),
  );
  // Old Connections links should not reintroduce the legacy introduction.
  const returnTo = requestedReturnTo?.replace(
    /\/connections(?=\?|$)/,
    '/connections/meta',
  );
  const sessionReturnTo = returnTo?.replace(
    /^\/workspaces\/([A-Za-z0-9_-]+)(?=\/connections\/meta(?:\?|$))/,
    (match, id: string) =>
      session?.user && isDemoWorkspace(id)
        ? `/workspaces/${encodeURIComponent(session.user.defaultWorkspaceId)}`
        : match,
  );
  const isSignUp = mode === 'sign-up';
  useEffect(() => {
    const restore = () => setPending(null);
    window.addEventListener('pageshow', restore);
    return () => window.removeEventListener('pageshow', restore);
  }, []);
  const available = providers?.google === true || providers?.facebook === true;
  const begin = (provider: AuthProvider) => {
    if (!providers?.[provider] || pending) return;
    setError(null);
    setPending(provider);
    window.location.assign(
      authApi.startUrl(
        provider,
        returnTo ?? '/workspaces/demo/connections/meta',
      ),
    );
  };
  const logout = async () => {
    setPending('logout');
    setError(null);
    try {
      await authApi.signOut();
      queryClient.setQueryData(['auth', 'session'], await authApi.session());
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'Sign-out failed. Please try again.',
      );
    } finally {
      setPending(null);
    }
  };
  return (
    <section className="flex min-h-screen bg-white p-5 sm:p-8 lg:p-12">
      <div className="mx-auto flex w-full max-w-[460px] flex-col">
        <div className="flex items-center justify-between lg:justify-end">
          <Link
            to="/"
            className="aster-gradient-wordmark text-[25px] font-black leading-none tracking-[-.07em] lg:hidden"
            aria-label="Aster home"
          >
            ASTER
          </Link>
          <div className="flex rounded-full bg-[#f2f2f2] p-1 text-[13px] font-semibold">
            <Link
              to="/sign-in"
              search={{ returnTo }}
              className={`grid h-8 place-items-center rounded-full px-4 transition-colors ${!isSignUp ? 'bg-white text-[#161616] shadow-sm' : 'text-[#777] hover:text-[#161616]'}`}
            >
              Sign in
            </Link>
            <Link
              to="/sign-up"
              search={{ returnTo }}
              className={`grid h-8 place-items-center rounded-full px-4 transition-colors ${isSignUp ? 'bg-white text-[#161616] shadow-sm' : 'text-[#777] hover:text-[#161616]'}`}
            >
              Sign up
            </Link>
          </div>
        </div>

        <div className="my-auto py-14">
          <div className="text-[12px] font-semibold uppercase tracking-[.12em] text-[#8a8a8a]">
            {isSignUp ? 'Start your workspace' : 'Welcome back'}
          </div>
          <h1 className="mt-3 text-[38px] font-semibold leading-[42px] tracking-[-.035em] sm:text-[44px] sm:leading-[48px]">
            {isSignUp ? 'Create your Aster account' : 'Sign in to Aster'}
          </h1>
          <p className="mt-4 max-w-[420px] text-[16px] leading-6 text-[#636363]">
            {isSignUp
              ? 'Use Google or Facebook to create a secure, passwordless Aster workspace.'
              : 'Continue to your Aster workspace to connect Meta and prepare campaign drafts.'}
          </p>

          {isSignUp ? (
            <ul className="mt-7 grid gap-3">
              {signUpBenefits.map((benefit) => (
                <li
                  key={benefit}
                  className="flex items-center gap-3 text-[14px]"
                >
                  <span className="grid size-6 place-items-center rounded-full bg-[#def4e7] text-[#287a4b]">
                    <Check className="size-3.5" />
                  </span>
                  {benefit}
                </li>
              ))}
            </ul>
          ) : null}

          {error || sessionQuery.isError ? (
            <div
              role="alert"
              className="mt-5 rounded-2xl border border-[#f0d3d1] bg-[#fff7f6] p-4 text-[13px] leading-5 text-[#a52b27]"
            >
              {error ??
                'Your Aster session could not be checked. Try again before continuing.'}
            </div>
          ) : null}
          {session?.user ? (
            <div className="mt-8">
              <p className="flex items-center gap-2 text-[14px] text-[#287a4b]">
                <Check className="size-4" />
                Signed in as{' '}
                {session.user.name || session.user.email || 'an Aster member'}
              </p>
              <a
                href={
                  sessionReturnTo ??
                  `/workspaces/${encodeURIComponent(session.user.defaultWorkspaceId)}/connections/meta`
                }
                className="mt-4 flex h-13 w-full items-center justify-center gap-3 rounded-full bg-[#161616] px-5 text-[16px] font-semibold text-white hover:bg-[#2e2e2e]"
              >
                {returnTo && !returnTo.includes('/connections')
                  ? 'Continue to workspace'
                  : 'Continue to Meta setup'}
                <ArrowRight className="size-4" />
              </a>
              <button
                type="button"
                onClick={() => void logout()}
                disabled={pending !== null}
                className="mt-3 h-11 w-full rounded-full bg-[#f2f2f2] text-[13px] font-semibold text-[#636363] hover:bg-[#e8e8e8] disabled:opacity-50"
              >
                {pending === 'logout' ? 'Signing out…' : 'Sign out of Aster'}
              </button>
            </div>
          ) : (
            <div className="mt-8 grid gap-3">
              {(['google', 'facebook'] as const).map((provider) => (
                <button
                  type="button"
                  key={provider}
                  onClick={() => begin(provider)}
                  disabled={
                    loading ||
                    providers?.[provider] !== true ||
                    pending !== null
                  }
                  aria-busy={pending === provider}
                  aria-describedby={
                    !loading && providers?.[provider] !== true
                      ? `${provider}-unavailable`
                      : undefined
                  }
                  className="flex h-13 w-full items-center justify-center gap-3 rounded-full bg-[#161616] px-5 text-[16px] font-semibold text-white transition-colors hover:bg-[#2e2e2e] focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {pending === provider ? (
                    <LoaderCircle className="size-5 animate-spin" />
                  ) : (
                    <span className="grid size-7 place-items-center rounded-full border border-white/20 bg-white/10">
                      <ProviderMark provider={provider} />
                    </span>
                  )}
                  {pending === provider
                    ? 'Opening secure sign-in…'
                    : `Continue with ${provider === 'google' ? 'Google' : 'Facebook'}`}
                  {pending !== provider ? (
                    <ArrowRight className="ml-auto size-4" />
                  ) : null}
                </button>
              ))}
            </div>
          )}
          <div
            aria-live="polite"
            className="mt-4 text-[12px] leading-5 text-[#777]"
          >
            {loading ? (
              <p className="flex items-center gap-2">
                <LoaderCircle className="size-4 animate-spin" />
                Checking sign-in availability…
              </p>
            ) : (
              <>
                {providers && !available && !session?.user ? (
                  <p>
                    {providers.hosted
                      ? 'Google and Facebook sign-in are unavailable in this environment. You can use hosted sign-in below or explore the sample workspace.'
                      : 'Google and Facebook sign-in are unavailable in this environment. Try again later or explore the sample workspace without signing in.'}
                  </p>
                ) : null}
                {!session?.user
                  ? (['google', 'facebook'] as const).map((provider) =>
                      providers?.[provider] !== true ? (
                        <p key={provider} id={`${provider}-unavailable`}>
                          {provider === 'google' ? 'Google' : 'Facebook'}:{' '}
                          {providers
                            ? 'unavailable in this environment.'
                            : 'availability could not be checked.'}
                        </p>
                      ) : null,
                    )
                  : null}
                {providersQuery.isError || sessionQuery.isError ? (
                  <button
                    type="button"
                    disabled={
                      providersQuery.isFetching || sessionQuery.isFetching
                    }
                    className="mt-2 font-semibold text-[#161616] underline underline-offset-4"
                    onClick={() => {
                      setError(null);
                      if (providersQuery.isError) void providersQuery.refetch();
                      if (sessionQuery.isError) void sessionQuery.refetch();
                    }}
                  >
                    Check again
                  </button>
                ) : null}
              </>
            )}
          </div>
          {providers?.hosted === true &&
          !sessionQuery.isPending &&
          !session?.user ? (
            <a
              href={`/signin-with-chatgpt?${new URLSearchParams({ return_to: returnTo ?? '/workspaces/demo/connections/meta' })}`}
              target="_top"
              onClick={(event) => {
                if (pending) event.preventDefault();
                else setPending('hosted');
              }}
              aria-disabled={pending !== null}
              aria-busy={pending === 'hosted'}
              className="mt-4 flex h-11 w-full items-center justify-center rounded-full bg-[#f2f2f2] px-5 text-[13px] font-semibold text-[#636363] hover:bg-[#e8e8e8] aria-disabled:opacity-50"
            >
              {pending === 'hosted'
                ? 'Opening hosted sign-in…'
                : 'Continue with hosted ChatGPT'}
            </a>
          ) : null}
          {pending && pending !== 'logout' ? (
            <p className="mt-3 text-[12px] text-[#777]">
              Finish on the provider’s secure page. If it did not open,{' '}
              <button
                type="button"
                className="underline"
                onClick={() => setPending(null)}
              >
                cancel and try again
              </button>
              .
            </p>
          ) : null}

          <div className="mt-5 flex items-start gap-3 rounded-2xl bg-[#f7f7f7] p-4">
            <LockKeyhole className="mt-0.5 size-4 shrink-0 text-[#287a4b]" />
            <p className="text-[12px] leading-[17px] text-[#6f6f6f]">
              Continuing creates or reuses your Aster identity, not an ad
              connection. Your provider password is never shared with Aster.
              Authorize Meta separately as the next step to choose your
              advertising accounts.
            </p>
          </div>

          {!loading && providers && !available && !session?.user ? (
            <details className="mt-4 rounded-2xl bg-[#f7f7f7] p-4 text-[12px] leading-5 text-[#6f6f6f]">
              <summary className="cursor-pointer font-semibold text-[#161616]">
                Administrator setup
              </summary>
              <p className="mt-2">
                Enable Google or Facebook identity sign-in in the server
                configuration and register the matching callback URL with the
                provider. Keep credentials server-side. Meta advertising
                authorization is configured separately.
              </p>
            </details>
          ) : null}

          <p className="mt-6 text-center text-[13px] leading-5 text-[#777]">
            {isSignUp ? 'Already have an account?' : 'New to Aster?'}{' '}
            <Link
              to={isSignUp ? '/sign-in' : '/sign-up'}
              search={{ returnTo }}
              className="font-semibold text-[#161616] underline decoration-[#c7c7c7] underline-offset-4 hover:decoration-[#161616]"
            >
              {isSignUp ? 'Sign in' : 'Create an account'}
            </Link>
          </p>
        </div>

        <Link
          to="/workspaces/$workspaceId/overview"
          params={{ workspaceId: 'demo' }}
          className="mb-5 text-center text-[12px] text-[#777] underline underline-offset-4"
        >
          Explore demo workspace · Sample data only
        </Link>
        <footer className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] text-[#999] sm:justify-between">
          <span>© 2026 Aster</span>
          <span>Returning? Use the same sign-in provider as before.</span>
        </footer>
      </div>
    </section>
  );
}

function AuthPage({ mode }: { mode: AuthMode }) {
  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[1.04fr_.96fr]">
      <div className="hidden lg:block">
        <ProductPanel />
      </div>
      <AuthForm mode={mode} />
    </main>
  );
}

export function SignInPage() {
  return <AuthPage mode="sign-in" />;
}

export function SignUpPage() {
  return <AuthPage mode="sign-up" />;
}
