import { chromium } from 'playwright';

async function testKiosk() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });

  console.log('Navigating to /kiosk...');
  await page.goto('http://localhost:5173/kiosk', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const welcome = await page.textContent('body');
  console.log('Welcome screen snippet:', welcome.substring(0, 200));

  const startBtn = await page.$('button:has-text("Start virtual fitting")');
  if (startBtn) {
    console.log('Clicking Start virtual fitting...');
    await startBtn.click();
    await page.waitForTimeout(1000);
    const consent = await page.textContent('body');
    console.log('Consent screen snippet:', consent.substring(0, 300));

    const acceptBtn = await page.$('button:has-text("I agree"), button:has-text("Agree"), button:has-text("Accept"), button:has-text("Continue")');
    console.log('Found accept button:', !!acceptBtn);
  }

  await browser.close();
}

testKiosk().catch(console.error);
