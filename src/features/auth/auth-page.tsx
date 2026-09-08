import { useState } from 'react';
import { Link, useSearch } from '@tanstack/react-router';
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

type AuthMode = 'sign-in' | 'sign-up';

const productSignals = [
  {
    icon: ChartNoAxesCombined,
    label: 'Live performance',
    value: '4.8× ROAS',
    tone: 'bg-[#dff6e8] text-[#26794a]',
  },
  {
    icon: BellRing,
    label: 'Guardrails active',
    value: '12 monitored',
    tone: 'bg-[#fff0a8] text-[#6b5500]',
  },
  {
    icon: Bot,
    label: 'AI actions',
    value: 'Approval first',
    tone: 'bg-[#e9e2ff] text-[#5e3db8]',
  },
];

const signUpBenefits = [
  'Connect Meta ad accounts securely',
  'Monitor every campaign in one workspace',
  'Keep AI actions behind your approval',
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
            AI-assisted ad operations
          </div>
          <h2 className="mt-7 max-w-[560px] text-[52px] font-semibold leading-[52px] tracking-[-.045em] xl:text-[62px] xl:leading-[61px]">
            Every campaign.
            <span className="block text-white/42">One clear view.</span>
          </h2>
          <p className="mt-5 max-w-[500px] text-[18px] leading-7 text-white/58">
            Monitor performance, catch costly changes early, and let your agent
            prepare the next best action—with you in control.
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

function ChatGPTMark() {
  return (
    <span className="grid size-7 place-items-center rounded-full border border-white/20 bg-white/10">
      <Sparkles className="size-4" />
    </span>
  );
}

function AuthForm({ mode }: { mode: AuthMode }) {
  const [redirecting, setRedirecting] = useState(false);
  const search = useSearch({
    from: mode === 'sign-in' ? '/sign-in' : '/sign-up',
  });
  const returnTo = search.returnTo ?? '/workspaces/demo/overview';
  const signInPath = `/signin-with-chatgpt?${new URLSearchParams({ return_to: returnTo }).toString()}`;
  const isSignUp = mode === 'sign-up';

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
              ? 'Use your ChatGPT identity to create a secure, passwordless Aster workspace.'
              : 'Continue to your campaign workspace, alerts, and AI-assisted actions.'}
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

          <a
            href={signInPath}
            target="_top"
            onClick={() => setRedirecting(true)}
            aria-busy={redirecting}
            className="mt-8 flex h-13 w-full items-center justify-center gap-3 rounded-full bg-[#161616] px-5 text-[16px] font-semibold text-white transition-colors hover:bg-[#2e2e2e] focus-visible:outline-offset-2 aria-disabled:pointer-events-none aria-disabled:opacity-60"
          >
            {redirecting ? (
              <LoaderCircle className="size-5 animate-spin" />
            ) : (
              <ChatGPTMark />
            )}
            {redirecting
              ? 'Opening secure sign-in…'
              : isSignUp
                ? 'Create account with ChatGPT'
                : 'Continue with ChatGPT'}
            {!redirecting ? <ArrowRight className="ml-auto size-4" /> : null}
          </a>

          <div className="mt-5 flex items-start gap-3 rounded-2xl bg-[#f7f7f7] p-4">
            <LockKeyhole className="mt-0.5 size-4 shrink-0 text-[#287a4b]" />
            <p className="text-[12px] leading-[17px] text-[#6f6f6f]">
              Passwordless sign-in is handled securely by ChatGPT. Aster
              receives your account identity, never your ChatGPT password.
            </p>
          </div>

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

        <footer className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] text-[#999] sm:justify-between">
          <span>© 2026 Aster</span>
          <span>By continuing, you agree to the Terms and Privacy Policy.</span>
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
