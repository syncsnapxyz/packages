import type {
  CreateJobResponse,
  Job,
  PresignedUrlResponse,
  WaitForJobOptions,
} from './types';

const SYNCSNAP_API_BASE_URL = 'https://api.syncsnap.xyz/api';

export class SyncsnapServer {
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly fetcher: typeof fetch;

  constructor(apiVersion: string = 'v1') {
    this.baseUrl = `${SYNCSNAP_API_BASE_URL}/${apiVersion}`;
    this.token = process.env.SYNCSNAP_TOKEN!;
    this.fetcher = fetch;
  }

  private authHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'X-API-KEY': this.token,
    };
  }

  private async requestJson<T>(url: string, init?: RequestInit): Promise<T> {
    const res = await this.fetcher(url, init);
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

  async createJob(): Promise<CreateJobResponse> {
    const url = `${this.baseUrl}/jobs`;
    return this.requestJson<CreateJobResponse>(url, {
      method: 'POST',
      headers: this.authHeaders(),
    });
  }

  async getJob(jobId: string): Promise<Job> {
    const url = `${this.baseUrl}/jobs/${encodeURIComponent(jobId)}`;
    return this.requestJson<Job>(url, {
      method: 'GET',
      headers: this.authHeaders(),
    });
  }

  async getUploadUrl(
    jobId: string,
    options: { fileName: string; expirationMinutes?: number }
  ): Promise<PresignedUrlResponse> {
    const url = `${this.baseUrl}/jobs/${encodeURIComponent(
      jobId
    )}/presigned-upload-url`;
    return this.requestJson<PresignedUrlResponse>(url, {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify({
        file_name: options.fileName,
        expiration: options.expirationMinutes,
      }),
    });
  }

  async getDownloadUrl(
    jobId: string,
    options?: { expirationMinutes?: number }
  ): Promise<PresignedUrlResponse> {
    const url = `${this.baseUrl}/jobs/${encodeURIComponent(
      jobId
    )}/presigned-download-url`;
    return this.requestJson<PresignedUrlResponse>(url, {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify({
        expiration: options?.expirationMinutes,
      }),
    });
  }

  async waitForJobCompletion(
    jobId: string,
    options: WaitForJobOptions = {}
  ): Promise<Job> {
    const intervalMs = options.intervalMs ?? 2000;
    const timeoutMs = options.timeoutMs ?? 120000;
    const startedAt = Date.now();

    while (true) {
      if (options.signal?.aborted) {
        throw new Error('Polling aborted');
      }
      if (Date.now() - startedAt > timeoutMs) {
        throw new Error('Polling timed out');
      }

      const job = await this.getJob(jobId);
      options.onPoll?.(job);

      if (job.status === 'completed' || job.status === 'failed') {
        return job;
      }

      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }
}
