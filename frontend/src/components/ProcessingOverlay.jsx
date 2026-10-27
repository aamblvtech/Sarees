import React from 'react';
import { Sparkles } from 'lucide-react';

export default function ProcessingOverlay({ stageMessage, garmentName }) {
  return (
    <div className="progress-overlay">
      <div className="progress-spinner-ring"></div>
      
      <div className="progress-stage-title">
        {stageMessage || "Generating Outfit..."}
      </div>

      {garmentName && (
        <div style={{ fontSize: '13px', color: 'var(--gold)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '4px' }}>
          Tailoring {garmentName}
        </div>
      )}

      {/* Honest Indeterminate Animated Shimmer Bar (No fabricated percentage) */}
      <div className="progress-indeterminate">
        <div className="progress-indeterminate-shimmer"></div>
      </div>

      <p className="progress-stage-hint">
        Dedicated virtual try-on diffusion model running on Cloud GPU. Preserving your facial identity, posture, and natural drapery.
      </p>
    </div>
  );
}
