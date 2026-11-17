import { chromium } from 'playwright';

async function testSupplier() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('SUPPLIER PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('SUPPLIER PAGE ERROR:', err.message));

  console.log('Navigating to /supplier/login...');
  await page.goto('http://localhost:5173/supplier/login', { waitUntil: 'networkidle' });

  console.log('Submitting credentials...');
  await page.fill('input[type="email"]', 'supplier@surathandloom.com');
  await page.fill('input[type="password"]', 'SupplierPass2026!');
  await page.click('button[type="submit"]');

  console.log('Waiting for URL or navigation...');
  await page.waitForTimeout(3000);
  console.log('Current URL:', page.url());

  const content = await page.textContent('body');
  console.log('Body snippet:', content.substring(0, 300));

  await browser.close();
}

testSupplier().catch(console.error);
