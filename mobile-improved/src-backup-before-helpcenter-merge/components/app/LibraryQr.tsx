import React from 'react';
import { QrCode } from './QrCode';

interface LibraryQrProps {
  value: string;
  imageSource?: string | null;
  className?: string;
  label?: string;
}

/** Uses the Laravel-generated QR when available and keeps the local fallback for previews. */
export function LibraryQr({ value, imageSource, className, label }: LibraryQrProps) {
  if (imageSource) {
    return <img src={imageSource} alt={label || 'Library QR code'} className={className} />;
  }

  return <QrCode value={value} className={className} label={label} />;
}
