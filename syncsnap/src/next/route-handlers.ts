import type { SyncsnapServer } from '../client';
import type {
  DownloadUrlResponse,
  Job,
  PresignedUrlResponse,
  WaitCompletionResponse,
} from '../types';

type NextParams = { params: { id: string } | Promise<{ id: string }> };
type CatchAllParams = {
  params?:
    | Record<string, string | string[] | undefined>
    | Promise<Record<string, string | string[] | undefined>>;
};

function json(data: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
}

function parseExpiration(url: string): number | undefined {
  const { searchParams } = new URL(url);
  const raw = searchParams.get('expiration');
  if (!raw) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

function parseWaitOptions(url: string): {
  timeoutMs?: number;
  intervalMs?: number;
} {
  const { searchParams } = new URL(url);
  const timeoutMs = parseOptionalPositiveNumber(searchParams.get('timeoutMs'));
  const intervalMs = parseOptionalPositiveNumber(
    searchParams.get('intervalMs')
  );
  return { timeoutMs, intervalMs };
}

function parseOptionalPositiveNumber(value: string | null): number | undefined {
  if (value == null) return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

async function resolveParams<T>(
  params?: T | Promise<T>
): Promise<T | undefined> {
  if (!params) return undefined;
  if (typeof (params as Promise<T>).then === 'function') {
    return await (params as Promise<T>);
  }
  return params as T;
}

function getCatchAllPath(
  params?: Record<string, string | string[] | undefined>
): string[] {
  if (!params) return [];
  for (const value of Object.values(params)) {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string' && value.length > 0) return [value];
  }
  return [];
}

export function createJobHandler(client: SyncsnapServer) {
  return async function POST(): Promise<Response> {
    const job = await client.createJob();
    return json(job);
  };
}

export function getJobHandler(client: SyncsnapServer) {
  return async function GET(
    _request: Request,
    context: NextParams
  ): Promise<Response> {
    const resolved = await resolveParams(context.params);
    if (!resolved?.id) {
      return json({ error: 'Job id is required' }, { status: 400 });
    }
    const job = await client.getJob(resolved.id);
    return json(job);
  };
}

export function getDownloadUrlHandler(client: SyncsnapServer) {
  return async function GET(
    request: Request,
    context: NextParams
  ): Promise<Response> {
    const resolved = await resolveParams(context.params);
    if (!resolved?.id) {
      return json({ error: 'Job id is required' }, { status: 400 });
    }
    const expirationMinutes = parseExpiration(request.url);
    const response: PresignedUrlResponse = await client.getDownloadUrl(
      resolved.id,
      { expirationMinutes }
    );
    return json(response);
  };
}

export interface CreateRouteHandlerOptions {
  client: SyncsnapServer;
  /**
   * Called when a job completes (after server-side polling). Receives the job and, when
   * status is "completed", the presigned download URL. Whatever this returns is sent to
   * the client and passed to `useSyncsnapJob`'s `onCompleted(job, result)`.
   */
  onCompleted?: (
    job: Job,
    presigned?: PresignedUrlResponse
  ) => unknown | Promise<unknown>;
}

export function createRouteHandler(options: CreateRouteHandlerOptions) {
  const { client, onCompleted: onCompletedCallback } = options;

  return {
    GET: async (
      request: Request,
      context: CatchAllParams
    ): Promise<Response> => {
      const resolved = await resolveParams(context.params);
      const segments = getCatchAllPath(resolved);
      if (segments.length === 2 && segments[0] === 'job') {
        const job = await client.getJob(segments[1]);
        return json(job);
      }

      if (
        segments.length === 3 &&
        segments[0] === 'job' &&
        segments[2] === 'download'
      ) {
        const jobId = segments[1];
        const job = await client.getJob(jobId);
        if (job.status !== 'completed') {
          return json({ error: 'Job is not completed' }, { status: 400 });
        }
        const expirationMinutes = parseExpiration(request.url);
        const presigned: PresignedUrlResponse = await client.getDownloadUrl(
          jobId,
          {
            expirationMinutes,
          }
        );
        const response: DownloadUrlResponse = { ...presigned };
        if (onCompletedCallback) {
          const payload = await onCompletedCallback(job, presigned);
          if (payload !== undefined) {
            response.completedPayload = payload;
          }
        }
        return json(response);
      }

      if (
        segments.length === 3 &&
        segments[0] === 'job' &&
        segments[2] === 'wait'
      ) {
        const jobId = segments[1];
        const { timeoutMs, intervalMs } = parseWaitOptions(request.url);
        try {
          const job = await client.waitForJobCompletion(jobId, {
            timeoutMs,
            intervalMs,
          });
          const body: WaitCompletionResponse = { job };
          if (job.status === 'completed') {
            const presigned: PresignedUrlResponse =
              await client.getDownloadUrl(jobId);
            const result = onCompletedCallback
              ? await onCompletedCallback(job, presigned)
              : presigned;
            if (result !== undefined) {
              body.result = result;
            }
          } else if (onCompletedCallback) {
            const result = await onCompletedCallback(job);
            if (result !== undefined) {
              body.result = result;
            }
          }
          return json(body);
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Wait failed';
          const isTimeout =
            message.includes('timed out') ||
            message.includes('Polling timed out');
          return json({ error: message }, { status: isTimeout ? 408 : 500 });
        }
      }

      return json({ error: 'Not found' }, { status: 404 });
    },
    POST: async (
      _request: Request,
      context: CatchAllParams
    ): Promise<Response> => {
      const resolved = await resolveParams(context.params);
      const segments = getCatchAllPath(resolved);
      if (segments.length === 1 && segments[0] === 'job') {
        const job = await client.createJob();
        return json(job);
      }

      return json({ error: 'Not found' }, { status: 404 });
    },
  };
}

export type { Job };
