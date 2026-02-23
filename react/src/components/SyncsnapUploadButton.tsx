'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Job, SyncsnapUploadButtonProps } from '../types';
import { SyncsnapQrCode } from './SyncsnapQrCode';
import { useSyncsnapJob } from '../hooks/useSyncsnapJob';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

type CompletionResult = { job: Job; result?: unknown };
type ResultWithDownloadUrl = { downloadUrl?: string };

export function SyncsnapUploadButton({
  buttonText = 'Start upload',
  className,
  qrSize = 240,
  qrBaseUrl,
  errorCorrectionLevel = 'M',
  onCompleted: userOnCompleted,
  onError: userOnError,
  ...options
}: SyncsnapUploadButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [completedResult, setCompletedResult] =
    useState<CompletionResult | null>(null);
  const [completedError, setCompletedError] = useState<Error | null>(null);

  const handleCompleted = useCallback(
    (job: Job, result?: unknown) => {
      setCompletedResult({ job, result });
      setCompletedError(null);
      setDialogOpen(false);
      userOnCompleted?.(job, result);
    },
    [userOnCompleted]
  );

  const handleError = useCallback(
    (err: Error) => {
      setCompletedError(err);
      setCompletedResult(null);
      setDialogOpen(false);
      userOnError?.(err);
    },
    [userOnError]
  );

  const { jobId, status, start, isWaiting, error, reset } = useSyncsnapJob({
    ...options,
    onCompleted: handleCompleted,
    onError: handleError,
  });

  // Open dialog when we have a job id
  useEffect(() => {
    if (jobId) setDialogOpen(true);
  }, [jobId]);

  const onClick = useCallback(() => {
    setCompletedResult(null);
    setCompletedError(null);
    setDialogOpen(true);
    void start();
  }, [start]);

  const onOpenChange = useCallback(
    (open: boolean) => {
      setDialogOpen(open);
      if (!open) {
        reset();
      }
    },
    [reset]
  );

  const downloadUrl =
    completedResult?.result &&
    typeof completedResult.result === 'object' &&
    completedResult.result !== null &&
    'downloadUrl' in completedResult.result
      ? (completedResult.result as ResultWithDownloadUrl).downloadUrl
      : undefined;

  return (
    <div className={className}>
      <Button type="button" onClick={onClick} disabled={isWaiting}>
        {isWaiting ? 'Preparing...' : buttonText}
      </Button>
      {error ? (
        <p style={{ color: '#dc2626', marginTop: 8 }}>{error.message}</p>
      ) : null}
      {completedError ? (
        <p style={{ color: '#dc2626', marginTop: 8 }}>
          {completedError.message}
        </p>
      ) : null}
      {downloadUrl ? (
        <div
          style={{
            marginTop: 16,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <p style={{ margin: '0 0 8px', fontSize: 14, color: '#555' }}>
            Upload complete
          </p>
          <img
            src={downloadUrl}
            alt="Uploaded"
            style={{
              maxWidth: '100%',
              height: 'auto',
              borderRadius: 8,
              border: '1px solid #e5e5e5',
            }}
          />
        </div>
      ) : null}
      <Dialog open={dialogOpen} onOpenChange={onOpenChange}>
        <DialogContent
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            justifyItems: 'center',
          }}
        >
          <DialogHeader>
            <DialogTitle>Scan to upload</DialogTitle>
            <DialogDescription>
              Scan this QR code with your phone to upload files
            </DialogDescription>
          </DialogHeader>
          {jobId ? (
            <div
              style={{
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                marginTop: 16,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  width: '100%',
                }}
              >
                <SyncsnapQrCode
                  jobId={jobId}
                  baseUrl={qrBaseUrl}
                  size={qrSize}
                  errorCorrectionLevel={errorCorrectionLevel}
                />
              </div>
              {status ? (
                <p style={{ margin: '8px 0 0', fontSize: 14 }}>
                  Status: {status}
                </p>
              ) : null}
              <p
                style={{
                  margin: '16px 0 0',
                  fontSize: 13,
                  color: '#64748b',
                }}
              >
                Powered by{' '}
                <a
                  href="https://syncsnap.com"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  SyncSnap
                </a>
              </p>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
