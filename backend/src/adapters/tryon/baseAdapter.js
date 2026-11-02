/**
 * Abstract Base Try-On Provider Adapter
 * Defines the contract that any AI engine (Mock, IDM-VTON, Replicate, Fal.ai) must implement.
 */
export class BaseTryOnAdapter {
  constructor(name) {
    this.name = name;
  }

  /**
   * Process a virtual try-on job
   * @param {Object} params
   * @param {string} params.userPhotoUrl - URL or relative path of customer silhouette
   * @param {string} params.garmentImageUrl - URL or relative path of garment product
   * @param {string} [params.selectedSize] - Size chosen (e.g. S, M, L)
   * @param {Object} [params.options] - Tailoring options (e.g. fitPreference: 'tailored'|'fluid'|'oversized')
   * @returns {Promise<{
   *   success: boolean,
   *   resultImageUrl: string,
   *   compositeDetails: Object,
   *   fitScore: number,
   *   provider: string,
   *   processingTimeMs: number
   * }>}
   */
  async processTryOn(params) {
    throw new Error(`processTryOn() must be implemented by adapter ${this.name}`);
  }
}

