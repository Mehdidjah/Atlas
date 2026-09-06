import type { ReactElement } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function AppTooltip({
  label,
  children,
  side = 'top',
}: {
  label: string;
  children: ReactElement;
  side?: 'top' | 'right' | 'bottom' | 'left';
}) {
  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipContent
        side={side}
        className="z-[1400] rounded-lg bg-[#161616] px-2 py-1 text-[13px] leading-[17px] text-[#f8f8f8] shadow-none data-open:animate-none"
      >
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
