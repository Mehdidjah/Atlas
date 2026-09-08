export type AuthProvider = 'google' | 'facebook';
export interface AuthProviders {
  google: boolean;
  facebook: boolean;
  hosted: boolean;
}
export interface AuthSession {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    defaultWorkspaceId: string;
  } | null;
  workspaces: Array<{ id: string; name: string; role: string }>;
}
export const safeAuthReturnTo = (value: unknown): string | undefined => {
  if (
    typeof value !== 'string' ||
    value.length > 500 ||
    /[\\%#\s]/.test(value) ||
    Array.from(value).some(
      (character) =>
        character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
    )
  )
    return undefined;
  return /^\/workspaces\/[A-Za-z0-9_-]{1,80}\/(?:overview(?:\/chat\/[A-Za-z0-9_-]{1,80})?|connections(?:\/meta)?|performance(?:\/(?:rules|analyze|launch|activity))?|assistant|stage)(?:\?[A-Za-z0-9_=&+.,:-]*)?$/.test(
    value,
  )
    ? value
    : undefined;
};
const read = async <T>(url: string): Promise<T> => {
  const response = await fetch(url, {
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok)
    throw new Error(
      'Account services are unavailable. Try again or explore the demo.',
    );
  return response.json() as Promise<T>;
};
export const authApi = {
  providers: (): Promise<AuthProviders> =>
    read<AuthProviders>('/api/auth/providers'),
  session: (): Promise<AuthSession> => read<AuthSession>('/api/auth/session'),
  startUrl: (provider: AuthProvider, returnTo?: string): string => {
    if (provider !== 'google' && provider !== 'facebook')
      throw new Error('Unsupported sign-in provider.');
    const safe = safeAuthReturnTo(returnTo);
    return `/api/auth/${provider}/start${safe ? `?${new URLSearchParams({ returnTo: safe })}` : ''}`;
  },
  signOut: async (): Promise<void> => {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok)
      throw new Error('Sign-out could not be completed. Please try again.');
  },
};
