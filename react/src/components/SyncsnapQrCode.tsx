"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import type { SyncsnapQrCodeProps } from "../types";
import { createUploadUrl } from "../utils";

export function SyncsnapQrCode({
	jobId,
	baseUrl,
	size = 240,
	className,
	errorCorrectionLevel = "M",
}: SyncsnapQrCodeProps) {
	const [dataUrl, setDataUrl] = useState<string | null>(null);
	const [error, setError] = useState<Error | null>(null);

	useEffect(() => {
		let mounted = true;
		const url = createUploadUrl(jobId, { baseUrl });

		QRCode.toDataURL(url, {
			width: size,
			errorCorrectionLevel,
		})
			.then((value) => {
				if (!mounted) return;
				setDataUrl(value);
				setError(null);
			})
			.catch((err) => {
				if (!mounted) return;
				setDataUrl(null);
				setError(
					err instanceof Error
						? err
						: new Error("Failed to generate QR"),
				);
			});

		return () => {
			mounted = false;
		};
	}, [jobId, baseUrl, size, errorCorrectionLevel]);

	if (error) {
		return null;
	}

	if (!dataUrl) {
		return null;
	}

	return (
		<img
			src={dataUrl}
			alt="Syncsnap QR code"
			width={size}
			height={size}
			className={className}
			style={{
				display: "block",
				margin: "0 auto",
				width: size,
				height: size,
			}}
		/>
	);
}
