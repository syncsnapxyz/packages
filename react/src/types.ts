export type JobStatus = "pending" | "in_progress" | "completed" | "failed";

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

/** Pre-signed download URL returned by the syncsnap API when a job is completed. */
export interface PresignedUrlResponse {
	url: string;
	fileName: string;
	expiration: string;
}

/**
 * Download URL response. When the server is configured with `onCompleted`,
 * its return value is included as `completedPayload`.
 */
export interface CompletedJobResponse<
	T = unknown,
> extends PresignedUrlResponse {
	completedPayload?: T;
}

export interface UseSyncsnapJobOptions {
	createJobUrl?: string;
	getJobUrl?: (jobId: string) => string;
	/** URL for the server's wait-for-completion endpoint (server polls until job completes). Defaults to getJobUrl(jobId) + '/wait'. */
	getWaitForCompletionUrl?: (jobId: string) => string;
	/** Passed to the wait endpoint as query params. Default timeoutMs: 120000, intervalMs: 2000. */
	waitTimeoutMs?: number;
	waitIntervalMs?: number;
	autoStart?: boolean;
	onJobCreated?: (job: CreateJobResponse) => void;
	/** Called when the job finishes. Result is whatever the server's onCompleted callback returned (when no callback is set, result is the presigned download URL). */
	onCompleted?: (job: Job, result?: unknown) => void;
	onError?: (error: Error) => void;
}

export interface UseSyncsnapJobResult {
	job: Job | null;
	jobId: string | null;
	status: JobStatus | null;
	error: Error | null;
	/** True while waiting for the server to complete the job (wait request in flight). */
	isWaiting: boolean;
	start: () => Promise<void>;
	reset: () => void;
}

export interface SyncsnapQrCodeProps {
	jobId: string;
	baseUrl?: string;
	size?: number;
	className?: string;
	errorCorrectionLevel?: "L" | "M" | "Q" | "H";
}

export interface SyncsnapUploadButtonProps extends UseSyncsnapJobOptions {
	buttonText?: string;
	className?: string;
	qrSize?: number;
	qrBaseUrl?: string;
	errorCorrectionLevel?: "L" | "M" | "Q" | "H";
}
