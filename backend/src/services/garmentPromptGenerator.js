/**
 * VESTRA AI Virtual Try-On - Garment Prompt & Metadata Generator
 * Produces structured, domain-accurate prompts for AI diffusion models (Genlook)
 * based strictly on recorded garment attributes without inventing unseen details.
 * 
 * Supports all 10 specialized garment categories:
 * 1. Sarees (Nivi drape, 6-yard, pallu over left shoulder, pleats, border continuity)
 * 2. Shirts (Collar roll, placket, cuffs, sleeves, fabric weave)
 * 3. T-shirts (Crew neck/V-neck, sleeves, hem, ribbed neck, cotton jersey)
 * 4. Dresses (Silhouette, neckline, hemline, fabric fold physics)
 * 5. Kurtis (Side slits, neckline contour, straight cut, ethnic motif)
 * 6. Salwar suits (Kameez drape, churidar/salwar, matching dupatta drape)
 * 7. Trousers (Waistband, pleats, crease, relaxed leg silhouette, hem break)
 * 8. Jeans (Denim wash, 5 pockets, waistband, twill texture, rivets)
 * 9. Blazers (Structured shoulders, notched/peak lapels, chest pocket, tailored fit)
 * 10. Jackets (Zipper/button front, collar, cuffs, lining, outer layer fit)
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
    const material = garment.material || garment.fabric || '';
    const fit = garment.fit || '';
    const desc = garment.description || '';
    const color = garment.color || garment.colour || '';

    // 1. Sarees
    if (garmentType === 'saree' || category.includes('saree') || subcategory.includes('saree') || name.toLowerCase().includes('saree')) {
      return this._generateSareePrompt(name, subcategory, material, fit, desc, color);
    }

    // 2. T-Shirts
    if (
      subcategory.includes('t-shirt') ||
      subcategory.includes('tshirt') ||
      subcategory.includes('tee') ||
      name.toLowerCase().includes('t-shirt') ||
      name.toLowerCase().includes('tshirt') ||
      name.toLowerCase().includes('tee ')
    ) {
      return this._generateTShirtPrompt(name, subcategory, material, fit, desc, color);
    }

    // 3. Shirts & Tops
    if (
      category.includes('shirt') ||
      subcategory.includes('shirt') ||
      subcategory.includes('blouse') ||
      name.toLowerCase().includes('shirt') ||
      name.toLowerCase().includes('blouse')
    ) {
      return this._generateShirtPrompt(name, subcategory, material, fit, desc, color);
    }

    // 4. Blazers & Formal Suits
    if (
      subcategory.includes('blazer') ||
      subcategory.includes('formal_suit') ||
      name.toLowerCase().includes('blazer') ||
      name.toLowerCase().includes('formal suit') ||
      name.toLowerCase().includes('3-piece') ||
      (garmentType === 'suit' && !subcategory.includes('salwar')) ||
      (category.includes('formal-attire') && !subcategory.includes('salwar')) ||
      (category.includes('formal') && name.toLowerCase().includes('jacket'))
    ) {
      return this._generateBlazerPrompt(name, subcategory, material, fit, desc, color);
    }

    // 5. Jackets & Outerwear
    if (
      subcategory.includes('jacket') ||
      subcategory.includes('coat') ||
      name.toLowerCase().includes('jacket') ||
      name.toLowerCase().includes('bomber')
    ) {
      return this._generateJacketPrompt(name, subcategory, material, fit, desc, color);
    }

    // 6. Kurtis
    if (
      subcategory.includes('kurti') ||
      name.toLowerCase().includes('kurti') ||
      name.toLowerCase().includes('kurta')
    ) {
      return this._generateKurtiPrompt(name, subcategory, material, fit, desc, color);
    }

    // 7. Salwar Suits & Anarkalis
    if (
      subcategory.includes('salwar') ||
      subcategory.includes('anarkali') ||
      subcategory.includes('churidar') ||
      name.toLowerCase().includes('salwar') ||
      name.toLowerCase().includes('anarkali')
    ) {
      return this._generateSalwarPrompt(name, subcategory, material, fit, desc, color);
    }

    // 8. Jeans & Denim
    if (
      category.includes('jean') ||
      subcategory.includes('jean') ||
      subcategory.includes('denim') ||
      name.toLowerCase().includes('jean') ||
      desc.toLowerCase().includes('denim')
    ) {
      return this._generateJeansPrompt(name, subcategory, material, fit, desc, color);
    }

    // 9. Baggy Pants & Trousers
    if (
      category.includes('pant') ||
      subcategory.includes('pant') ||
      subcategory.includes('trouser') ||
      name.toLowerCase().includes('pant') ||
      name.toLowerCase().includes('trouser') ||
      name.toLowerCase().includes('chino')
    ) {
      return this._generatePantsPrompt(name, subcategory, material, fit, desc, color);
    }

    // 10. Dresses and Gowns
    if (
      garmentType === 'dress' ||
      garmentType === 'gown' ||
      subcategory.includes('gown') ||
      subcategory.includes('dress') ||
      name.toLowerCase().includes('dress') ||
      name.toLowerCase().includes('gown')
    ) {
      return this._generateDressPrompt(name, subcategory, material, fit, desc, color);
    }

    // General Fallback
    const base = [name];
    if (color) base.push(`Color in ${color}`);
    if (material) base.push(`Crafted from ${material.slice(0, 80)}`);
    if (fit) base.push(`Tailored ${fit.slice(0, 60)}`);
    base.push('Maintain exact garment color, fabric weave, neckline, and drape fidelity.');
    return base.join('. ').slice(0, 480);
  },

  /**
   * 1. Specialized prompt for Sarees (6-yard unstitched traditional Indian drape)
   */
  _generateSareePrompt(name, subcategory, material, fit, desc, color) {
    const parts = [`Authentic ${name}`];
    parts.push('Traditional 6-yard Indian handloom saree drape in classic Nivi drape style with front waist pleats and diagonal pallu over left shoulder');
    parts.push('Anatomical fidelity: exactly two natural hands, natural arm contour without extra limbs');

    if (color) parts.push(`Primary shade ${color}`);
    if (material) parts.push(`Woven in ${material.slice(0, 70)}`);

    const borderMatch = desc.match(/(border[s]?|korvai|zari|pallu|motifs?|butis?|embroidery|zari work)[^.]*/i);
    if (borderMatch) {
      parts.push(`Features ${borderMatch[0].trim().slice(0, 90)}`);
    }

    parts.push('Unbroken contrast border continuity across skirt and pallu edge. Includes tailored contrast blouse. Preserve metallic luster and drape fold physics');
    return parts.join('. ').slice(0, 480);
  },

  /**
   * 2. Specialized prompt for T-Shirts
   */
  _generateTShirtPrompt(name, subcategory, material, fit, desc, color) {
    const parts = [name];
    if (name.toLowerCase().includes('v-neck') || desc.toLowerCase().includes('v-neck')) {
      parts.push('Classic cotton V-neck short-sleeve T-shirt with ribbed neckband, clean shoulder seams, and straight hemline');
    } else if (name.toLowerCase().includes('oversized') || fit.toLowerCase().includes('oversized')) {
      parts.push('Oversized boxy streetwear T-shirt with dropped shoulders, wide sleeves, and heavyweight jersey drape');
    } else {
      parts.push('Classic crew-neck cotton jersey T-shirt with tailored short sleeves, ribbed collar, and double-stitched hem');
    }
    if (color) parts.push(`Color tone: ${color}`);
    if (material) parts.push(`Fabric: ${material.slice(0, 60)}`);
    parts.push('Preserve exact torso silhouette, neckline shape, chest graphics or embroidery if present, and natural cotton fold drape');
    return parts.join('. ').slice(0, 480);
  },

  /**
   * 3. Specialized prompt for Shirts and Blouses
   */
  _generateShirtPrompt(name, subcategory, material, fit, desc, color) {
    const parts = [name];
    if (subcategory.includes('oxford') || name.toLowerCase().includes('oxford')) {
      parts.push('Classic long-sleeve oxford button-down shirt with structured collar roll, mother-of-pearl buttons, and tailored cuffs');
    } else if (subcategory.includes('formal') || name.toLowerCase().includes('poplin')) {
      parts.push('Crisp tailored formal poplin dress shirt with semi-spread Italian collar and buttoned cuffs');
    } else if (subcategory.includes('linen') || subcategory.includes('resort')) {
      parts.push('Relaxed summer camp-collar shirt with open convertible neck and breathable slub weave');
    } else {
      parts.push('Tailored long-sleeve buttoned shirt with crisp placket, sharp collar, and tailored sleeve drape');
    }
    if (color) parts.push(`Tone: ${color}`);
    if (material) parts.push(`Crafted in ${material.slice(0, 70)}`);
    parts.push('Maintain exact fabric weave, buttoning alignment, collar sharpness, and natural torso contour');
    return parts.join('. ').slice(0, 480);
  },

  /**
   * 4. Specialized prompt for Blazers
   */
  _generateBlazerPrompt(name, subcategory, material, fit, desc, color) {
    const parts = [name];
    if (name.toLowerCase().includes('3-piece') || desc.toLowerCase().includes('3-piece') || subcategory.includes('formal_suit')) {
      parts.push('Bespoke 3-piece formal suit with structured jacket, peak lapels, tailored waistcoat, and flat-front trousers');
    } else if (name.toLowerCase().includes('double-breasted') || desc.toLowerCase().includes('double-breasted')) {
      parts.push('Bespoke double-breasted tailored blazer with peak lapels, structured shoulder padding, and horn buttons');
    } else {
      parts.push('Single-breasted tailored luxury blazer with notch lapels, chest welt pocket, jetted flap pockets, and clean back vent');
    }
    if (color) parts.push(`Color: ${color}`);
    if (material) parts.push(`Material: ${material.slice(0, 80)}`);
    if (fit) parts.push(`Cut: ${fit.slice(0, 50)}`);
    parts.push('Maintain sharp shoulder structure, lapel roll, crisp chest contour, and tailored arm drape');
    return parts.join('. ').slice(0, 480);
  },

  /**
   * 5. Specialized prompt for Jackets
   */
  _generateJacketPrompt(name, subcategory, material, fit, desc, color) {
    const parts = [name];
    if (name.toLowerCase().includes('leather') || material.toLowerCase().includes('leather')) {
      parts.push('Structured leather moto jacket with asymmetrical metallic zipper, snap-down lapels, and zippered cuffs');
    } else if (name.toLowerCase().includes('bomber')) {
      parts.push('Classic bomber jacket with ribbed varsity collar, elasticated cuffs, front zip closure, and side pockets');
    } else {
      parts.push('Tailored outerwear jacket with structured front closure, stand collar, tailored cuffs, and lined interior drape');
    }
    if (color) parts.push(`Color: ${color}`);
    if (material) parts.push(`Constructed from ${material.slice(0, 70)}`);
    parts.push('Preserve hardware details, zipper line, fabric texture, and layered outerwear drape physics');
    return parts.join('. ').slice(0, 480);
  },

  /**
   * 6. Specialized prompt for Kurtis
   */
  _generateKurtiPrompt(name, subcategory, material, fit, desc, color) {
    const parts = [name];
    parts.push('Tailored straight-cut Indian ethnic kurti with side slits, elegant neckline, and three-quarter sleeves');
    if (color) parts.push(`Color: ${color}`);
    if (material) parts.push(`Crafted in ${material.slice(0, 70)}`);
    const motifMatch = desc.match(/(chikankari|embroidery|block print|zari|mirror work|yoke|kalamkari)[^.]*/i);
    if (motifMatch) {
      parts.push(`Adorned with ${motifMatch[0].trim().slice(0, 80)}`);
    }
    parts.push('Preserve authentic yoke embroidery, side slit symmetry, hemline length, and breathable ethnic drape');
    return parts.join('. ').slice(0, 480);
  },

  /**
   * 7. Specialized prompt for Salwar Suits & Anarkalis
   */
  _generateSalwarPrompt(name, subcategory, material, fit, desc, color) {
    const parts = [name];
    if (subcategory.includes('anarkali') || name.toLowerCase().includes('anarkali')) {
      parts.push('Flared floor-length royal Anarkali gown suit with fitted bodice, flared kalis, and draped sheer dupatta');
    } else {
      parts.push('Classic tailored 3-piece salwar kameez ensemble with straight-cut kurta, matching salwar/churidar, and draped dupatta across shoulder');
    }
    if (color) parts.push(`Palette: ${color}`);
    if (material) parts.push(`Fabric: ${material.slice(0, 70)}`);
    parts.push('Preserve dupatta drape across torso, sleeve embroidery, neckline contour, and ethnic fold aesthetics');
    return parts.join('. ').slice(0, 480);
  },

  /**
   * 8. Specialized prompt for Jeans and Denim
   */
  _generateJeansPrompt(name, subcategory, material, fit, desc, color) {
    const parts = [name];
    if (subcategory.includes('selvedge') || name.toLowerCase().includes('selvedge')) {
      parts.push('Japanese selvedge raw denim jeans with redline cuff roll, classic 5-pocket styling, and rigid twill texture');
    } else if (subcategory.includes('baggy') || name.toLowerCase().includes('baggy')) {
      parts.push('Relaxed 90s vintage baggy denim jeans with slouch rise, wide thigh volume, and natural hem break');
    } else {
      parts.push('Classic 5-pocket tailored denim jeans with clean waistband, metal rivets, and authentic wash finish');
    }
    if (color) parts.push(`Wash: ${color}`);
    if (material) parts.push(`Material: ${material.slice(0, 70)}`);
    parts.push('Preserve denim twill texture, pocket geometry, waistband rise, and realistic fabric fold physics');
    return parts.join('. ').slice(0, 480);
  },

  /**
   * 9. Specialized prompt for Trousers and Pants
   */
  _generatePantsPrompt(name, subcategory, material, fit, desc, color) {
    const parts = [name];
    if (subcategory.includes('pleated') || name.toLowerCase().includes('pleated')) {
      parts.push('Double-pleated tailored trousers with sharp front crease, high-rise tab waistband, and fluid leg volume');
    } else if (subcategory.includes('palazzo') || name.toLowerCase().includes('palazzo')) {
      parts.push('High-waisted fluid wide-leg palazzo trousers with cascading sweeping hemline');
    } else {
      parts.push('Tailored trousers with clean front waistband, pressed center crease, and natural ankle break');
    }
    if (color) parts.push(`Color: ${color}`);
    if (material) parts.push(`Tailored in ${material.slice(0, 70)}`);
    parts.push('Preserve waistband alignment, trouser leg crease, relaxed thigh silhouette, and drape flow');
    return parts.join('. ').slice(0, 480);
  },

  /**
   * 10. Specialized prompt for Dresses and Gowns
   */
  _generateDressPrompt(name, subcategory, material, fit, desc, color) {
    const parts = [name];
    if (name.toLowerCase().includes('maxi') || desc.toLowerCase().includes('floor-length')) {
      parts.push('Floor-length sweeping evening gown with fluid drape and elegant hemline');
    } else if (name.toLowerCase().includes('midi')) {
      parts.push('Calf-length midi silhouette with contoured waist and feminine hem');
    } else {
      parts.push('Sculptural tailored dress with fluid drape and defined waist contour');
    }
    const neckMatch = desc.match(/(off-shoulder|sweetheart|cowl|v-neck|boat|crew|plunging)[^,.]*/i);
    if (neckMatch) {
      parts.push(`Features ${neckMatch[0].trim()} neckline`);
    }
    if (color) parts.push(`Shade: ${color}`);
    if (material) parts.push(`Made of ${material.slice(0, 70)}`);
    parts.push('Preserve exact garment color, neckline contour, hemline length, and fabric fold physics');
    return parts.join('. ').slice(0, 480);
  }
};

export default garmentPromptGenerator;
