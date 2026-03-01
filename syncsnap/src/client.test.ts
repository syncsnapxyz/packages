import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SyncsnapRateLimitError, SyncsnapServer } from './client';

describe('SyncsnapServer', () => {
  const mockFetch = vi.fn();
  const originalEnv = process.env;

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    process.env = { ...originalEnv, SYNCSNAP_TOKEN: 'test-token' };
    mockFetch.mockReset();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.unstubAllGlobals();
  });

  it('createJob sends POST to /jobs and returns job', async () => {
    const created = {
      id: 'job-1',
      projectId: 'proj-1',
      status: 'pending',
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(created),
    });

    const client = new SyncsnapServer();
    const result = await client.createJob();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.syncsnap.xyz/api/v1/jobs',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'X-API-KEY': 'test-token',
        }),
      })
    );
    expect(result).toEqual(created);
  });

  it('getJob sends GET to /jobs/:id and returns job', async () => {
    const job = {
      id: 'job-1',
      projectId: 'proj-1',
      status: 'completed',
      fileName: 'photo.jpg',
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:01Z',
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(job),
    });

    const client = new SyncsnapServer();
    const result = await client.getJob('job-1');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.syncsnap.xyz/api/v1/jobs/job-1',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'X-API-KEY': 'test-token',
        }),
      })
    );
    expect(result).toEqual(job);
  });

  it('getJob encodes jobId in URL', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: 'job/with/slash' }),
    });

    const client = new SyncsnapServer();
    await client.getJob('job/with/slash');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.syncsnap.xyz/api/v1/jobs/job%2Fwith%2Fslash',
      expect.any(Object)
    );
  });

  it('getUploadUrl sends POST with file_name and optional expiration', async () => {
    const presigned = {
      url: 'https://s3.example.com/upload',
      fileName: 'photo.jpg',
      expiration: '2025-01-01T01:00:00Z',
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(presigned),
    });

    const client = new SyncsnapServer();
    const result = await client.getUploadUrl('job-1', {
      fileName: 'photo.jpg',
      expirationMinutes: 60,
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.syncsnap.xyz/api/v1/jobs/job-1/presigned-upload-url',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          file_name: 'photo.jpg',
          expiration: 60,
        }),
      })
    );
    expect(result).toEqual(presigned);
  });

  it('getDownloadUrl sends POST with optional expiration', async () => {
    const presigned = {
      url: 'https://s3.example.com/download',
      fileName: 'photo.jpg',
      expiration: '2025-01-01T01:00:00Z',
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(presigned),
    });

    const client = new SyncsnapServer();
    const result = await client.getDownloadUrl('job-1', {
      expirationMinutes: 30,
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.syncsnap.xyz/api/v1/jobs/job-1/presigned-download-url',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ expiration: 30 }),
      })
    );
    expect(result).toEqual(presigned);
  });

  it('throws with API error message when response is not ok', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: 'Invalid API key' }),
    });

    const client = new SyncsnapServer();
    await expect(client.createJob()).rejects.toThrow('Invalid API key');
  });

  it('throws SyncsnapRateLimitError when response is 429', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: () => Promise.resolve({ error: 'Rate limit exceeded' }),
    });

    const client = new SyncsnapServer();
    const err = await client.createJob().then(
      () => null,
      (e) => e
    );
    expect(err).toBeInstanceOf(SyncsnapRateLimitError);
    expect(err).toHaveProperty('message', 'Rate limit exceeded');
    expect(err).toHaveProperty('statusCode', 429);
  });

  it('waitForJobCompletion returns when job is completed', async () => {
    const pending = {
      id: 'job-1',
      projectId: 'proj-1',
      status: 'pending',
      fileName: null,
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
    };
    const completed = { ...pending, status: 'completed' as const };
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(pending) })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(completed),
      });

    const client = new SyncsnapServer();
    const onPoll = vi.fn();
    const result = await client.waitForJobCompletion('job-1', {
      intervalMs: 10,
      timeoutMs: 5000,
      onPoll,
    });

    expect(result.status).toBe('completed');
    expect(onPoll).toHaveBeenCalledTimes(2);
  });

  it('waitForJobCompletion throws when aborted', async () => {
    const controller = new AbortController();
    const pending = {
      id: 'job-1',
      projectId: 'p',
      status: 'pending' as const,
      fileName: null,
      createdAt: '',
      updatedAt: '',
    };
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(pending),
    });

    const client = new SyncsnapServer();
    const start = client.waitForJobCompletion('job-1', {
      intervalMs: 50,
      timeoutMs: 5000,
      signal: controller.signal,
    });
    setTimeout(() => controller.abort(), 30);

    await expect(start).rejects.toThrow('Polling aborted');
  });

  it('waitForJobCompletion throws when timeout is exceeded', async () => {
    const pending = {
      id: 'job-1',
      projectId: 'p',
      status: 'pending' as const,
      fileName: null,
      createdAt: '',
      updatedAt: '',
    };
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(pending),
    });

    const client = new SyncsnapServer();
    await expect(
      client.waitForJobCompletion('job-1', {
        intervalMs: 20,
        timeoutMs: 50,
      })
    ).rejects.toThrow('Polling timed out');
  });
});
