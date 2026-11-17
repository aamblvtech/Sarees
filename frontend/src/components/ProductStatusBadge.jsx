import React from 'react';
import { Check, Layers, AlertCircle, EyeOff } from 'lucide-react';

export const ATELIER_FALLBACK_IMAGE = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800" width="600" height="800"><rect width="100%" height="100%" fill="%23FAFAFA"/><circle cx="300" cy="200" r="40" fill="%23F4F4F5" stroke="%23E4E4E7" stroke-width="1.5"/><path d="M260 250 Q300 235 340 250 L360 400 Q300 420 240 400 Z" fill="%23F4F4F5" stroke="%23E4E4E7" stroke-width="1.5"/><text x="300" y="740" font-family="sans-serif" font-weight="500" font-size="12" fill="%2371717A" text-anchor="middle" letter-spacing="3">VASTRA ATELIER</text></svg>`;

export function getProductStatus(product, isImageMissing = false) {
  if (product?.isActive === false) {
    return {
      label: 'Inactive',
      badgeClass: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700',
      icon: EyeOff,
      description: 'Archived from current collection'
    };
  }

  if (isImageMissing || !product?.primaryImage) {
    return {
      label: 'Image missing',
      badgeClass: 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800/40',
      icon: AlertCircle,
      description: 'Studio photography being updated'
    };
  }

  if (product?.tryonCompatibility === 'awaiting_saree_engine') {
    return {
      label: 'Saree AI review',
      badgeClass: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700',
      icon: Layers,
      description: 'Calibrated for Saree Drape Engine'
    };
  }

  if (product?.tryonCompatibility === 'needs_image_replacement' || product?.qualityStatus === 'too_small') {
    return {
      label: 'Review needed',
      badgeClass: 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800/40',
      icon: AlertCircle,
      description: 'Requires higher resolution studio photography'
    };
  }

  if (product?.garmentType === 'accessory' || product?.tryonCompatibility === 'unsupported') {
    return {
      label: 'Catalogue only',
      badgeClass: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700',
      icon: EyeOff,
      description: 'Garment display in catalogue'
    };
  }

  if (product?.tryonCompatibility === 'supported' && ['upper_body', 'lower_body', 'full_body', 'saree'].includes(product?.garmentType)) {
    return {
      label: 'Try-On Ready',
      badgeClass: 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 border-transparent',
      icon: Check,
      description: 'Calibrated for AI try-on'
    };
  }

  return {
    label: 'Catalogue',
    badgeClass: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700',
    icon: EyeOff,
    description: 'Catalog garment'
  };
}

export default function ProductStatusBadge({ product, isImageMissing = false, size = 'sm', className = '' }) {
  const status = getProductStatus(product, isImageMissing);
  const Icon = status.icon;

  const sizeClasses = size === 'xs'
    ? 'text-[8px] px-1.5 py-0.5'
    : size === 'md'
    ? 'text-[11px] px-2.5 py-1'
    : 'text-[9px] px-2 py-0.5';

  const iconSizes = size === 'xs' ? 'w-2 h-2' : size === 'md' ? 'w-3 h-3' : 'w-2.5 h-2.5';

  return (
    <span
      className={`inline-flex items-center space-x-1 font-sans font-medium border rounded-sm ${status.badgeClass} ${sizeClasses} ${className}`}
      title={status.description}
    >
      <Icon className={iconSizes} strokeWidth={1.5} />
      <span>{status.label}</span>
    </span>
  );
}
