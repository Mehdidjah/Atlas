/// <reference types="@cloudflare/workers-types" />

import type { AuthenticatedUser } from './types';

const apiHeaders = {
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json; charset=utf-8',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
};

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export const json = (body: unknown, init: ResponseInit = {}) => {
  const headers = new Headers(init.headers);
  for (const [name, value] of Object.entries(apiHeaders)) {
    headers.set(name, value);
  }
  return new Response(JSON.stringify(body), { ...init, headers });
};

export const noContent = () =>
  new Response(null, {
    status: 204,
    headers: {
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
    },
  });

export const requireUser = (request: Request): AuthenticatedUser => {
  const id = request.headers.get('oai-authenticated-user-id')?.trim();
  if (!id) {
    throw new ApiError(
      401,
      'authentication_required',
      'Sign in to Aster before connecting Meta Ads.',
    );
  }
  return {
    id,
    email: request.headers.get('oai-authenticated-user-email'),
    name: request.headers.get('oai-authenticated-user-name'),
  };
};

export const requireSameOrigin = (request: Request) => {
  const origin = request.headers.get('origin');
  const expected = new URL(request.url).origin;
  if (!origin || origin !== expected) {
    throw new ApiError(403, 'invalid_origin', 'The request origin is invalid.');
  }
};

export const parseJsonBody = async <T>(request: Request): Promise<T> => {
  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().startsWith('application/json')) {
    throw new ApiError(
      415,
      'invalid_content_type',
      'Send a JSON request body.',
    );
  }
  const declaredLength = Number(request.headers.get('content-length') ?? 0);
  if (declaredLength > 32_000) {
    throw new ApiError(
      413,
      'request_too_large',
      'The request body is too large.',
    );
  }
  try {
    return (await request.json()) as T;
  } catch {
    throw new ApiError(
      400,
      'invalid_json',
      'The request body is not valid JSON.',
    );
  }
};

export const asErrorResponse = (error: unknown) => {
  if (error instanceof ApiError) {
    return json(
      { error: { code: error.code, message: error.message } },
      { status: error.status },
    );
  }
  console.error('Unhandled API error', error);
  return json(
    {
      error: {
        code: 'internal_error',
        message: 'Something went wrong. Please try again.',
      },
    },
    { status: 500 },
  );
};
