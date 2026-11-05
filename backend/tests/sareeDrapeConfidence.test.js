import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeDatabase, query } from '../src/config/db.js';
import { runSeed } from '../src/db/seed.js';
import { resultQualityService } from '../src/services/resultQualityService.js';
import { garmentPromptGenerator } from '../src/services/garmentPromptGenerator.js';
import { executeSingleTryOnJob } from '../src/routes/tryon.routes.js';

process.env.GENLOOK_API_KEY = process.env.GENLOOK_API_KEY || 'gk_mock_test_key_123';
process.env.GENLOOK_MOCK = 'true';
process.env.GENLOOK_ENABLED = 'false';

test('Saree Drape Confidence and 5-Pillar Validation Suite', async (t) => {
  await initializeDatabase();
  await runSeed();

  const mockFullBodyFraming = {
    framing: 'full_body',
    suitabilityScore: 95,
    width: 1200,
    height: 1600,
    aspectRatio: 1.33
  };

  const mockThreeQuarterFraming = {
    framing: 'three_quarter',
    suitabilityScore: 78,
    width: 900,
    height: 1100,
    aspectRatio: 1.22
  };

  const mockCloseUpFraming = {
    framing: 'close_up',
    suitabilityScore: 45,
    width: 800,
    height: 800,
    aspectRatio: 1.0
  };

  await t.test('1. Optimal full-body standing photo achieves genuine verified confidence (>90%) without 88% hardcap', async () => {
    const kanjivaramSaree = {
      id: 1,
      name: 'Kanjivaram Pure Mulberry Silk Saree',
      description: 'Displays temple korvai borders with traditional rudraksha motifs and rich zari pallu.',
      garment_type: 'saree',
      subcategory: 'kanjivaram',
      material: '100% Grade 6A Pure Mulberry Silk & 24K Gold Plated Zari',
      fit: 'Classic 6-yard unstitched handloom drape'
    };

    const assessment = resultQualityService.evaluateResult({
      customerPhotoQuality: mockFullBodyFraming,
      garment: kanjivaramSaree,
      resultImageUrl: 'https://images.unsplash.com/mock-result.jpg',
      isMock: true
    });

    assert.equal(assessment.verificationStatus, 'VERIFIED');
    assert.ok(assessment.overallScore >= 0.94, `Overall score ${assessment.overallScore} must be >= 0.94 for optimal input`);
    assert.notEqual(assessment.overallScore, 0.88, 'Must not be artificially constrained to 88%');
    assert.ok(assessment.sareeValidation, 'Must provide sareeValidation breakdown');
  });

  await t.test('2. Provides 5-pillar validation breakdown with individual scores and descriptions', async () => {
    const banarasiSaree = {
      id: 2,
      name: 'Banarasi Katan Silk Floral Jaal Saree',
      description: 'Rich kadwa floral jaal with continuous zari border and diagonal brocade pallu.',
      garment_type: 'saree',
      subcategory: 'banarasi',
      material: 'Pure Handloom Katan Silk & Antique Gold Zari',
      fit: 'Classic 6-yard drape'
    };

    const assessment = resultQualityService.evaluateResult({
      customerPhotoQuality: mockFullBodyFraming,
      garment: banarasiSaree,
      resultImageUrl: 'https://images.unsplash.com/mock-result.jpg',
      isMock: true
    });

    const sv = assessment.sareeValidation;
    assert.ok(sv, 'sareeValidation must exist');
    assert.ok(sv.palluAccuracy.score >= 0.90, 'Pallu score must be >= 0.90');
    assert.ok(sv.pleatAccuracy.score >= 0.90, 'Pleat score must be >= 0.90');
    assert.ok(sv.borderAccuracy.score >= 0.90, 'Border score must be >= 0.90');
    assert.ok(sv.colorPatternAccuracy.score >= 0.90, 'Color/pattern score must be >= 0.90');
    assert.ok(sv.overallDrapeQuality.score >= 0.90, 'Overall drape quality must be >= 0.90');

    assert.equal(sv.palluAccuracy.status, 'VERIFIED');
    assert.equal(sv.pleatAccuracy.status, 'VERIFIED');
    assert.equal(sv.borderAccuracy.status, 'VERIFIED');
  });

  await t.test('3. Three-quarter customer framing triggers NEEDS_REVIEW and lowers pleat accuracy', async () => {
    const mysoreSaree = {
      id: 17,
      name: 'Mysore Crepe Silk Pure Gold Zari Saree',
      description: 'Contrast zari border with plain rich crepe body.',
      garment_type: 'saree',
      subcategory: 'mysore_crepe',
      material: '100% Pure Silk Crepe'
    };

    const assessment = resultQualityService.evaluateResult({
      customerPhotoQuality: mockThreeQuarterFraming,
      garment: mysoreSaree,
      resultImageUrl: 'https://images.unsplash.com/mock-result.jpg',
      isMock: true
    });

    assert.equal(assessment.verificationStatus, 'NEEDS_REVIEW');
    assert.ok(assessment.flags.includes('THREE_QUARTER_FRAMING'));
    assert.ok(assessment.sareeValidation.pleatAccuracy.score < 0.85, 'Lower pleat score must reflect missing leg reference');
  });

  await t.test('4. Close-up selfie triggers FIDELITY_FLAGGED and severe penalty across all drape pillars', async () => {
    const chanderiSaree = {
      id: 18,
      name: 'Chanderi Pure Silk Zari Saree',
      description: 'Lightweight sheer silk saree with woven border.',
      garment_type: 'saree',
      subcategory: 'chanderi',
      material: 'Chanderi Silk Cotton'
    };

    const assessment = resultQualityService.evaluateResult({
      customerPhotoQuality: mockCloseUpFraming,
      garment: chanderiSaree,
      resultImageUrl: 'https://images.unsplash.com/mock-result.jpg',
      isMock: true
    });

    assert.equal(assessment.verificationStatus, 'FIDELITY_FLAGGED');
    assert.ok(assessment.flags.includes('SELFIE_PROPORTION_RISK'));
    assert.ok(assessment.overallScore < 0.65, 'Close-up selfie must severely reduce confidence (< 0.65)');
    assert.equal(assessment.sareeValidation.pleatAccuracy.status, 'FLAGGED');
    assert.equal(assessment.sareeValidation.palluAccuracy.status, 'FLAGGED');
  });

  await t.test('5. Prompt generator provides comprehensive Nivi drape instructions for sarees', async () => {
    const prompt = garmentPromptGenerator.generatePrompt({
      name: 'Paithani Pure Silk Peacock Border Saree',
      garment_type: 'saree',
      subcategory: 'paithani',
      material: 'Handwoven Mulberry Silk',
      description: 'Traditional broad peacock motif border with diagonal gold tissue pallu.'
    });

    assert.ok(prompt.includes('6-yard Indian handloom saree drape'));
    assert.ok(prompt.includes('waist pleats'));
    assert.ok(prompt.includes('pallu'));
    assert.ok(prompt.includes('border continuity'));
    assert.ok(prompt.length <= 480, 'Prompt must strictly adhere to Genlook 480 char limit');
  });

  await t.test('6. End-to-end try-on execution persists saree validation metrics to database', async () => {
    const session = 'sess_saree_test_' + Date.now();
    const outcome = await executeSingleTryOnJob({
      productId: 17, // Mysore Crepe Saree
      userPhotoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500',
      sessionId: session
    });

    assert.equal(outcome.httpStatus, 201);
    assert.ok(outcome.body.result);
    assert.ok(outcome.body.result.fitScore >= 0.90, `Fit score ${outcome.body.result.fitScore} should be >= 0.90`);
    assert.equal(outcome.body.result.verificationStatus, 'VERIFIED');

    // Verify stored in PostgreSQL tryon_results
    const dbRow = await query('SELECT composite_details, fit_score FROM tryon_results WHERE job_id = (SELECT id FROM tryon_jobs WHERE job_uuid = $1)', [outcome.body.jobId]);
    assert.ok(dbRow.rows.length > 0);
    const raw = dbRow.rows[0].composite_details;
    const details = typeof raw === 'string' ? JSON.parse(raw) : raw;
    assert.ok(details.qualityAssessment.sareeValidation);
    assert.ok(details.qualityAssessment.sareeValidation.palluAccuracy);
    assert.ok(details.qualityAssessment.sareeValidation.pleatAccuracy);
    assert.ok(details.qualityAssessment.sareeValidation.borderAccuracy);
  });
});
