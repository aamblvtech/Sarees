import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const outDir = path.resolve('frontend/screenshots/after');
fs.mkdirSync(outDir, { recursive: true });

const BASE_URL = 'http://localhost:5173';

const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844 }
];

async function run() {
  const browser = await chromium.launch({ headless: true });
  
  // 1. Obtain tokens for admin and supplier
  console.log('Logging in to get auth tokens...');
  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  await adminPage.goto(`${BASE_URL}/admin/login`, { waitUntil: 'networkidle' });
  await adminPage.fill('input[type="email"]', 'admin@vestra.com');
  await adminPage.fill('input[type="password"]', 'AdminPassword2026!');
  await adminPage.click('button[type="submit"]');
  await adminPage.waitForURL('**/admin/dashboard', { timeout: 10000 }).catch(() => {});
  const adminStorage = await adminContext.storageState();
  await adminContext.close();

  const supplierContext = await browser.newContext();
  const supplierPage = await supplierContext.newPage();
  await supplierPage.goto(`${BASE_URL}/supplier/login`, { waitUntil: 'networkidle' });
  await supplierPage.fill('input[type="email"]', 'supplier@surathandloom.com');
  await supplierPage.fill('input[type="password"]', 'SupplierPass2026!');
  await supplierPage.click('button[type="submit"]');
  await supplierPage.waitForURL('**/supplier/dashboard', { timeout: 10000 }).catch(() => {});
  const supplierStorage = await supplierContext.storageState();
  await supplierContext.close();

  console.log('Auth tokens captured.');

  for (const vp of viewports) {
    console.log(`\n--- Capturing for viewport: ${vp.name} (${vp.width}x${vp.height}) ---`);
    
    // Normal public context
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1
    });
    const page = await context.newPage();

    // 1. Homepage
    console.log(`Capturing 01_home_${vp.name}...`);
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(outDir, `01_home_${vp.name}.png`), fullPage: false });

    // 2. Customer Catalogue
    console.log(`Capturing 02_catalogue_${vp.name}...`);
    await page.goto(`${BASE_URL}/catalogue`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(outDir, `02_catalogue_${vp.name}.png`), fullPage: false });

    // 3. Product Details (ID 1)
    console.log(`Capturing 03_product_details_${vp.name}...`);
    await page.goto(`${BASE_URL}/products/1`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(outDir, `03_product_details_${vp.name}.png`), fullPage: false });

    // 4. Virtual Fitting Room
    console.log(`Capturing 04_virtual_fitting_room_${vp.name}...`);
    await page.goto(`${BASE_URL}/try-on`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(outDir, `04_virtual_fitting_room_${vp.name}.png`), fullPage: false });

    // 5. Smart Camera and pose detection (trigger camera UI in try-on)
    console.log(`Capturing 05_smart_camera_${vp.name}...`);
    const cameraBtn = await page.$('button:has-text("Take Live Photo"), button:has-text("Start Camera"), button:has-text("Camera")');
    if (cameraBtn) {
      await cameraBtn.click().catch(() => {});
      await page.waitForTimeout(1200);
    }
    await page.screenshot({ path: path.join(outDir, `05_smart_camera_${vp.name}.png`), fullPage: false });

    // 6. Mall Kiosk
    console.log(`Capturing 06_mall_kiosk_${vp.name}...`);
    await page.goto(`${BASE_URL}/kiosk`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(outDir, `06_mall_kiosk_${vp.name}.png`), fullPage: false });

    // 9A. Admin Login
    console.log(`Capturing 09a_admin_login_${vp.name}...`);
    await page.goto(`${BASE_URL}/admin/login`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(outDir, `09a_admin_login_${vp.name}.png`), fullPage: false });

    // 9B. Supplier Login / Register
    console.log(`Capturing 09b_supplier_login_${vp.name}...`);
    await page.goto(`${BASE_URL}/supplier/login`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(outDir, `09b_supplier_login_${vp.name}.png`), fullPage: false });

    await context.close();

    // 7. Admin Dashboard (with admin storage)
    console.log(`Capturing 07_admin_dashboard_${vp.name}...`);
    const adminCtx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
      storageState: adminStorage
    });
    const adminP = await adminCtx.newPage();
    await adminP.goto(`${BASE_URL}/admin/dashboard`, { waitUntil: 'networkidle' });
    await adminP.waitForTimeout(1200);
    await adminP.screenshot({ path: path.join(outDir, `07_admin_dashboard_${vp.name}.png`), fullPage: false });
    await adminCtx.close();

    // 8. Supplier Dashboard (with supplier storage)
    console.log(`Capturing 08_supplier_dashboard_${vp.name}...`);
    const supplierCtx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
      storageState: supplierStorage
    });
    const supplierP = await supplierCtx.newPage();
    await supplierP.goto(`${BASE_URL}/supplier/dashboard`, { waitUntil: 'networkidle' });
    await supplierP.waitForTimeout(1200);
    await supplierP.screenshot({ path: path.join(outDir, `08_supplier_dashboard_${vp.name}.png`), fullPage: false });
    await supplierCtx.close();
  }

  await browser.close();
  console.log('\nAll 30 "after" screenshots successfully captured in frontend/screenshots/after!');
}

run().catch((err) => {
  console.error('Fatal error during screenshot capture:', err);
  process.exit(1);
});

