/** Built-in preview workspaces never represent connected customer data. */
export const demoWorkspaceIds = ['demo', 'north', 'studio'] as const;
export const isDemoWorkspace = (workspaceId: string) =>
  (demoWorkspaceIds as readonly string[]).includes(workspaceId);

/** Entering a named demo workspace is an explicit sample opt-in; customer IDs are empty by default. */
export const resolveWorkspaceDataMode = (
  workspaceId: string,
  requested?: 'empty' | 'populated',
  configuredDefault?: string,
): 'empty' | 'populated' =>
  requested ??
  (configuredDefault === 'empty' || !isDemoWorkspace(workspaceId)
    ? 'empty'
    : 'populated');
