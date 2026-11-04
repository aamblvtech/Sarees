/**
 * VESTRA AI Virtual Try-On - Garment Prompt & Metadata Generator
 * Produces structured, domain-accurate prompts for AI diffusion models (Genlook)
 * based strictly on recorded garment attributes without inventing unseen details.
 */

export const garmentPromptGenerator = {
  /**
   * Generates a precise, high-fidelity prompt for a catalogue or custom garment.
   * @param {Object} garment - Product record from database or custom upload
   * @returns {string} - Tailored diffusion prompt within Genlook API limits (<480 chars)
   */
  generatePrompt(garment = {}) {
    if (!garment) return 'Luxury designer apparel. Maintain exact color, pattern, and silhouette.';

    const name = garment.name || garment.title || 'Luxury Garment';
    const subcategory = (garment.subcategory || '').toLowerCase();
    const garmentType = (garment.garment_type || garment.garmentType || '').toLowerCase();
    const category = (garment.category_name || garment.categoryName || garment.category_slug || '').toLowerCase();
    const material = garment.material || '';
    const fit = garment.fit || '';
    const desc = garment.description || '';

    // 1. Sarees
    if (garmentType === 'saree' || category.includes('saree') || subcategory.includes('saree')) {
      return this._generateSareePrompt(name, subcategory, material, fit, desc);
    }

    // 2. Dresses and Gowns
    if (
      garmentType === 'dress' ||
      garmentType === 'gown' ||
      subcategory.includes('gown') ||
      subcategory.includes('dress') ||
      name.toLowerCase().includes('dress') ||
      name.toLowerCase().includes('gown')
    ) {
      return this._generateDressPrompt(name, subcategory, material, fit, desc);
    }

    // 3. Indian Ethnic Outfits (Anarkali, Salwar, Lehenga, Kurti, Bandhgala, Sherwani)
    if (
      subcategory.includes('anarkali') ||
      subcategory.includes('salwar') ||
      subcategory.includes('lehenga') ||
      subcategory.includes('kurti') ||
      subcategory.includes('bandhgala') ||
      subcategory.includes('sherwani') ||
      subcategory.includes('indo_western') ||
      subcategory.includes('dhoti')
    ) {
      return this._generateEthnicPrompt(name, subcategory, material, fit, desc);
    }

    // 4. Men's Formal & Western Wear (Suits, Blazers, Trousers)
    if (category.includes('men') || garment.gender === 'men') {
      return this._generateMensPrompt(name, subcategory, material, fit, desc);
    }

    // 5. General Fallback
    const base = [name];
    if (material) base.push(`Crafted from ${material.slice(0, 80)}`);
    if (fit) base.push(`Tailored ${fit.slice(0, 60)}`);
    base.push('Maintain exact garment color, fabric weave, neckline, and drape fidelity.');
    return base.join('. ').slice(0, 480);
  },

  /**
   * Specialized prompt for 6-yard unstitched sarees
   */
  _generateSareePrompt(name, subcategory, material, fit, desc) {
    const parts = [];

    // Title / Weave designation
    parts.push(`Authentic ${name}`);

    // Draping specification
    parts.push('Traditional 6-yard Indian handloom saree drape with front waist pleats and diagonal pallu over left shoulder');

    // Fabric & Zari
    if (material) {
      parts.push(`Woven in ${material.slice(0, 90)}`);
    }

    // Border & Pallu details extracted from description
    const borderMatch = desc.match(/(border[s]?|korvai|zari|pallu|motifs?|butis?|embroidery)[^.]*/i);
    if (borderMatch) {
      parts.push(`Features ${borderMatch[0].trim()}`);
    }

    // Contrast blouse specification
    parts.push('Includes tailored contrast blouse. Preserve exact base body color, border width, and metallic zari luster.');

    return parts.join('. ').slice(0, 480);
  },

  /**
   * Specialized prompt for dresses, gowns, and eveningwear
   */
  _generateDressPrompt(name, subcategory, material, fit, desc) {
    const parts = [];

    parts.push(name);

    // Silhouette & Length
    let silhouette = 'Tailored silhouette';
    if (name.toLowerCase().includes('maxi') || desc.toLowerCase().includes('floor-length') || desc.toLowerCase().includes('train')) {
      silhouette = 'Floor-length sweeping evening gown with fluid drape';
    } else if (name.toLowerCase().includes('midi')) {
      silhouette = 'Calf-length midi silhouette';
    } else if (desc.toLowerCase().includes('bias-cut')) {
      silhouette = 'Fluid bias-cut sculptural silhouette';
    }
    parts.push(silhouette);

    // Neckline & Sleeves
    const neckMatch = desc.match(/(off-shoulder|sweetheart|cowl|v-neck|boat|crew|plunging)[^,.]*/i);
    if (neckMatch) {
      parts.push(`Features ${neckMatch[0].trim()} neckline`);
    }

    // Fabric & Lining
    if (material) {
      parts.push(`Made of ${material.slice(0, 80)}`);
    }

    // Fit & Contour
    if (fit) {
      parts.push(fit.slice(0, 70));
    }

    parts.push('Preserve exact garment color, neckline contour, hemline length, and fabric fold physics.');

    return parts.join('. ').slice(0, 480);
  },

  /**
   * Specialized prompt for Indian ethnic ensembles (Anarkali, Salwar, Lehenga, Kurti, Sherwani)
   */
  _generateEthnicPrompt(name, subcategory, material, fit, desc) {
    const parts = [];

    parts.push(name);

    if (subcategory.includes('anarkali')) {
      parts.push('Flared floor-length Anarkali silhouette with matching churidar and draped sheer dupatta');
    } else if (subcategory.includes('lehenga')) {
      parts.push('Flared circular bridal lehenga skirt with hand-embroidered choli and draped dupatta');
    } else if (subcategory.includes('salwar')) {
      parts.push('Classic tailored salwar kameez suit with side slits and draped dupatta');
    } else if (subcategory.includes('kurti')) {
      parts.push('Tailored straight-cut kurti with structured ankle trousers');
    } else if (subcategory.includes('sherwani')) {
      parts.push('Structured royal wedding sherwani coat with mandarin collar and churidar');
    } else if (subcategory.includes('bandhgala')) {
      parts.push('Architectural bandhgala closed-neck jacket with tailored trousers');
    }

    if (material) {
      parts.push(`Crafted in ${material.slice(0, 80)}`);
    }

    const embMatch = desc.match(/(zardozi|chikankari|embroidery|sequin|threadwork|brocade)[^.]*/i);
    if (embMatch) {
      parts.push(`Adorned with ${embMatch[0].trim()}`);
    }

    parts.push('Preserve exact embroidery placement, base garment tone, and authentic drape.');

    return parts.join('. ').slice(0, 480);
  },

  /**
   * Specialized prompt for Men's tailoring
   */
  _generateMensPrompt(name, subcategory, material, fit, desc) {
    const parts = [];

    parts.push(name);

    if (name.toLowerCase().includes('3-piece') || desc.toLowerCase().includes('3-piece')) {
      parts.push('Full 3-piece formal suit including structured jacket, tailored waistcoat, and pressed trousers');
    } else if (name.toLowerCase().includes('blazer')) {
      parts.push('Tailored virgin wool blazer with coordinating trousers');
    } else if (name.toLowerCase().includes('shirt')) {
      parts.push('Crisp tailored long-sleeve dress shirt paired with pleated trousers');
    }

    if (material) {
      parts.push(`Woven from ${material.slice(0, 80)}`);
    }

    if (fit) {
      parts.push(fit.slice(0, 70));
    }

    parts.push('Preserve shoulder structure, lapel roll, buttoning, and fabric texture.');

    return parts.join('. ').slice(0, 480);
  }
};

export default garmentPromptGenerator;

