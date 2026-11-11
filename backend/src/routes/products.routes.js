import express from 'express';
import { query } from '../config/db.js';
import imageValidationService from '../services/imageValidationService.js';

const router = express.Router();

/**
 * Official fashion catalogue category taxonomy with semantic mappings
 */
const FASHION_CATEGORIES = [
  { id: 0, slug: 'all', name: 'All Garments', key: 'all', description: 'Complete luxury fashion archive calibrated for virtual try-on' },
  { id: 1, slug: 'sarees', name: 'Sarees', key: 'sarees', description: 'Curated heritage sarees and handloom weaves' },
  { id: 5, slug: 'shirts', name: 'Shirts & Tops', key: 'shirts', description: 'Tailored shirts, silk blouses, and luxury tops' },
  { id: 6, slug: 'jeans', name: 'Jeans & Denim', key: 'jeans', description: 'Selvedge denim, wide-leg, and contemporary jeans' },
  { id: 21, slug: 'dresses', name: 'Dresses & Gowns', key: 'dresses', description: 'Evening gowns, maxi dresses, and cocktail wear' },
  { id: 22, slug: 'kurtis', name: 'Kurtis & Ethnic Wear', key: 'kurtis', description: 'Hand-embroidered kurtis and ethnic ensembles' },
  { id: 23, slug: 'salwar', name: 'Salwar Suits', key: 'salwar', description: 'Anarkalis, salwar kameez, and churidar sets' },
  { id: 31, slug: 'mens-traditional', name: "Men's Traditional Wear", key: 'mensTraditional', description: 'Sherwanis, kurta pyjamas, and Indo-Western attire' },
  { id: 8, slug: 'blazers', name: 'Blazers & Jackets', key: 'blazers', description: 'Italian wool blazers, tuxedos, and tailored jackets' },
  { id: 7, slug: 'trousers', name: 'Trousers', key: 'trousers', description: 'Pleated trousers, tailored pants, and chinos' },
  { id: 4, slug: 'accessories', name: 'Accessories', key: 'accessories', description: 'Luxury silk ties, pocket squares, dupattas, and accents' },
  { id: 9, slug: 'womens-traditional', name: "Women's Traditional Wear", key: 'womensTraditionalDept', description: "Curated Indian heritage sarees, lehengas, anarkalis, and ethnic wear" },
  { id: 10, slug: 'womens-western', name: "Women's Western Wear", key: 'womensWesternDept', description: "Modern silhouettes: sculptural dresses, tailored blazers, trousers, and denim" },
  { id: 11, slug: 'mens-traditional-dept', name: "Men's Traditional Wear", key: 'mensTraditionalDept2', description: "Royal sherwanis, silk kurta pyjamas, bandhgalas, and Nehru jackets" },
  { id: 12, slug: 'mens-western', name: "Men's Western Wear", key: 'mensWesternDept', description: "Bespoke tailoring, Italian wool suits, selvedge denim, and luxury shirts" }
];

/**
 * Main shopping navigation tabs requested for VESTRA
 */
const MAIN_NAVIGATION_TABS = [
  { id: 'all', slug: 'all', name: 'All Garments', key: 'all', description: 'Complete luxury fashion archive for men and women' },
  { id: 'womens-wear', slug: 'womens-wear', name: "Women's Wear", key: 'womensWear', description: 'Curated traditional sarees, ethnic gowns, western dresses, and tailoring for women' },
  { id: 'mens-wear', slug: 'mens-wear', name: "Men's Wear", key: 'mensWear', description: 'Bespoke tailoring, silk kurtas, sherwanis, polos, denim, and outerwear for men' },
  { id: 'traditional-wear', slug: 'traditional-wear', name: 'Traditional Wear', key: 'traditionalWear', description: 'Heritage handloom sarees, lehengas, anarkalis, sherwanis, and kurtas' },
  { id: 'western-wear', slug: 'western-wear', name: 'Western Wear', key: 'westernWear', description: 'Contemporary dresses, tailored suits, jackets, denim, shirts, and casual essentials' },
  { id: 'accessories', slug: 'accessories', name: 'Accessories', key: 'accessories', description: 'Hand-woven dupattas, 7-fold silk neckties, and artisanal pocket squares' }
];

/**
 * Dynamic subcategories mapped per main navigation filter
 */
const NAVIGATION_SUBCATEGORIES = {
  'all': [
    { slug: 'all', name: 'All Subcategories' },
    { slug: 'sarees', name: 'Sarees' },
    { slug: 'dresses', name: 'Dresses & Gowns' },
    { slug: 'kurtis', name: 'Kurtis & Sets' },
    { slug: 'shirts', name: 'Shirts & Polos' },
    { slug: 'jeans', name: 'Jeans & Denim' },
    { slug: 'trousers', name: 'Trousers & Shorts' },
    { slug: 'blazers', name: 'Blazers & Jackets' },
    { slug: 'traditional', name: 'Traditional Ensembles' },
    { slug: 'accessories', name: 'Accessories' }
  ],
  'womens-wear': [
    { slug: 'all', name: "All Women's Wear" },
    { slug: 'sarees', name: 'Sarees' },
    { slug: 'silk_sarees', name: 'Silk Sarees' },
    { slug: 'cotton_sarees', name: 'Cotton Sarees' },
    { slug: 'banarasi_sarees', name: 'Banarasi Sarees' },
    { slug: 'kanjivaram_sarees', name: 'Kanjivaram Sarees' },
    { slug: 'paithani_sarees', name: 'Paithani Sarees' },
    { slug: 'lehengas', name: 'Lehengas' },
    { slug: 'anarkali_suits', name: 'Anarkali Suits' },
    { slug: 'salwar_suits', name: 'Salwar Suits' },
    { slug: 'churidar_sets', name: 'Churidar Sets' },
    { slug: 'kurtis', name: 'Kurtis' },
    { slug: 'ethnic_gowns', name: 'Ethnic Gowns' },
    { slug: 'dupattas', name: 'Dupattas' },
    { slug: 'dresses', name: 'Dresses' },
    { slug: 'maxi_dresses', name: 'Maxi Dresses' },
    { slug: 'midi_dresses', name: 'Midi Dresses' },
    { slug: 'mini_dresses', name: 'Mini Dresses' },
    { slug: 'tops', name: 'Tops & Shirts' },
    { slug: 't_shirts', name: 'T-Shirts' },
    { slug: 'jeans', name: 'Jeans' },
    { slug: 'trousers', name: 'Trousers' },
    { slug: 'skirts', name: 'Skirts' },
    { slug: 'jumpsuits', name: 'Jumpsuits' },
    { slug: 'coord_sets', name: 'Co-ord Sets' },
    { slug: 'blazers', name: 'Blazers' },
    { slug: 'jackets', name: 'Jackets' }
  ],
  'mens-wear': [
    { slug: 'all', name: "All Men's Wear" },
    { slug: 'mens_kurtas', name: "Men's Kurtas" },
    { slug: 'kurta_pyjama_sets', name: 'Kurta Pyjama Sets' },
    { slug: 'sherwanis', name: 'Sherwanis' },
    { slug: 'dhoti_sets', name: 'Dhoti Sets' },
    { slug: 'nehru_jackets', name: 'Nehru Jackets' },
    { slug: 'traditional_waistcoats', name: 'Traditional Waistcoats' },
    { slug: 'casual_shirts', name: 'Casual Shirts' },
    { slug: 'formal_shirts', name: 'Formal Shirts' },
    { slug: 't_shirts', name: 'T-Shirts' },
    { slug: 'polo_t_shirts', name: 'Polo T-Shirts' },
    { slug: 'jeans', name: 'Jeans' },
    { slug: 'formal_trousers', name: 'Formal Trousers' },
    { slug: 'casual_trousers', name: 'Casual Trousers' },
    { slug: 'shorts', name: 'Shorts' },
    { slug: 'blazers', name: 'Blazers' },
    { slug: 'suits', name: 'Suits' },
    { slug: 'jackets', name: 'Jackets' },
    { slug: 'hoodies', name: 'Hoodies' },
    { slug: 'sweatshirts', name: 'Sweatshirts' }
  ],
  'traditional-wear': [
    { slug: 'all', name: 'All Traditional' },
    { slug: 'sarees', name: 'Sarees' },
    { slug: 'silk_sarees', name: 'Silk Sarees' },
    { slug: 'cotton_sarees', name: 'Cotton Sarees' },
    { slug: 'banarasi_sarees', name: 'Banarasi Sarees' },
    { slug: 'kanjivaram_sarees', name: 'Kanjivaram Sarees' },
    { slug: 'paithani_sarees', name: 'Paithani Sarees' },
    { slug: 'lehengas', name: 'Lehengas' },
    { slug: 'anarkali_suits', name: 'Anarkali Suits' },
    { slug: 'salwar_suits', name: 'Salwar Suits' },
    { slug: 'churidar_sets', name: 'Churidar Sets' },
    { slug: 'kurtis', name: 'Kurtis' },
    { slug: 'ethnic_gowns', name: 'Ethnic Gowns' },
    { slug: 'dupattas', name: 'Dupattas' },
    { slug: 'mens_kurtas', name: "Men's Kurtas" },
    { slug: 'kurta_pyjama_sets', name: 'Kurta Pyjama Sets' },
    { slug: 'sherwanis', name: 'Sherwanis' },
    { slug: 'dhoti_sets', name: 'Dhoti Sets' },
    { slug: 'nehru_jackets', name: 'Nehru Jackets' },
    { slug: 'traditional_waistcoats', name: 'Traditional Waistcoats' }
  ],
  'western-wear': [
    { slug: 'all', name: 'All Western' },
    { slug: 'dresses', name: 'Dresses' },
    { slug: 'maxi_dresses', name: 'Maxi Dresses' },
    { slug: 'midi_dresses', name: 'Midi Dresses' },
    { slug: 'mini_dresses', name: 'Mini Dresses' },
    { slug: 'tops', name: 'Tops & Shirts' },
    { slug: 't_shirts', name: 'T-Shirts' },
    { slug: 'polo_t_shirts', name: 'Polo T-Shirts' },
    { slug: 'jeans', name: 'Jeans' },
    { slug: 'trousers', name: 'Trousers' },
    { slug: 'formal_trousers', name: 'Formal Trousers' },
    { slug: 'casual_trousers', name: 'Casual Trousers' },
    { slug: 'skirts', name: 'Skirts' },
    { slug: 'shorts', name: 'Shorts' },
    { slug: 'jumpsuits', name: 'Jumpsuits' },
    { slug: 'coord_sets', name: 'Co-ord Sets' },
    { slug: 'blazers', name: 'Blazers' },
    { slug: 'suits', name: 'Suits' },
    { slug: 'jackets', name: 'Jackets' },
    { slug: 'hoodies', name: 'Hoodies' },
    { slug: 'sweatshirts', name: 'Sweatshirts' }
  ],
  'accessories': [
    { slug: 'all', name: 'All Accessories' },
    { slug: 'dupattas', name: 'Dupattas' },
    { slug: 'scarves', name: 'Scarves' },
    { slug: 'belts', name: 'Belts' },
    { slug: 'ties', name: 'Ties' },
    { slug: 'fashion_accessories', name: 'Fashion Accessories' }
  ]
};

/**
 * GET /api/categories
 * Retrieve all fashion categories and main navigation tabs with dynamic product counts from PostgreSQL
 */
router.get('/categories', async (req, res) => {
  try {
    const countSql = `
      SELECT 
        COUNT(*)::int AS total,
        -- Department counts
        COUNT(CASE WHEN category_id = 1 OR garment_type = 'saree' OR subcategory ILIKE '%saree%' THEN 1 END)::int AS sarees,
        COUNT(CASE WHEN category_id = 5 OR subcategory ILIKE '%shirt%' OR subcategory ILIKE '%blouse%' OR name ILIKE '%shirt%' OR name ILIKE '%blouse%' THEN 1 END)::int AS shirts,
        COUNT(CASE WHEN category_id = 6 OR subcategory ILIKE '%jean%' OR subcategory ILIKE '%denim%' THEN 1 END)::int AS jeans,
        COUNT(CASE WHEN subcategory IN ('gowns', 'maxi_dresses', 'evening_dresses', 'party_wear_dresses', 'casual_dresses', 'mini_dresses') OR garment_type = 'dress' OR subcategory ILIKE '%dress%' OR subcategory ILIKE '%gown%' OR name ILIKE '%gown%' OR name ILIKE '%dress%' THEN 1 END)::int AS dresses,
        COUNT(CASE WHEN subcategory IN ('kurti_pant_sets') OR subcategory ILIKE '%kurti%' OR name ILIKE '%kurti%' THEN 1 END)::int AS kurtis,
        COUNT(CASE WHEN subcategory IN ('anarkali_suits', 'salwar_kameez', 'churidar_sets', 'lehenga_choli') OR subcategory ILIKE '%salwar%' OR subcategory ILIKE '%anarkali%' OR subcategory ILIKE '%churidar%' OR subcategory ILIKE '%lehenga%' THEN 1 END)::int AS salwar,
        COUNT(CASE WHEN subcategory IN ('sherwani_outfits', 'kurta_pyjama_sets', 'indo_western', 'traditional_outfits', 'mens_kurtas', 'nehru_jackets', 'traditional_waistcoats') OR name ILIKE '%sherwani%' OR name ILIKE '%kurta%' OR name ILIKE '%bandhgala%' OR name ILIKE '%nehru%' OR name ILIKE '%waistcoat%' THEN 1 END)::int AS "mensTraditional",
        COUNT(CASE WHEN category_id = 8 OR subcategory IN ('formal_suits', 'blazer_trouser_sets', 'tuxedos', 'three_piece_suits', 'smoking_jackets', 'dinner_jackets', 'power_suits', 'womens_tuxedos', 'western_coord_sets', 'jackets') OR name ILIKE '%blazer%' OR name ILIKE '%suit%' OR name ILIKE '%tuxedo%' OR name ILIKE '%jacket%' THEN 1 END)::int AS blazers,
        COUNT(CASE WHEN category_id = 7 OR subcategory IN ('pleated_trousers', 'baggy_chinos', 'palazzo_pants', 'cargo_pants', 'balloon_trousers', 'shirt_trouser_combinations', 'shorts') OR name ILIKE '%trouser%' OR name ILIKE '%pant%' OR name ILIKE '%chino%' OR name ILIKE '%short%' THEN 1 END)::int AS trousers,
        COUNT(CASE WHEN category_id = 4 OR garment_type = 'accessory' OR subcategory IN ('ties', 'fashion_accessories', 'dupattas', 'belts', 'scarves') THEN 1 END)::int AS accessories,
        COUNT(CASE WHEN category_id = 9 OR (gender = 'women' AND (category_id = 1 OR garment_type = 'saree' OR subcategory ILIKE '%saree%' OR subcategory ILIKE '%gown%' OR subcategory ILIKE '%lehenga%' OR subcategory ILIKE '%kurti%' OR subcategory ILIKE '%salwar%')) THEN 1 END)::int AS "womensTraditionalDept",
        COUNT(CASE WHEN category_id = 10 OR (gender = 'women' AND (category_id IN (5, 6, 7, 8) OR subcategory IN ('mini_dresses', 'skirts', 'jackets', 't_shirts', 'dresses', 'gowns', 'jeans', 'trousers'))) THEN 1 END)::int AS "womensWesternDept",
        COUNT(CASE WHEN category_id = 11 OR (gender = 'men' AND (subcategory IN ('mens_kurtas', 'nehru_jackets', 'traditional_waistcoats', 'sherwani_outfits', 'kurta_pyjama_sets', 'indo_western'))) THEN 1 END)::int AS "mensTraditionalDept2",
        COUNT(CASE WHEN category_id = 12 OR (gender = 'men' AND (category_id IN (5, 6, 7, 8) OR subcategory IN ('polo_t_shirts', 'shorts', 'hoodies', 'jackets', 'shirts', 'jeans', 'trousers', 'blazers', 'suits'))) THEN 1 END)::int AS "mensWesternDept",
        -- Main Navigation Tab counts
        COUNT(CASE WHEN gender = 'women' OR category_id IN (1, 2, 9, 10) THEN 1 END)::int AS "womensWear",
        COUNT(CASE WHEN gender = 'men' OR category_id IN (3, 11, 12) THEN 1 END)::int AS "mensWear",
        COUNT(CASE WHEN category_id IN (1, 9, 11) OR garment_type = 'saree' OR subcategory IN ('sarees', 'silk_sarees', 'cotton_sarees', 'banarasi_sarees', 'kanjivaram_sarees', 'paithani_sarees', 'lehengas', 'lehenga_choli', 'anarkali_suits', 'salwar_suits', 'salwar_kameez', 'churidar_sets', 'kurtis', 'kurti_pant_sets', 'ethnic_gowns', 'dupattas', 'mens_kurtas', 'kurta_pyjama_sets', 'sherwanis', 'sherwani_outfits', 'dhoti_sets', 'nehru_jackets', 'traditional_waistcoats', 'indo_western', 'traditional_outfits') OR subcategory ILIKE '%saree%' OR subcategory ILIKE '%kurta%' OR subcategory ILIKE '%sherwani%' THEN 1 END)::int AS "traditionalWear",
        COUNT(CASE WHEN category_id IN (5, 6, 7, 8, 10, 12) OR subcategory IN ('dresses', 'maxi_dresses', 'midi_dresses', 'mini_dresses', 'evening_dresses', 'party_wear_dresses', 'casual_dresses', 'tops', 'shirts', 'oxford_shirts', 'formal_shirts', 'linen_shirts', 'silk_blouses', 'casual_shirts', 'resort_shirts', 't_shirts', 'polo_t_shirts', 'jeans', 'selvedge_jeans', 'baggy_jeans', 'wide_leg_jeans', 'straight_jeans', 'carpenter_jeans', 'trousers', 'formal_trousers', 'casual_trousers', 'pleated_trousers', 'baggy_chinos', 'palazzo_pants', 'cargo_pants', 'balloon_trousers', 'skirts', 'jumpsuits', 'coord_sets', 'western_coord_sets', 'blazers', 'jackets', 'suits', 'formal_suits', 'blazer_trouser_sets', 'tuxedos', 'three_piece_suits', 'hoodies', 'sweatshirts', 'shorts') THEN 1 END)::int AS "westernWear"
      FROM products
      WHERE is_active = true AND COALESCE(approval_status, 'APPROVED') IN ('APPROVED', 'AI_READY')
    `;

    const countRes = await query(countSql);
    const counts = countRes.rows[0] || {};

    const enrichedCategories = FASHION_CATEGORIES.map((cat) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      productCount: cat.key === 'all' ? (counts.total || 0) : (counts[cat.key] || 0)
    }));

    const enrichedNavTabs = MAIN_NAVIGATION_TABS.map((tab) => ({
      id: tab.id,
      name: tab.name,
      slug: tab.slug,
      description: tab.description,
      productCount: tab.key === 'all' ? (counts.total || 0) : (counts[tab.key] || 0)
    }));

    return res.json({
      success: true,
      source: 'postgresql',
      count: enrichedCategories.length,
      mainNavigation: enrichedNavTabs,
      subcategories: NAVIGATION_SUBCATEGORIES,
      data: enrichedCategories
    });
  } catch (err) {
    console.error('[Products Route] Failed to fetch categories from PostgreSQL:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Database query failed: ' + err.message
    });
  }
});

/**
 * GET /api/products
 * Retrieve all active products directly from PostgreSQL with optional filtering
 */
router.get('/products', async (req, res) => {
  const {
    category, subcategory, gender, garmentType, tryonCompatibility,
    stockStatus, search, featured, brand, source, minPrice, maxPrice, aiReady, sort
  } = req.query;

  try {
    const whereClauses = [
      'p.is_active = true',
      "COALESCE(p.approval_status, 'APPROVED') IN ('APPROVED', 'AI_READY')"
    ];
    const sqlParams = [];
    let paramIndex = 1;

    if (category && category !== 'all') {
      const catKey = category.toLowerCase().trim();
      if (catKey === 'womens-wear' || catKey === 'women' || catKey === "women's wear") {
        whereClauses.push("(p.gender = 'women' OR p.category_id IN (1, 2, 9, 10))");
      } else if (catKey === 'mens-wear' || catKey === 'men' || catKey === "men's wear") {
        whereClauses.push("(p.gender = 'men' OR p.category_id IN (3, 11, 12))");
      } else if (catKey === 'traditional-wear' || catKey === 'traditional' || catKey === 'traditional wear') {
        whereClauses.push("(p.category_id IN (1, 9, 11) OR p.garment_type = 'saree' OR p.subcategory IN ('sarees', 'silk_sarees', 'cotton_sarees', 'banarasi_sarees', 'kanjivaram_sarees', 'paithani_sarees', 'lehengas', 'lehenga_choli', 'anarkali_suits', 'salwar_suits', 'salwar_kameez', 'churidar_sets', 'kurtis', 'kurti_pant_sets', 'ethnic_gowns', 'dupattas', 'mens_kurtas', 'kurta_pyjama_sets', 'sherwanis', 'sherwani_outfits', 'dhoti_sets', 'nehru_jackets', 'traditional_waistcoats', 'indo_western', 'traditional_outfits') OR p.subcategory ILIKE '%saree%' OR p.subcategory ILIKE '%kurta%' OR p.subcategory ILIKE '%sherwani%')");
      } else if (catKey === 'western-wear' || catKey === 'western' || catKey === 'western wear') {
        whereClauses.push("(p.category_id IN (5, 6, 7, 8, 10, 12) OR p.subcategory IN ('dresses', 'maxi_dresses', 'midi_dresses', 'mini_dresses', 'evening_dresses', 'party_wear_dresses', 'casual_dresses', 'tops', 'shirts', 'oxford_shirts', 'formal_shirts', 'linen_shirts', 'silk_blouses', 'casual_shirts', 'resort_shirts', 't_shirts', 'polo_t_shirts', 'jeans', 'selvedge_jeans', 'baggy_jeans', 'wide_leg_jeans', 'straight_jeans', 'carpenter_jeans', 'trousers', 'formal_trousers', 'casual_trousers', 'pleated_trousers', 'baggy_chinos', 'palazzo_pants', 'cargo_pants', 'balloon_trousers', 'skirts', 'jumpsuits', 'coord_sets', 'western_coord_sets', 'blazers', 'jackets', 'suits', 'formal_suits', 'blazer_trouser_sets', 'tuxedos', 'three_piece_suits', 'hoodies', 'sweatshirts', 'shorts'))");
      } else if (catKey === 'accessories' || catKey === 'accessory') {
        whereClauses.push("(p.category_id = 4 OR p.garment_type = 'accessory' OR p.subcategory IN ('ties', 'fashion_accessories', 'dupattas', 'belts', 'scarves'))");
      } else if (catKey === 'womens-traditional' || catKey === "women's traditional wear") {
        whereClauses.push("(p.category_id = 9 OR (p.gender = 'women' AND (p.category_id = 1 OR p.garment_type = 'saree' OR p.subcategory ILIKE '%saree%' OR p.subcategory ILIKE '%gown%' OR p.subcategory ILIKE '%lehenga%' OR p.subcategory ILIKE '%kurti%' OR p.subcategory ILIKE '%salwar%')))");
      } else if (catKey === 'womens-western' || catKey === "women's western wear") {
        whereClauses.push("(p.category_id = 10 OR (p.gender = 'women' AND (p.category_id IN (5, 6, 7, 8) OR p.subcategory IN ('mini_dresses', 'skirts', 'jackets', 't_shirts', 'dresses', 'gowns', 'jeans', 'trousers', 'tops', 'jumpsuits', 'coord_sets', 'blazers'))))");
      } else if (catKey === 'mens-traditional' || catKey === "men's traditional wear" || catKey === 'mens-traditional-wear' || catKey === 'mens-traditional-dept') {
        whereClauses.push("(p.category_id = 11 OR (p.gender = 'men' AND p.subcategory IN ('mens_kurtas', 'nehru_jackets', 'traditional_waistcoats', 'sherwani_outfits', 'kurta_pyjama_sets', 'indo_western', 'traditional_outfits', 'dhoti_sets')) OR p.name ILIKE '%sherwani%' OR p.name ILIKE '%kurta%' OR p.name ILIKE '%bandhgala%')");
      } else if (catKey === 'mens-western' || catKey === "men's western wear") {
        whereClauses.push("(p.category_id = 12 OR (p.gender = 'men' AND (p.category_id IN (5, 6, 7, 8) OR p.subcategory IN ('polo_t_shirts', 'shorts', 'hoodies', 'jackets', 'shirts', 'jeans', 'trousers', 'blazers', 'suits', 'casual_shirts', 'formal_shirts', 't_shirts', 'sweatshirts'))))");
      } else if (catKey === 'sarees') {
        whereClauses.push("(p.category_id = 1 OR p.garment_type = 'saree' OR p.subcategory ILIKE '%saree%')");
      } else if (catKey === 'shirts' || catKey === 'shirts & tops' || catKey === 'shirts-and-tops') {
        whereClauses.push("(p.category_id = 5 OR p.subcategory ILIKE '%shirt%' OR p.subcategory ILIKE '%blouse%' OR p.name ILIKE '%shirt%' OR p.name ILIKE '%blouse%')");
      } else if (catKey === 'jeans' || catKey === 'jeans & denim' || catKey === 'jeans-and-denim') {
        whereClauses.push("(p.category_id = 6 OR p.subcategory ILIKE '%jean%' OR p.subcategory ILIKE '%denim%')");
      } else if (catKey === 'dresses' || catKey === 'dresses & gowns' || catKey === 'dresses-and-gowns') {
        whereClauses.push("(p.subcategory IN ('gowns', 'maxi_dresses', 'evening_dresses', 'party_wear_dresses', 'casual_dresses', 'mini_dresses') OR p.garment_type = 'dress' OR p.subcategory ILIKE '%dress%' OR p.subcategory ILIKE '%gown%' OR p.name ILIKE '%gown%' OR p.name ILIKE '%dress%')");
      } else if (catKey === 'kurtis' || catKey === 'kurtis & ethnic wear' || catKey === 'kurtis-and-ethnic-wear') {
        whereClauses.push("(p.subcategory IN ('kurti_pant_sets') OR p.subcategory ILIKE '%kurti%' OR p.name ILIKE '%kurti%')");
      } else if (catKey === 'salwar' || catKey === 'salwar suits' || catKey === 'salwar-suits') {
        whereClauses.push("(p.subcategory IN ('anarkali_suits', 'salwar_kameez', 'churidar_sets', 'lehenga_choli') OR p.subcategory ILIKE '%salwar%' OR p.subcategory ILIKE '%anarkali%' OR p.subcategory ILIKE '%churidar%' OR p.subcategory ILIKE '%lehenga%')");
      } else if (catKey === 'blazers' || catKey === 'blazers & jackets' || catKey === 'blazers-and-jackets') {
        whereClauses.push("(p.category_id = 8 OR p.subcategory IN ('formal_suits', 'blazer_trouser_sets', 'tuxedos', 'three_piece_suits', 'smoking_jackets', 'dinner_jackets', 'power_suits', 'womens_tuxedos', 'western_coord_sets', 'jackets') OR p.name ILIKE '%blazer%' OR p.name ILIKE '%suit%' OR p.name ILIKE '%tuxedo%' OR p.name ILIKE '%jacket%')");
      } else if (catKey === 'trousers' || catKey === 'pants') {
        whereClauses.push("(p.category_id = 7 OR p.subcategory IN ('pleated_trousers', 'baggy_chinos', 'palazzo_pants', 'cargo_pants', 'balloon_trousers', 'shirt_trouser_combinations', 'shorts') OR p.name ILIKE '%trouser%' OR p.name ILIKE '%pant%' OR p.name ILIKE '%chino%' OR p.name ILIKE '%short%')");
      } else {
        whereClauses.push(`(p.subcategory = $${paramIndex} OR p.garment_type = $${paramIndex})`);
        sqlParams.push(catKey);
        paramIndex++;
      }
    }

    if (subcategory && subcategory !== 'all') {
      const subKey = subcategory.toLowerCase().trim();
      const cleanSub = subKey.replace(/-/g, '_').replace(/\s+/g, '_');
      whereClauses.push(`(
        LOWER(p.subcategory) = $${paramIndex} 
        OR LOWER(p.subcategory) = $${paramIndex + 1}
        OR p.subcategory ILIKE $${paramIndex + 2}
      )`);
      sqlParams.push(subKey, cleanSub, `%${cleanSub}%`);
      paramIndex += 3;
    }

    if (gender && gender !== 'all') {
      whereClauses.push(`(LOWER(p.gender) = LOWER($${paramIndex}) OR LOWER(p.gender) = 'unisex')`);
      sqlParams.push(gender);
      paramIndex++;
    }

    if (garmentType && garmentType !== 'all') {
      whereClauses.push(`LOWER(p.garment_type) = LOWER($${paramIndex})`);
      sqlParams.push(garmentType);
      paramIndex++;
    }

    if (tryonCompatibility && tryonCompatibility !== 'all') {
      whereClauses.push(`LOWER(p.tryon_compatibility) = LOWER($${paramIndex})`);
      sqlParams.push(tryonCompatibility);
      paramIndex++;
    }

    if (stockStatus && stockStatus !== 'all') {
      whereClauses.push(`LOWER(p.stock_status) = LOWER($${paramIndex})`);
      sqlParams.push(stockStatus);
      paramIndex++;
    }

    if (search) {
      whereClauses.push(`(p.name ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex} OR p.brand ILIKE $${paramIndex} OR p.subcategory ILIKE $${paramIndex})`);
      sqlParams.push(`%${search}%`);
      paramIndex++;
    }

    if (brand && brand !== 'all') {
      whereClauses.push(`LOWER(p.brand) = LOWER($${paramIndex})`);
      sqlParams.push(brand);
      paramIndex++;
    }

    if (source && source !== 'all') {
      whereClauses.push(`LOWER(p.source) = LOWER($${paramIndex})`);
      sqlParams.push(source);
      paramIndex++;
    }

    if (minPrice && !isNaN(Number(minPrice))) {
      whereClauses.push(`p.price >= $${paramIndex}`);
      sqlParams.push(Number(minPrice));
      paramIndex++;
    }

    if (maxPrice && !isNaN(Number(maxPrice))) {
      whereClauses.push(`p.price <= $${paramIndex}`);
      sqlParams.push(Number(maxPrice));
      paramIndex++;
    }

    if (aiReady === 'true') {
      whereClauses.push(`(p.tryon_compatibility = 'supported' OR p.approval_status = 'AI_READY')`);
    }

    if (featured === 'true') {
      whereClauses.push(`p.is_featured = true`);
    }

    const sql = `
      SELECT 
        p.id,
        p.sku,
        p.name,
        p.slug,
        p.brand,
        p.subcategory,
        p.gender,
        p.garment_type AS "garmentType",
        p.tryon_compatibility AS "tryonCompatibility",
        p.stock_status AS "stockStatus",
        p.price,
        p.original_price AS "originalPrice",
        p.currency,
        p.description,
        p.material,
        p.fit,
        p.care_instructions AS "careInstructions",
        p.sizes,
        p.primary_image_url AS "primaryImage",
        p.tryon_image_url AS "tryonImage",
        p.is_sample AS "isSample",
        p.is_featured AS "isFeatured",
        p.is_active AS "isActive",
        p.color,
        p.needs_admin_review AS "needsAdminReview",
        p.discount_percent AS "discountPercent",
        p.image_width AS "imageWidth",
        p.image_height AS "imageHeight",
        p.approval_status AS "approvalStatus",
        p.myntra_url AS "myntraUrl",
        p.source AS "source",
        p.source_url AS "sourceUrl",
        p.affiliate_url AS "affiliateUrl",
        p.external_product_id AS "externalProductId",
        p.supplier_id AS "supplierId",
        sa.company_name AS "supplierName",
        c.name AS "categoryName",
        c.slug AS "categorySlug"
      FROM (
        SELECT * FROM products p
        WHERE ${whereClauses.join(' AND ')}
      ) p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN supplier_accounts sa ON p.supplier_id = sa.id
    `;

    const result = await query(sql, sqlParams);

    // Ensure sizes is parsed if stored as JSON string and enrich with image metadata
    const sanitizedRows = result.rows.map((row) => {
      let sizes = row.sizes;
      if (typeof sizes === 'string') {
        try {
          sizes = JSON.parse(sizes);
        } catch (e) {
          sizes = ['XS', 'S', 'M', 'L', 'XL'];
        }
      }

      const imgMeta = imageValidationService.getGarmentMetadata(row.primaryImage);
      const width = row.imageWidth || imgMeta.width || (row.primaryImage?.startsWith('http') ? 1200 : null);
      const height = row.imageHeight || imgMeta.height || (row.primaryImage?.startsWith('http') ? 1600 : null);
      const isTooSmall = (width && height && (width < 250 || height < 250)) || row.tryonCompatibility === 'needs_image_replacement';
      const isAiReady = !isTooSmall && row.tryonCompatibility === 'supported';
      const dimensionLabel = width && height ? `${width} × ${height} px` : (imgMeta.dimensionLabel || 'Standard');
      const qualityStatus = isTooSmall ? 'too_small' : (width >= 1024 && height >= 1024 ? 'high_resolution' : 'standard');

      return {
        ...row,
        sizes,
        imageWidth: width,
        imageHeight: height,
        dimensionLabel,
        qualityStatus,
        isAiReady,
        images: [row.primaryImage].filter(Boolean)
      };
    });

    // Flexible multi-engine sorting
    if (sort === 'price-low' || sort === 'price-asc') {
      sanitizedRows.sort((a, b) => Number(a.price) - Number(b.price));
    } else if (sort === 'price-high' || sort === 'price-desc') {
      sanitizedRows.sort((a, b) => Number(b.price) - Number(a.price));
    } else if (sort === 'name') {
      sanitizedRows.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === 'newest') {
      sanitizedRows.sort((a, b) => b.id - a.id);
    } else {
      // featured / default
      sanitizedRows.sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0) || b.id - a.id);
    }

    return res.json({
      success: true,
      source: 'postgresql',
      count: sanitizedRows.length,
      data: sanitizedRows
    });
  } catch (err) {
    console.error('[Products Route] Failed to fetch products from PostgreSQL:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Database query failed: ' + err.message
    });
  }
});

/**
 * GET /api/products/:id
 * Retrieve single product details by ID or slug directly from PostgreSQL
 */
router.get('/products/:id', async (req, res) => {
  const { id } = req.params;
  const isNumeric = /^\d+$/.test(id);

  try {
    const sql = `
      SELECT 
        p.id,
        p.sku,
        p.name,
        p.slug,
        p.brand,
        p.subcategory,
        p.gender,
        p.garment_type AS "garmentType",
        p.tryon_compatibility AS "tryonCompatibility",
        p.stock_status AS "stockStatus",
        p.price,
        p.original_price AS "originalPrice",
        p.currency,
        p.description,
        p.material,
        p.fit,
        p.care_instructions AS "careInstructions",
        p.sizes,
        p.primary_image_url AS "primaryImage",
        p.tryon_image_url AS "tryonImage",
        p.is_sample AS "isSample",
        p.is_featured AS "isFeatured",
        p.is_active AS "isActive",
        p.color,
        p.needs_admin_review AS "needsAdminReview",
        p.discount_percent AS "discountPercent",
        p.image_width AS "imageWidth",
        p.image_height AS "imageHeight",
        p.approval_status AS "approvalStatus",
        p.myntra_url AS "myntraUrl",
        p.supplier_id AS "supplierId",
        sa.company_name AS "supplierName",
        c.name AS "categoryName",
        c.slug AS "categorySlug"
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN supplier_accounts sa ON p.supplier_id = sa.id
      WHERE ${isNumeric ? 'p.id = $1' : 'p.slug = $1'}
      LIMIT 1
    `;

    const result = await query(sql, [isNumeric ? parseInt(id, 10) : id]);

    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Product not found in database.',
        requestedId: id
      });
    }

    const product = result.rows[0];

    // Fetch associated product images
    const imagesResult = await query(
      `SELECT image_url AS "imageUrl", alt_text AS "altText", is_primary AS "isPrimary"
       FROM product_images
       WHERE product_id = $1
       ORDER BY sort_order ASC`,
      [product.id]
    );

    const imageList = imagesResult.rows.map((r) => r.imageUrl);
    product.images = imageList.length > 0 ? imageList : [product.primaryImage].filter(Boolean);

    if (typeof product.sizes === 'string') {
      try {
        product.sizes = JSON.parse(product.sizes);
      } catch (e) {
        product.sizes = ['XS', 'S', 'M', 'L', 'XL'];
      }
    }

    const imgMeta = imageValidationService.getGarmentMetadata(product.primaryImage);
    const width = product.imageWidth || imgMeta.width || (product.primaryImage?.startsWith('http') ? 1200 : null);
    const height = product.imageHeight || imgMeta.height || (product.primaryImage?.startsWith('http') ? 1600 : null);
    const isTooSmall = (width && height && (width < 250 || height < 250)) || product.tryonCompatibility === 'needs_image_replacement';
    product.imageWidth = width;
    product.imageHeight = height;
    product.dimensionLabel = width && height ? `${width} × ${height} px` : (imgMeta.dimensionLabel || 'Standard');
    product.qualityStatus = isTooSmall ? 'too_small' : (width >= 1024 && height >= 1024 ? 'high_resolution' : 'standard');
    product.isAiReady = !isTooSmall && product.tryonCompatibility === 'supported';

    return res.json({
      success: true,
      source: 'postgresql',
      data: product
    });
  } catch (err) {
    console.error('[Products Route] Failed to fetch product details from PostgreSQL:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Database query failed: ' + err.message
    });
  }
});

export default router;
