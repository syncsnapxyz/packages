import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SyncsnapUploadButton } from './SyncsnapUploadButton';

const mockFetch = vi.fn();

describe('SyncsnapUploadButton', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders button with default text', () => {
    render(<SyncsnapUploadButton />);
    expect(
      screen.getByRole('button', { name: /start upload/i })
    ).toBeInTheDocument();
  });

  it('renders button with custom text', () => {
    render(<SyncsnapUploadButton buttonText="Scan to upload" />);
    expect(
      screen.getByRole('button', { name: /scan to upload/i })
    ).toBeInTheDocument();
  });

  it('opens dialog and shows scan title when start is triggered', async () => {
    const user = userEvent.setup();
    const created = {
      id: 'job-1',
      projectId: 'p',
      status: 'pending',
      createdAt: '',
      updatedAt: '',
    };
    // Resolve create-job only; leave wait pending so the dialog stays open
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(created) })
      .mockImplementationOnce(() => new Promise(() => {}));

    render(<SyncsnapUploadButton />);
    await user.click(screen.getByRole('button', { name: /start upload/i }));

    await waitFor(() => {
      expect(screen.getByText(/scan to upload/i)).toBeInTheDocument();
    });
  });
});
