export type JobStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface Job {
  id: string;
  projectId: string;
  status: JobStatus;
  fileName?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateJobResponse {
  id: string;
  projectId: string;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PresignedUrlResponse {
  url: string;
  fileName: string;
  expiration: string;
}

/**
 * Response for the download URL endpoint. When the server is configured with
 * `onCompleted`, its return value is included as `completedPayload`.
 */
export interface DownloadUrlResponse<T = unknown> extends PresignedUrlResponse {
  completedPayload?: T;
}

export interface WaitForJobOptions {
  intervalMs?: number;
  timeoutMs?: number;
  onPoll?: (job: Job) => void;
  signal?: AbortSignal;
}

/** Response from the wait-for-completion endpoint. `result` is whatever the server's onCompleted callback returned. */
export interface WaitCompletionResponse<T = unknown> {
  job: Job;
  result?: T;
}
