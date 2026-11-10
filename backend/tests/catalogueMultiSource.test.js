import test from 'node:test';
import assert from 'node:assert/strict';
import { FlipkartAdapter } from '../src/adapters/catalogue/flipkartAdapter.js';
import { MyntraAdapter } from '../src/adapters/catalogue/myntraAdapter.js';
import { AmazonAdapter } from '../src/adapters/catalogue/amazonAdapter.js';
import { SupplierCsvAdapter } from '../src/adapters/catalogue/supplierCsvAdapter.js';
import { ManualImportAdapter } from '../src/adapters/catalogue/manualImportAdapter.js';
import {
  getCatalogueSourcesOverview,
  ingestNormalizedProduct
} from '../src/adapters/catalogue/index.js';
import { initializeDatabase, query } from '../src/config/db.js';

test('Multi-Source Fashion Catalogue Integration Suite', async (t) => {
  // Setup database tables via pg-mem
  await initializeDatabase();

  await t.test('1. Flipkart Adapter checks credentials and provides informative unconfigured status without scraping', async () => {
    delete process.env.FLIPKART_AFFILIATE_ID;
    delete process.env.FLIPKART_AFFILIATE_TOKEN;

    const adapter = new FlipkartAdapter();
    const status = await adapter.getConnectionStatus();

    assert.equal(status.configured, false);
    assert.equal(status.status, 'unconfigured');
    assert.ok(status.message.includes('FLIPKART_AFFILIATE_ID'));
    assert.ok(status.message.includes('Scraping is strictly disabled'));

    const connTest = await adapter.testConnection();
    assert.equal(connTest.success, false);
    assert.equal(connTest.status, 'unconfigured');
  });

  await t.test('2. Flipkart Adapter normalizes API feed payload into standard product schema', async () => {
    const adapter = new FlipkartAdapter();
    const rawFk = {
      productBaseInfoV1: {
        productId: 'FK-TEST-101',
        title: 'Kanjeevaram Silk Woven Saree',
        productBrand: 'Vimla',
        productDescription: 'Artisanal golden zari kanjeevaram saree.',
        flipkartSellingPrice: { amount: 4500, currency: 'INR' },
        maximumRetailPrice: { amount: 8999, currency: 'INR' },
        productUrl: 'https://www.flipkart.com/vimla-saree/p/itm101',
        inStock: true,
        categoryPath: 'Apparel > Ethnic Wear > Sarees',
        imageUrls: {
          '800x800': 'https://images.unsplash.com/photo-1610030469983-98e550d6193c',
          '400x400': 'https://images.unsplash.com/photo-thumb'
        },
        attributes: { color: 'Crimson', fabric: 'Pure Silk' }
      }
    };

    const norm = adapter.normalizeProduct(rawFk);
    assert.equal(norm.external_product_id, 'FK-TEST-101');
    assert.equal(norm.source, 'flipkart');
    assert.equal(norm.brand, 'Vimla');
    assert.equal(norm.selling_price, 4500);
    assert.equal(norm.category, 'sarees');
    assert.equal(norm.garment_type, 'saree');
    assert.equal(norm.image_urls[0], 'https://images.unsplash.com/photo-1610030469983-98e550d6193c');
    assert.equal(norm.image_usage_permission, 'needs_review');
  });

  await t.test('3. Myntra Adapter remains disabled until authorised seller credentials exist', async () => {
    delete process.env.MYNTRA_PARTNER_ID;
    delete process.env.MYNTRA_PARTNER_SECRET;

    const adapter = new MyntraAdapter();
    const status = await adapter.getConnectionStatus();

    assert.equal(status.configured, false);
    assert.equal(status.status, 'pending_partner_approval');
    assert.ok(status.message.includes('MYNTRA_PARTNER_ID'));
  });

  await t.test('4. Amazon Adapter enforces Associates eligibility and normalizes PA-API responses', async () => {
    delete process.env.AMAZON_ASSOCIATE_TAG;
    delete process.env.AMAZON_ACCESS_KEY;

    const adapter = new AmazonAdapter();
    const status = await adapter.getConnectionStatus();

    assert.equal(status.configured, false);
    assert.ok(status.message.includes('Associates eligibility'));

    const rawAmz = {
      ASIN: 'B09AMZTEST',
      DetailPageURL: 'https://www.amazon.in/dp/B09AMZTEST',
      ItemInfo: {
        Title: { DisplayValue: 'Raymond Men Formal White Oxford Shirt' },
        ByLineInfo: { Brand: { DisplayValue: 'Raymond' } },
        Features: { DisplayValues: ['100% Giza Cotton', 'Structured Collar'] },
        Color: { DisplayValue: 'White' },
        Material: { DisplayValue: 'Cotton' }
      },
      Offers: { Listings: [{ Price: { Amount: 1999, Currency: 'INR' } }] },
      Images: {
        Primary: { Large: { URL: 'https://images.unsplash.com/photo-shirt.jpg' } }
      }
    };

    const norm = adapter.normalizeProduct(rawAmz);
    assert.equal(norm.external_product_id, 'B09AMZTEST');
    assert.equal(norm.source, 'amazon');
    assert.equal(norm.brand, 'Raymond');
    assert.equal(norm.category, 'shirts');
    assert.equal(norm.garment_type, 'upper_body');
    assert.equal(norm.selling_price, 1999);
  });

  await t.test('5. Supplier CSV Adapter parses CSV with quoted text, delimiters, and multi-images', async () => {
    const adapter = new SupplierCsvAdapter();
    const csvData = `external_product_id,product_name,brand,selling_price,original_price,category,garment_type,colour,fabric,image_urls,image_usage_permission
SUP-SKU-001,"Surat Handloom Georgette Bandhani Saree",Surat Handloom Mills,2499,4999,Sarees,saree,Red,Georgette,"https://images.unsplash.com/photo-saree1.jpg|https://images.unsplash.com/photo-saree2.jpg",confirmed
SUP-SKU-002,"Bespoke Italian Poplin Shirt",Aura Fashion,1299,2599,Shirts,upper_body,Sky Blue,Cotton,https://images.unsplash.com/photo-shirt1.jpg,confirmed`;

    const parsed = adapter.parseCsv(csvData, { supplierId: 1, supplierName: 'Surat Handloom Mills' });

    assert.equal(parsed.totalParsed, 2);
    assert.equal(parsed.errors.length, 0);

    const saree = parsed.products[0];
    assert.equal(saree.external_product_id, 'SUP-SKU-001');
    assert.equal(saree.product_name, 'Surat Handloom Georgette Bandhani Saree');
    assert.equal(saree.category, 'sarees');
    assert.equal(saree.image_urls.length, 2);
    assert.equal(saree.image_usage_permission, 'confirmed');

    const shirt = parsed.products[1];
    assert.equal(shirt.external_product_id, 'SUP-SKU-002');
    assert.equal(shirt.category, 'shirts');
    assert.equal(shirt.selling_price, 1299);
  });

  await t.test('6. Ingest normalized product enforces duplicate prevention and strict AI readiness guardrails', async () => {
    const rawProduct = {
      source: 'supplier_csv',
      external_product_id: 'EXT-TEST-DUP-01',
      source_product_url: 'https://supplier.com/item/1',
      brand: 'Varanasi Master Weavers',
      product_name: 'Varanasi Antique Zari Organza Saree',
      description: 'Handwoven pure organza silk saree.',
      selling_price: 5200,
      original_price: 9500,
      currency: 'INR',
      category_id: 1,
      subcategory: 'organza',
      gender: 'women',
      garment_type: 'saree',
      colour: 'Gold & Ivory',
      fabric: 'Organza Silk',
      image_urls: ['https://images.unsplash.com/photo-organza.jpg'],
      image_usage_permission: 'confirmed',
      stock_status: 'in_stock',
      supplier_id: 2
    };

    // First ingestion: creates product
    const res1 = await ingestNormalizedProduct(rawProduct);
    assert.ok(res1.productId);
    assert.equal(res1.approvalStatus, 'PENDING', 'Imported items must start in PENDING awaiting admin review');
    assert.equal(res1.isAiReady, false, 'Imported items CANNOT be marked AI_READY automatically');

    // Second ingestion with same external_product_id and source: updates existing product without duplicate ID
    const rawProductUpdated = {
      ...rawProduct,
      selling_price: 4999
    };

    const res2 = await ingestNormalizedProduct(rawProductUpdated);
    assert.equal(res2.productId, res1.productId, 'Must update existing record instead of creating duplicate');

    // Verify in database
    const dbCheck = await query('SELECT price FROM products WHERE id = $1', [res1.productId]);
    assert.equal(Number(dbCheck.rows[0].price), 4999);
  });

  await t.test('7. Catalogue Sources Overview aggregates live adapter status and product counts', async () => {
    const overview = await getCatalogueSourcesOverview();
    assert.ok(Array.isArray(overview));
    assert.ok(overview.length >= 5);

    const flipkart = overview.find((s) => s.slug === 'flipkart');
    assert.ok(flipkart);
    assert.equal(flipkart.status, 'unconfigured');

    const csvSource = overview.find((s) => s.slug === 'supplier_csv');
    assert.ok(csvSource);
    assert.equal(csvSource.status, 'active');
    assert.ok(csvSource.productsImported >= 1);
  });
});

