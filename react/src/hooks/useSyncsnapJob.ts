"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
	CreateJobResponse,
	Job,
	UseSyncsnapJobOptions,
	UseSyncsnapJobResult,
} from "../types";
import { fetchJson } from "../utils";

function defaultGetJobUrl(jobId: string): string {
	return `/api/syncsnap/job/${encodeURIComponent(jobId)}`;
}

function defaultGetWaitForCompletionUrl(
	getJobUrl: (jobId: string) => string,
): (jobId: string) => string {
	return (jobId: string): string => {
		const base = getJobUrl(jobId).replace(/\/$/, "");
		return `${base}/wait`;
	};
}

interface WaitCompletionResponse {
	job: Job;
	result?: unknown;
}

export function useSyncsnapJob(
	options: UseSyncsnapJobOptions = {},
): UseSyncsnapJobResult {
	const getJobUrlFn = options.getJobUrl ?? defaultGetJobUrl;
	const {
		createJobUrl = "/api/syncsnap/job",
		getJobUrl = defaultGetJobUrl,
		getWaitForCompletionUrl = defaultGetWaitForCompletionUrl(getJobUrlFn),
		waitTimeoutMs = 120000,
		waitIntervalMs = 2000,
		autoStart = false,
		onJobCreated,
		onCompleted,
		onError,
	} = options;

	const [job, setJob] = useState<Job | null>(null);
	const [error, setError] = useState<Error | null>(null);
	const [isWaiting, setIsWaiting] = useState(false);
	const abortControllerRef = useRef<AbortController | null>(null);

	const start = useCallback(async () => {
		setError(null);
		abortControllerRef.current?.abort();
		abortControllerRef.current = new AbortController();
		const signal = abortControllerRef.current.signal;

		try {
			const created = await fetchJson<CreateJobResponse>(createJobUrl, {
				method: "POST",
			});
			const createdJob: Job = {
				...created,
				fileName: null,
			};
			setJob(createdJob);
			onJobCreated?.(created);

			const waitUrl = getWaitForCompletionUrl(created.id);
			const url = new URL(waitUrl, typeof window !== "undefined" ? window.location.origin : "http://localhost");
			url.searchParams.set("timeoutMs", String(waitTimeoutMs));
			url.searchParams.set("intervalMs", String(waitIntervalMs));

			setIsWaiting(true);
			const { job: finalJob, result } =
				await fetchJson<WaitCompletionResponse>(url.toString(), {
					signal,
				});
			setJob(null);
			setIsWaiting(false);
			onCompleted?.(finalJob, result);
		} catch (err) {
			setIsWaiting(false);
			setJob(null);
			if (signal.aborted) {
				return;
			}
			const error =
				err instanceof Error ? err : new Error("Syncsnap job failed");
			setError(error);
			onError?.(error);
		}
	}, [
		createJobUrl,
		getWaitForCompletionUrl,
		waitTimeoutMs,
		waitIntervalMs,
		onJobCreated,
		onCompleted,
		onError,
	]);

	const reset = useCallback(() => {
		abortControllerRef.current?.abort();
		abortControllerRef.current = null;
		setJob(null);
		setIsWaiting(false);
		setError(null);
	}, []);

	useEffect(() => {
		if (autoStart) {
			void start();
		}
	}, [autoStart, start]);

	return {
		job,
		jobId: job?.id ?? null,
		status: job?.status ?? null,
		error,
		isWaiting,
		start,
		reset,
	};
}
