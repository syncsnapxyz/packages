export function createUploadUrl(
  jobId: string,
  options?: { baseUrl?: string }
): string {
  const baseUrl = options?.baseUrl ?? 'https://upload.syncsnap.xyz/';
  const url = new URL(baseUrl);
  url.searchParams.set('job_id', jobId);
  return url.toString();
}

export async function fetchJson<T>(
  url: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(url, init);
  const data = (await res.json().catch(() => ({}))) as T & {
    error?: string;
  };

  if (!res.ok) {
    const message =
      typeof data === 'object' && data && 'error' in data && data.error
        ? String(data.error)
        : `Syncsnap request failed (${res.status})`;
    throw new Error(message);
  }

  return data as T;
}
