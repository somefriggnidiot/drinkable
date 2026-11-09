export async function apiFetch<T = Record<string, unknown>>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers: {
      ...(options.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...options.headers,
    },
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error || "We couldn’t complete your request.");
  return result as T;
}
export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Please try again.";
}
