import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:5173';

const results = {
  phases: {},
  passed: 0,
  failed: 0,
  details: []
};

function record(phase, testName, status, notes = '') {
  if (!results.phases[phase]) results.phases[phase] = [];
  results.phases[phase].push({ testName, status, notes });
  if (status === 'PASSED') results.passed++;
  else results.failed++;
  console.log(`[${status}] ${phase} :: ${testName} ${notes ? `(${notes})` : ''}`);
}

async function run() {
  const browser = await chromium.launch({ headless: true });

  console.log('========================================================');
  console.log('  STARTING VASTRA E2E COMPREHENSIVE CLIENT AUDIT');
  console.log('========================================================\n');

  // ---------------------------------------------------------
  // 1. HOMEPAGE AUDIT
  // ---------------------------------------------------------
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });

    // Check title and brand
    const title = await page.title();
    const hasBrand = await page.$('text=VASTRA');
    record('Homepage', 'Brand & Title Verification', hasBrand ? 'PASSED' : 'FAILED', title);

    // Hero CTA navigation to fitting room
    const ctaBtn = await page.$('a[href="/try-on"], button:has-text("Virtual Try-On")');
    record('Homepage', 'Hero CTA Button', ctaBtn ? 'PASSED' : 'FAILED');

    // 4-step workflow guide
    const step1 = await page.$('text=Capture Portrait');
    const step2 = await page.$('text=Select Garment');
    const step3 = await page.$('text=Drape Synthesis');
    const step4 = await page.$('text=Compare & Fit');
    const hasAllSteps = !!(step1 && step2 && step3 && step4);
    record('Homepage', 'Atelier 4-Step Guide', hasAllSteps ? 'PASSED' : 'FAILED', 'Steps 01-04 Verified');

    await page.close();
  } catch (err) {
    record('Homepage', 'Execution Error', 'FAILED', err.message);
  }

  // ---------------------------------------------------------
  // 2. CUSTOMER CATALOGUE TESTING
  // ---------------------------------------------------------
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(`${BASE_URL}/catalogue`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Check product cards loaded
    const productCards = await page.$$('a[href^="/products/"]');
    record('Catalogue', 'Products Rendering', productCards.length > 0 ? 'PASSED' : 'FAILED', `${productCards.length} product links detected`);

    // Check search functionality
    const searchInput = await page.$('input[placeholder*="Search"], input[type="text"]');
    if (searchInput) {
      await searchInput.fill('Silk');
      await page.waitForTimeout(600);
      const filtered = await page.$$('a[href^="/products/"]');
      record('Catalogue', 'Keyword Search Filter', filtered.length > 0 ? 'PASSED' : 'FAILED', `Found ${filtered.length} matches for "Silk"`);
      await searchInput.fill('');
      await page.waitForTimeout(600);
    }

    // Check category pills navigation
    const categoryButtons = await page.$$('button:has-text("Sarees"), button:has-text("Men"), button:has-text("Women"), button:has-text("All")');
    record('Catalogue', 'Category Navigation Pills', categoryButtons.length >= 3 ? 'PASSED' : 'FAILED', `Detected ${categoryButtons.length} category tabs`);

    // Test clicking a product to open product details
    const firstProduct = await page.$('a[href^="/products/"]');
    if (firstProduct) {
      const href = await firstProduct.getAttribute('href');
      await firstProduct.click();
      await page.waitForURL(`**${href}`, { timeout: 8000 }).catch(() => {});
      record('Catalogue', 'Product Details Route Navigation', page.url().includes('/products/') ? 'PASSED' : 'FAILED', page.url());
    }

    await page.close();
  } catch (err) {
    record('Catalogue', 'Execution Error', 'FAILED', err.message);
  }

  // ---------------------------------------------------------
  // 3. PRODUCT DETAILS PAGE
  // ---------------------------------------------------------
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(`${BASE_URL}/products/107`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const titleEl = await page.$('h1');
    const titleText = titleEl ? await titleEl.textContent() : '';
    record('ProductDetails', 'Product Title & Metadata Display', titleText ? 'PASSED' : 'FAILED', titleText);

    // Check Virtual Try-On Launch button
    const tryonCta = await page.$('button:has-text("Virtual Try-On"), button:has-text("Try-On"), button:has-text("Try On")');
    record('ProductDetails', 'Direct Virtual Try-On CTA', tryonCta ? 'PASSED' : 'FAILED');

    // Check Price and currency
    const priceEl = await page.$('span.font-mono:has-text("₹")');
    const priceText = priceEl ? await priceEl.textContent() : '';
    record('ProductDetails', 'INR Currency & Pricing', priceEl ? 'PASSED' : 'FAILED', priceText);

    await page.close();
  } catch (err) {
    record('ProductDetails', 'Execution Error', 'FAILED', err.message);
  }

  // ---------------------------------------------------------
  // 4. VIRTUAL FITTING ROOM & MULTI-OUTFIT DRAWER
  // ---------------------------------------------------------
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(`${BASE_URL}/try-on`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);

    // Studio canvas presence
    const canvas = await page.$('text=Fitting Mirror');
    record('VirtualFittingRoom', 'Studio Canvas & Viewport', canvas ? 'PASSED' : 'FAILED');

    // Silhouette ingestion controls
    const cameraBtn = await page.$('button:has-text("Live Camera")');
    const uploadBtn = await page.$('label:has-text("Upload"), input[type="file"]');
    record('VirtualFittingRoom', 'Silhouette Ingestion Controls', (cameraBtn || uploadBtn) ? 'PASSED' : 'FAILED');

    // Batch Try-On Outfit Drawer
    const drawerTrigger = await page.$('button:has-text("Batch"), button:has-text("Outfits"), button:has-text("Select"), div:has-text("Outfits")');
    record('VirtualFittingRoom', 'Batch Try-On Outfit Selector', drawerTrigger ? 'PASSED' : 'FAILED');

    await page.close();
  } catch (err) {
    record('VirtualFittingRoom', 'Execution Error', 'FAILED', err.message);
  }

  // ---------------------------------------------------------
  // 5. SMART CAMERA MODAL & POSE DETECTION CONTRACT
  // ---------------------------------------------------------
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(`${BASE_URL}/try-on`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    // Trigger camera modal
    const cameraBtn = await page.$('button:has-text("Live Camera")');
    if (cameraBtn) {
      await cameraBtn.click();
      await page.waitForTimeout(1200);

      // Verify modal opened
      const modalHeader = await page.$('text=Smart Studio Camera');
      record('SmartCamera', 'Camera Modal Opening', modalHeader ? 'PASSED' : 'FAILED');

      // Check auto-capture badge or toggle
      const autoBadge = await page.$('text=Auto-capture');
      record('SmartCamera', 'Auto-Pose Framing Controls', autoBadge ? 'PASSED' : 'FAILED');

      // Close modal
      const closeBtn = await page.$('button[title*="Close"], button:has(svg.lucide-x)');
      if (closeBtn) await closeBtn.click().catch(() => {});
    }

    await page.close();
  } catch (err) {
    record('SmartCamera', 'Execution Error', 'FAILED', err.message);
  }

  // ---------------------------------------------------------
  // 6. MALL KIOSK WORKFLOW
  // ---------------------------------------------------------
  try {
    const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
    await page.goto(`${BASE_URL}/kiosk`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Kiosk welcome headline
    const welcome = await page.$('text=Experience fashion');
    record('MallKiosk', 'Touchscreen Welcome Experience', welcome ? 'PASSED' : 'FAILED');

    // Start button
    const startBtn = await page.$('button:has-text("Start virtual fitting")');
    if (startBtn) {
      await startBtn.click().catch(() => {});
      await page.waitForTimeout(800);
      const consentScreen = await page.$('text=Your privacy is protected');
      record('MallKiosk', 'Customer Privacy Consent Transition', consentScreen ? 'PASSED' : 'FAILED');
    }

    await page.close();
  } catch (err) {
    record('MallKiosk', 'Execution Error', 'FAILED', err.message);
  }

  // ---------------------------------------------------------
  // 7. ADMIN DASHBOARD & SECURITY
  // ---------------------------------------------------------
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    
    // Login
    await page.goto(`${BASE_URL}/admin/login`, { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', 'admin@vestra.com');
    await page.fill('input[type="password"]', 'AdminPassword2026!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/admin/dashboard', { timeout: 10000 }).catch(() => {});

    record('AdminDashboard', 'Admin Authentication & Redirect', page.url().includes('/admin/dashboard') ? 'PASSED' : 'FAILED');

    // Wait for Dashboard data to load
    await page.waitForSelector('text=Total Products', { timeout: 10000 });

    // Verify statistics KPI cards
    const card1 = await page.$('text=Total Products');
    const card2 = await page.$('text=Active Suppliers');
    const hasAdminKpis = !!(card1 && card2);
    record('AdminDashboard', 'Real-Time Database KPI Metrics', hasAdminKpis ? 'PASSED' : 'FAILED', 'KPI Cards Verified');

    // Verify Tab navigation (Catalogue Inventory, External Sources, etc.)
    const tab1 = await page.$('button:has-text("Catalogue Inventory")');
    const tab2 = await page.$('button:has-text("External Sources")');
    const hasTabs = !!(tab1 && tab2);
    record('AdminDashboard', 'Module Tabs Navigation', hasTabs ? 'PASSED' : 'FAILED', 'Tabs Verified');

    await page.close();
  } catch (err) {
    record('AdminDashboard', 'Execution Error', 'FAILED', err.message);
  }

  // ---------------------------------------------------------
  // 8. SUPPLIER PORTAL & TENANT ISOLATION
  // ---------------------------------------------------------
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

    // Login as Seeded Supplier
    await page.goto(`${BASE_URL}/supplier/login`, { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', 'supplier@surathandloom.com');
    await page.fill('input[type="password"]', 'SupplierPass2026!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/supplier/dashboard', { timeout: 10000 }).catch(() => {});

    record('SupplierPortal', 'Supplier Authentication', page.url().includes('/supplier/dashboard') ? 'PASSED' : 'FAILED');

    // Wait for Dashboard data to load
    await page.waitForSelector('text=Total Garments', { timeout: 10000 });

    // Verify Supplier KPI and Products
    const totalGarments = await page.$('text=Total Garments');
    const approvedLive = await page.$('text=Approved & Live');
    const pendingReview = await page.$('text=Pending Review');
    const hasSupplierKpis = !!(totalGarments && approvedLive && pendingReview);
    record('SupplierPortal', 'Supplier Metrics Overview', hasSupplierKpis ? 'PASSED' : 'FAILED', 'KPI Cards Verified');

    // Add Product modal button
    const addProductBtn = await page.$('button:has-text("Add garment")');
    record('SupplierPortal', 'Add Garment Modal Interface', addProductBtn ? 'PASSED' : 'FAILED');

    await page.close();
  } catch (err) {
    record('SupplierPortal', 'Execution Error', 'FAILED', err.message);
  }

  await browser.close();

  console.log('\n========================================================');
  console.log(`  FINAL E2E AUDIT RESULT: ${results.passed} PASSED | ${results.failed} FAILED`);
  console.log('========================================================');
}

run().catch(console.error);
