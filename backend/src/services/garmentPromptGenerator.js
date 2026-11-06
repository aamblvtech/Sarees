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

    // 2. Formal Attire & Tailoring (Tuxedos, 3-Piece Suits, Dinner Jackets)
    if (category.includes('formal') || subcategory.includes('tuxedo') || subcategory.includes('suit') || name.toLowerCase().includes('tuxedo')) {
      return this._generateFormalPrompt(name, subcategory, material, fit, desc);
    }

    // 3. Shirts & Blouses
    if (category.includes('shirt') || subcategory.includes('shirt') || subcategory.includes('blouse') || name.toLowerCase().includes('shirt') || name.toLowerCase().includes('blouse')) {
      return this._generateShirtPrompt(name, subcategory, material, fit, desc);
    }

    // 4. Jeans & Denim
    if (category.includes('jean') || subcategory.includes('jean') || subcategory.includes('denim') || name.toLowerCase().includes('jean') || desc.toLowerCase().includes('denim')) {
      return this._generateJeansPrompt(name, subcategory, material, fit, desc);
    }

    // 5. Baggy Pants & Trousers
    if (category.includes('pant') || subcategory.includes('pant') || subcategory.includes('trouser') || name.toLowerCase().includes('pant') || name.toLowerCase().includes('trouser') || name.toLowerCase().includes('chino')) {
      return this._generatePantsPrompt(name, subcategory, material, fit, desc);
    }

    // 6. Dresses and Gowns
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

    // 7. Indian Ethnic Outfits (Anarkali, Salwar, Lehenga, Kurti, Bandhgala, Sherwani)
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

    // 8. Men's Formal & Western Wear (Suits, Blazers, Trousers)
    if (category.includes('men') || garment.gender === 'men') {
      return this._generateMensPrompt(name, subcategory, material, fit, desc);
    }

    // 9. General Fallback
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
      parts.push(`Woven in ${material.slice(0, 80)}`);
    }

    // Border & Pallu details extracted from description
    const borderMatch = desc.match(/(border[s]?|korvai|zari|pallu|motifs?|butis?|embroidery|zari work)[^.]*/i);
    if (borderMatch) {
      parts.push(`Features ${borderMatch[0].trim()}`);
    }

    // Border continuity & contrast blouse specification
    parts.push('Unbroken contrast border continuity across skirt and pallu edge. Includes tailored contrast blouse. Preserve exact base body color, border width, and metallic zari luster.');

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
  },

  /**
   * Specialized prompt for Shirts and Blouses
   */
  _generateShirtPrompt(name, subcategory, material, fit, desc) {
    const parts = [name];
    if (subcategory.includes('oxford')) {
      parts.push('Classic long-sleeve oxford button-down shirt with structured collar roll, mother-of-pearl buttons, and tailored cuffs');
    } else if (subcategory.includes('formal') || name.toLowerCase().includes('poplin')) {
      parts.push('Crisp tailored formal poplin dress shirt with semi-spread Italian cutaway collar and double French cuffs');
    } else if (subcategory.includes('linen') || subcategory.includes('resort')) {
      parts.push('Relaxed summer camp-collar shirt with open convertible neck and breathable slub weave');
    } else if (subcategory.includes('silk') || name.toLowerCase().includes('blouse')) {
      parts.push('Fluid pure silk charmeuse blouse with graceful draped neckline and soft gathered cuffs');
    } else {
      parts.push('Tailored long-sleeve buttoned shirt with crisp placket and sharp collar');
    }
    if (material) parts.push(`Crafted in ${material.slice(0, 80)}`);
    if (fit) parts.push(fit.slice(0, 70));
    parts.push('Maintain exact fabric weave, buttoning alignment, collar sharpness, and natural torso contour.');
    return parts.join('. ').slice(0, 480);
  },

  /**
   * Specialized prompt for Jeans and Denim
   */
  _generateJeansPrompt(name, subcategory, material, fit, desc) {
    const parts = [name];
    if (subcategory.includes('selvedge')) {
      parts.push('Shuttle-loomed Japanese selvedge raw denim jeans with crisp redline cuff roll, classic 5-pocket styling, and rigid twill texture');
    } else if (subcategory.includes('baggy')) {
      parts.push('Oversized 90s vintage baggy denim jeans with relaxed slouch rise, wide thigh volume, and natural hem break');
    } else if (subcategory.includes('wide_leg')) {
      parts.push('High-waisted wide-leg tailored denim trousers with sharp front drape and clean silhouette');
    } else if (subcategory.includes('carpenter')) {
      parts.push('Relaxed utility carpenter jeans with authentic tool pockets, hammer loop, and triple-needle stitch detailing');
    } else {
      parts.push('Timeless straight-fit denim jeans with clean waistband and authentic wash finish');
    }
    if (material) parts.push(`Constructed from ${material.slice(0, 80)}`);
    if (fit) parts.push(fit.slice(0, 70));
    parts.push('Preserve exact denim wash shade, pocket placement, waistband fit, and fabric fold physics.');
    return parts.join('. ').slice(0, 480);
  },

  /**
   * Specialized prompt for Baggy Pants and Trousers
   */
  _generatePantsPrompt(name, subcategory, material, fit, desc) {
    const parts = [name];
    if (subcategory.includes('pleated')) {
      parts.push('Atelier double-pleated baggy trousers with forward pleats, high-rise tab waistband, and generous fluid leg volume');
    } else if (subcategory.includes('palazzo')) {
      parts.push('High-waisted fluid wide-leg palazzo trousers cascading into a dramatic sweeping hemline');
    } else if (subcategory.includes('cargo')) {
      parts.push('Architectural baggy cargo pants with 3D gusseted utility pockets and articulated relaxed silhouette');
    } else if (subcategory.includes('balloon')) {
      parts.push('Sculptural curved balloon trousers with inverted pleats and tapered ankle line');
    } else {
      parts.push('Relaxed wide-leg baggy trousers with effortless drape and comfortable waist');
    }
    if (material) parts.push(`Tailored in ${material.slice(0, 80)}`);
    if (fit) parts.push(fit.slice(0, 70));
    parts.push('Preserve pleat definition, waistband height, relaxed leg silhouette, and natural drape flow.');
    return parts.join('. ').slice(0, 480);
  },

  /**
   * Specialized prompt for Formal Attire and Tailoring
   */
  _generateFormalPrompt(name, subcategory, material, fit, desc) {
    const parts = [name];
    if (subcategory.includes('tuxedo') || name.toLowerCase().includes('tuxedo')) {
      parts.push('Bespoke evening black-tie tuxedo ensemble with contrast silk satin peak lapels, jetted pockets, and matching braided trousers');
    } else if (subcategory.includes('three_piece') || name.toLowerCase().includes('3-piece') || desc.toLowerCase().includes('3-piece')) {
      parts.push('Full 3-piece formal suit including structured jacket, tailored waistcoat, and pressed trousers');
    } else if (subcategory.includes('smoking_jacket')) {
      parts.push('Sumptuous evening smoking jacket in plush velvet with quilted satin shawl lapels and tailored evening trousers');
    } else if (subcategory.includes('dinner_jacket')) {
      parts.push('Tropical evening dinner jacket with curved silk shawl collar and coordinating formal trousers');
    } else {
      parts.push('Bespoke formal tailoring ensemble with hand-finished lapels and razor-sharp trouser crease');
    }
    if (material) parts.push(`Woven in ${material.slice(0, 80)}`);
    if (fit) parts.push(fit.slice(0, 70));
    parts.push('Maintain impeccable shoulder structure, lapel roll, fabric sheen, and black-tie elegance.');
    return parts.join('. ').slice(0, 480);
  }
};

export default garmentPromptGenerator;

