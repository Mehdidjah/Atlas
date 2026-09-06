import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { queryClient } from '@/src/app/query-client';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delay={500}>{children}</TooltipProvider>
      <Toaster
        position="bottom-center"
        toastOptions={{
          classNames: {
            toast:
              '!rounded-2xl !border-0 !bg-[#161616] !px-5 !py-4 !text-[#f8f8f8] !shadow-xl',
            title: '!text-[15px] !font-semibold',
            description: '!text-white/70',
          },
        }}
      />
    </QueryClientProvider>
  );
}
