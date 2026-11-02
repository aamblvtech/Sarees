import { BaseTryOnAdapter } from './baseAdapter.js';

/**
 * Mock Try-On Provider Adapter
 * 
 * Simulates high-fashion neural fitting for development and testing.
 * Transparently indicates it is a simulation prototype and does not claim
 * actual live AI image generation is running.
 */
export class MockTryOnAdapter extends BaseTryOnAdapter {
  constructor() {
    super('mock');
  }

  async processTryOn({ userPhotoUrl, garmentImageUrl, selectedSize = 'M', options = {} }) {
    const startTime = Date.now();

    // Simulate realistic neural parsing and warping latency (1.2 - 2 seconds)
    const simulatedDelayMs = 1500;
    await new Promise((resolve) => setTimeout(resolve, simulatedDelayMs));

    // For the mock visual preview, we can use the garment's high-fashion lookbook image
    // or an editorial composited presentation.
    const resultImageUrl = garmentImageUrl;

    const processingTimeMs = Date.now() - startTime;

    return {
      success: true,
      provider: 'mock-simulation-v1',
      resultImageUrl,
      isSimulation: true,
      simulationDisclaimer: 'Prototype Mock Result — Initial Development Milestone. Generative AI cloth-warping is simulated for UI/UX testing.',
      fitScore: 0.96,
      compositeDetails: {
        torsoAlignment: 'calibrated',
        shoulderWidthRatio: '0.98 (balanced)',
        fabricDrapePhysics: 'simulation_silk_wool_hybrid',
        detectedLighting: 'warm_studio_ivory',
        selectedSize,
        fitPreference: options.fitPreference || 'tailored',
        simulatedAt: new Date().toISOString()
      },
      processingTimeMs
    };
  }
}

