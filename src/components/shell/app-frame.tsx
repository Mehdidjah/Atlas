import { useEffect, useRef, useState, type ReactNode } from 'react';
import { GlobalNavbar } from '@/src/components/shell/global-navbar';
import { WorkspaceDrawer } from '@/src/components/shell/workspace-drawer';

export function AppFrame({
  workspaceId,
  section,
  children,
}: {
  workspaceId: string;
  section: 'home' | 'performance' | 'stage';
  children: ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const previousOpen = useRef(false);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDrawerOpen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  useEffect(() => {
    if (previousOpen.current && !drawerOpen) {
      document
        .querySelector<HTMLButtonElement>('[aria-controls="workspace-drawer"]')
        ?.focus();
    }
    previousOpen.current = drawerOpen;
  }, [drawerOpen]);

  return (
    <div className="fixed inset-0 overflow-hidden bg-[linear-gradient(180deg,var(--frame-start),var(--frame-end))]">
      <GlobalNavbar
        workspaceId={workspaceId}
        drawerOpen={drawerOpen}
        onDrawerToggle={() => setDrawerOpen((value) => !value)}
      />
      <WorkspaceDrawer
        open={drawerOpen}
        section={section}
        workspaceId={workspaceId}
        onClose={() => setDrawerOpen(false)}
      />
      {drawerOpen ? (
        <button
          aria-label="Close workspace drawer"
          className="fixed bottom-0 left-[300px] right-0 top-12 z-10 hidden bg-black/10 lg:block"
          onClick={() => setDrawerOpen(false)}
        />
      ) : null}
      <div
        className={`fixed bottom-0 left-1 right-1 top-12 z-20 overflow-hidden rounded-t-2xl bg-white transition-[transform,right] lg:duration-[250ms] max-lg:left-0 max-lg:right-0 ${drawerOpen ? 'lg:right-[300px] lg:translate-x-[296px]' : 'translate-x-0'}`}
        style={{ transitionTimingFunction: 'var(--ease-drawer)' }}
      >
        {children}
      </div>
    </div>
  );
}
