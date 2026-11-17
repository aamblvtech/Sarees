import { chromium } from 'playwright';

async function testAdmin() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  console.log('Navigating to /admin/login...');
  await page.goto('http://localhost:5173/admin/login', { waitUntil: 'networkidle' });

  console.log('Submitting credentials...');
  await page.fill('input[type="email"]', 'admin@vestra.com');
  await page.fill('input[type="password"]', 'AdminPassword2026!');
  await page.click('button[type="submit"]');

  console.log('Waiting for URL or navigation...');
  await page.waitForTimeout(3000);
  console.log('Current URL:', page.url());

  const content = await page.textContent('body');
  console.log('Body snippet:', content.substring(0, 300));

  await browser.close();
}

testAdmin().catch(console.error);
