import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Check, ChevronLeft, Database, LockKeyhole, X } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { demoApi } from '@/src/lib/demo-api';

const gatewaySchema = z.object({
  name: z.string().trim().min(3, 'Enter a gateway name.'),
  platform: z.enum(['Meta Ads', 'Google Ads', 'TikTok Ads']),
  region: z.enum(['United States', 'European Union', 'Asia Pacific']),
});
type GatewayForm = z.infer<typeof gatewaySchema>;

export function HubPage() {
  const [step, setStep] = useState(0);
  const {
    register,
    trigger,
    setFocus,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<GatewayForm>({
    resolver: zodResolver(gatewaySchema),
    defaultValues: { name: '', platform: 'Meta Ads', region: 'United States' },
  });
  const mutation = useMutation({
    mutationFn: (values: GatewayForm) => demoApi.createGateway(values),
    onSuccess: () => {
      setStep(2);
      toast.success('Gateway created', {
        description: 'The demo connection is ready.',
      });
    },
  });
  const next = async () => {
    const valid = await trigger(['name', 'platform'], { shouldFocus: true });
    if (!valid) {
      setFocus('name');
      return;
    }
    if (valid) setStep(1);
  };
  const fieldClass =
    'mt-1 h-12 w-full rounded-2xl border border-[#e0e0e0] bg-white px-5 outline-none hover:border-[#cccccc] focus:border-[#9e9e9e] aria-invalid:border-[#cd2823] aria-invalid:shadow-[0_0_0_4px_rgba(223,11,11,.1)]';
  return (
    <main className="grid min-h-screen grid-cols-2 bg-white max-md:grid-cols-1">
      <section className="flex min-h-screen flex-col items-center justify-center bg-[#161616] p-10 text-center max-md:min-h-0 max-md:py-8">
        <div className="aster-gradient-wordmark text-[72px] font-black leading-none tracking-[-.07em] max-md:text-[46px]">
          ASTER
        </div>
        <div className="mt-4 flex items-center gap-2 text-white/40">
          <Database className="size-4" />
          <span className="text-[18px]">Data gateways, clearly governed.</span>
        </div>
        <div className="mt-12 grid w-full max-w-sm grid-cols-3 gap-2 max-md:hidden">
          <div className="rounded-2xl border border-white/10 p-4 text-left">
            <div className="text-[12px] text-white/40">CONNECT</div>
            <div className="mt-8 text-white">Your ad source</div>
          </div>
          <div className="rounded-2xl border border-white/10 p-4 text-left">
            <div className="text-[12px] text-white/40">CONTROL</div>
            <div className="mt-8 text-white">Permissions</div>
          </div>
          <div className="rounded-2xl border border-white/10 p-4 text-left">
            <div className="text-[12px] text-white/40">SYNC</div>
            <div className="mt-8 text-white">Fresh metrics</div>
          </div>
        </div>
      </section>
      <section className="relative flex min-h-screen items-center justify-center p-8 max-sm:p-4">
        <Link
          to="/workspaces/$workspaceId/overview"
          params={{ workspaceId: 'demo' }}
          aria-label="Close Hub setup"
          className="absolute right-6 top-6 grid h-12 w-14 place-items-center rounded-full bg-[#f2f2f2] transition-colors hover:bg-[#e8e8e8]"
        >
          <X className="size-4" />
        </Link>
        <div className="w-full max-w-[520px]">
          <div
            className="mb-10 flex gap-2"
            aria-label={`Step ${step + 1} of 3`}
          >
            {[0, 1, 2].map((segment) => (
              <span
                key={segment}
                className={`h-1 w-[51px] rounded-full transition-colors ${segment <= step ? 'bg-[#161616]' : 'bg-[#f2f2f2]'}`}
              />
            ))}
          </div>
          {step === 0 ? (
            <div>
              <h1 className="text-[36px] font-semibold leading-[43px] tracking-[-.02em]">
                Create a data gateway
              </h1>
              <p className="mt-2 text-[#636363]">
                Choose the ad platform this governed connection will serve.
              </p>
              <div className="mt-8 grid gap-6">
                <label className="font-semibold">
                  Gateway name <span className="text-[#cd2823]">*</span>
                  <input
                    id="gateway-name"
                    {...register('name')}
                    required
                    aria-invalid={Boolean(errors.name)}
                    aria-describedby={
                      errors.name ? 'gateway-name-error' : undefined
                    }
                    className={fieldClass}
                    placeholder="e.g. North America paid media"
                  />
                  <span
                    id="gateway-name-error"
                    role="alert"
                    className="mt-1 block text-[13px] font-normal text-[#cd2823]"
                  >
                    {errors.name?.message}
                  </span>
                </label>
                <label className="font-semibold">
                  Ad platform <span className="text-[#cd2823]">*</span>
                  <select
                    {...register('platform')}
                    required
                    className={fieldClass}
                  >
                    <option>Meta Ads</option>
                    <option>Google Ads</option>
                    <option>TikTok Ads</option>
                  </select>
                </label>
              </div>
              <button
                onClick={next}
                className="mt-8 h-12 w-full rounded-full bg-[#161616] text-[18px] font-semibold text-white hover:bg-[#2e2e2e]"
              >
                Continue
              </button>
            </div>
          ) : null}
          {step === 1 ? (
            <form onSubmit={handleSubmit((values) => mutation.mutate(values))}>
              <button
                type="button"
                onClick={() => setStep(0)}
                className="mb-6 flex items-center gap-1 text-[13px] font-semibold text-[#636363] hover:text-[#161616]"
              >
                <ChevronLeft className="size-4" />
                Back
              </button>
              <h1 className="text-[36px] font-semibold leading-[43px] tracking-[-.02em]">
                Set data residency
              </h1>
              <p className="mt-2 text-[#636363]">
                Aster will keep the gateway’s operational data in this region.
              </p>
              <label className="mt-8 block font-semibold">
                Region <span className="text-[#cd2823]">*</span>
                <select {...register('region')} required className={fieldClass}>
                  <option>United States</option>
                  <option>European Union</option>
                  <option>Asia Pacific</option>
                </select>
              </label>
              <div className="mt-6 flex gap-3 rounded-2xl bg-[#f8f8f8] p-4">
                <LockKeyhole className="mt-0.5 size-4 shrink-0" />
                <p className="text-[13px] leading-[18px] text-[#636363]">
                  OAuth access is scoped per workspace. Tokens should be
                  encrypted server-side when you connect the production backend.
                </p>
              </div>
              <button
                type="submit"
                disabled={mutation.isPending}
                className="mt-8 h-12 w-full rounded-full bg-[#161616] text-[18px] font-semibold text-white hover:bg-[#2e2e2e] disabled:opacity-50"
              >
                {mutation.isPending ? 'Creating gateway…' : 'Create gateway'}
              </button>
            </form>
          ) : null}
          {step === 2 ? (
            <div>
              <span className="grid size-12 place-items-center rounded-2xl bg-[#def4e7] text-[#287a4b]">
                <Check className="size-6" />
              </span>
              <h1 className="mt-6 text-[36px] font-semibold leading-[43px] tracking-[-.02em]">
                Gateway ready
              </h1>
              <p className="mt-2 text-[#636363]">
                {getValues('name')} is configured for {getValues('platform')} in{' '}
                {getValues('region')}. This frontend demo does not request real
                platform credentials.
              </p>
              <Link
                to="/workspaces/$workspaceId/performance"
                params={{ workspaceId: 'demo' }}
                className="mt-8 grid h-12 w-full place-items-center rounded-full bg-[#161616] text-[18px] font-semibold text-white hover:bg-[#2e2e2e]"
              >
                Open Performance
              </Link>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
