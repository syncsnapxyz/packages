import { render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SyncsnapQrCode } from './SyncsnapQrCode';

vi.mock('qrcode', () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,mock'),
  },
}));

describe('SyncsnapQrCode', () => {
  it('renders nothing until QR is generated', async () => {
    const { container } = render(<SyncsnapQrCode jobId="job-1" />);
    await waitFor(() => {
      const img = container.querySelector('img');
      expect(img).toBeInTheDocument();
    });
  });

  it('renders img with data URL and alt text', async () => {
    const { container } = render(<SyncsnapQrCode jobId="job-123" size={200} />);
    await waitFor(() => {
      const img = container.querySelector('img[alt="Syncsnap QR code"]');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'data:image/png;base64,mock');
      expect(img).toHaveAttribute('width', '200');
      expect(img).toHaveAttribute('height', '200');
    });
  });

  it('applies className to img when provided', async () => {
    const { container } = render(
      <SyncsnapQrCode jobId="job-1" className="my-qr" />
    );
    await waitFor(() => {
      const img = container.querySelector('img.my-qr');
      expect(img).toBeInTheDocument();
    });
  });
});
