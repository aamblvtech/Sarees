import React from 'react';
import { Sparkles, Layers, AlertCircle, EyeOff } from 'lucide-react';

/**
 * Modern Minimalist Fallback Image (data URI SVG)
 * Using approved palette: #FCF8F8 background, #F9DFDF borders, #000000 text
 */
export const ATELIER_FALLBACK_IMAGE = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800" width="600" height="800"><rect width="100%" height="100%" fill="%23FCF8F8"/><circle cx="300" cy="180" r="45" fill="%23FBEFEF" stroke="%23F9DFDF" stroke-width="2"/><path d="M255 240 Q300 220 345 240 L370 380 Q300 410 230 380 Z" fill="%23FBEFEF" stroke="%23F9DFDF" stroke-width="2"/><path d="M230 380 Q300 410 370 380 L400 600 Q300 630 200 600 Z" fill="%23F9DFDF" stroke="%23F5AFAF" stroke-width="2"/><line x1="300" y1="620" x2="300" y2="720" stroke="%23F5AFAF" stroke-width="2.5"/><line x1="220" y1="720" x2="380" y2="720" stroke="%23F5AFAF" stroke-width="2.5"/><text x="300" y="760" font-family="sans-serif" font-weight="600" font-size="13" fill="%23000000" text-anchor="middle" letter-spacing="4">VESTRA STUDIO</text></svg>`;

/**
 * Resolves accurate status labels:
 * - AI Ready: Only if provider supports garmentType AND product image is present & valid.
 * - Saree AI Pending: For sarees.
 * - Provider Unsupported: For accessories.
 * - Image Missing: If image failed to load.
 * - Inactive: If isActive === false.
 */
export function getProductStatus(product, isImageMissing = false) {
  if (product?.isActive === false) {
    return {
      label: 'Inactive',
      badgeClass: 'bg-slate-900 text-slate-300 border-[#F9DFDF] dark:border-slate-800',
      icon: EyeOff,
      description: 'Archived from current collection'
    };
  }

  if (isImageMissing || !product?.primaryImage) {
    return {
      label: 'Image Missing',
      badgeClass: 'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/80 dark:text-amber-200 dark:border-amber-800/40',
      icon: AlertCircle,
      description: 'Product photograph being updated'
    };
  }

  if (product?.garmentType === 'saree' || product?.tryonCompatibility === 'awaiting_saree_engine') {
    return {
      label: 'Saree AI Pending',
      badgeClass: 'bg-[#FBEFEF] text-slate-900 border-[#F5AFAF] dark:bg-slate-800 dark:text-[#F5AFAF] dark:border-slate-700',
      icon: Layers,
      description: 'Awaiting dedicated Saree Pleating & Drape AI Engine'
    };
  }

  if (product?.garmentType === 'accessory' || product?.tryonCompatibility === 'unsupported') {
    return {
      label: 'Catalogue Only',
      badgeClass: 'bg-[#FCF8F8] text-slate-700 border-[#F9DFDF] dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
      icon: EyeOff,
      description: 'Accessories require 3D AR mesh simulation'
    };
  }

  if (product?.tryonCompatibility === 'supported' && ['upper_body', 'lower_body', 'full_body'].includes(product?.garmentType)) {
    return {
      label: 'AI Ready',
      badgeClass: 'bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-200 dark:border-emerald-800/50',
      icon: Sparkles,
      description: 'Calibrated for Genlook virtual try-on'
    };
  }

  return {
    label: 'Catalogue Only',
    badgeClass: 'bg-[#FCF8F8] text-slate-700 border-[#F9DFDF] dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
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
    ? 'text-[11px] px-3 py-1'
    : 'text-[9px] px-2 py-0.5';

  const iconSizes = size === 'xs' ? 'w-2 h-2' : size === 'md' ? 'w-3 h-3' : 'w-2.5 h-2.5';

  return (
    <span
      className={`inline-flex items-center space-x-1 font-mono font-medium uppercase tracking-wider border rounded shadow-xs ${status.badgeClass} ${sizeClasses} ${className}`}
      title={status.description}
    >
      <Icon className={iconSizes} />
      <span>{status.label}</span>
    </span>
  );
}
