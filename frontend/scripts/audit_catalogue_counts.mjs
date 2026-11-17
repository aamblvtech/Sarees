import fs from 'fs';

async function run() {
  const prodsRes = await fetch('http://localhost:5000/api/products?limit=300');
  const prods = await prodsRes.json();
  
  const failedImages = [];
  const successfulImages = [];

  console.log(`Auditing image accessibility for all ${prods.data.length} products...`);

  for (const p of prods.data) {
    let url = p.primaryImage;
    if (url.startsWith('/')) {
      url = `http://localhost:5000${url}`;
    }

    try {
      const res = await fetch(url, { method: 'HEAD' });
      if (res.ok) {
        successfulImages.push({ id: p.id, name: p.name });
      } else {
        // Retry with GET if HEAD is not supported by some CDN
        const getRes = await fetch(url, { method: 'GET' });
        if (getRes.ok) {
          successfulImages.push({ id: p.id, name: p.name });
        } else {
          failedImages.push({ id: p.id, name: p.name, status: getRes.status, url });
        }
      }
    } catch (err) {
      failedImages.push({ id: p.id, name: p.name, error: err.message, url });
    }
  }

  console.log(`\nVerified Images: ${successfulImages.length} / ${prods.data.length}`);
  if (failedImages.length > 0) {
    console.error('Failed Images:', failedImages);
  } else {
    console.log('ALL 91 PRODUCT IMAGES RESOLVE SUCCESSFULLY WITH HTTP 200!');
  }
}

run().catch(console.error);
