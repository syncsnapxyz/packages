import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSyncsnapJob } from './useSyncsnapJob';

describe('useSyncsnapJob', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    mockFetch.mockReset();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns initial state', () => {
    const { result } = renderHook(() => useSyncsnapJob());
    expect(result.current.job).toBeNull();
    expect(result.current.jobId).toBeNull();
    expect(result.current.status).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.isWaiting).toBe(false);
    expect(typeof result.current.start).toBe('function');
    expect(typeof result.current.reset).toBe('function');
  });

  it('start creates job and calls createJobUrl', async () => {
    const created = {
      id: 'job-1',
      projectId: 'proj-1',
      status: 'pending',
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
    };
    const waitBody = { job: { ...created, status: 'completed' }, result: {} };
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(created),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(waitBody),
      });

    const onJobCreated = vi.fn();
    const onCompleted = vi.fn();
    const { result } = renderHook(() =>
      useSyncsnapJob({
        createJobUrl: '/api/create',
        onJobCreated,
        onCompleted,
      })
    );

    await act(async () => {
      await result.current.start();
    });

    expect(mockFetch).toHaveBeenNthCalledWith(
      1,
      '/api/create',
      expect.objectContaining({ method: 'POST' })
    );
    expect(onJobCreated).toHaveBeenCalledWith(created);
    expect(onCompleted).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'job-1', status: 'completed' }),
      {}
    );
  });

  it('calls onError when create fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'Server error' }),
    });

    const onError = vi.fn();
    const { result } = renderHook(() =>
      useSyncsnapJob({ createJobUrl: '/api/create', onError })
    );

    await act(async () => {
      await result.current.start();
    });

    expect(onError).toHaveBeenCalledWith(expect.any(Error));
    expect(result.current.error).not.toBeNull();
  });

  it('reset clears state', async () => {
    const created = {
      id: 'job-1',
      projectId: 'p',
      status: 'pending',
      createdAt: '',
      updatedAt: '',
    };
    const waitBody = { job: { ...created, status: 'completed' }, result: {} };
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(created),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(waitBody),
      });

    const { result } = renderHook(() =>
      useSyncsnapJob({ createJobUrl: '/api/job' })
    );

    await act(async () => {
      await result.current.start();
    });

    expect(result.current.jobId).toBeNull();
    expect(result.current.isWaiting).toBe(false);

    act(() => {
      result.current.reset();
    });

    expect(result.current.job).toBeNull();
    expect(result.current.jobId).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.isWaiting).toBe(false);
  });
});
