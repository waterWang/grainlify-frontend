/**
 * The HTTP error type, deliberately in its own module.
 *
 * ## Why not in client.ts
 *
 * Almost every component test does `vi.mock('.../shared/api/client')`. A mock
 * only provides what it declares, so anything imported from that module by the
 * component under test must also appear in every mock — and when it does not,
 * the failure is indirect: vitest throws "No X export is defined on the mock"
 * from inside the component's `catch`, which turns a handled error into an
 * unhandled one and reports as a completely unrelated assertion failure.
 *
 * Keeping the error type here means a component can narrow an error without
 * adding a new export to every mock in the codebase.
 *
 * ## Why the guard is structural
 *
 * `instanceof` compares class identity, which fails across a mocked or
 * duplicated module even when the object is, for all practical purposes, an
 * ApiError. The shape is what callers actually depend on.
 */

export class ApiError extends Error {
  readonly status: number;
  readonly data: Record<string, unknown> | undefined;

  constructor(message: string, status: number, data?: Record<string, unknown>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export function isApiError(e: unknown): e is ApiError {
  return (
    e instanceof Error &&
    e.name === 'ApiError' &&
    typeof (e as ApiError).status === 'number'
  );
}
