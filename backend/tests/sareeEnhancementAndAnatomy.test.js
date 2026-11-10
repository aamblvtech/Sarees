import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { imageEnhancementService, AFFECTED_SAREE_IDS } from '../src/services/imageEnhancementService.js';
import imageValidationService from '../src/services/imageValidationService.js';
import { resultQualityService } from '../src/services/resultQualityService.js';
import { garmentPromptGenerator } from '../src/services/garmentPromptGenerator.js';

test('Saree Enhancement (Option B) and Anatomical Integrity Suite', async (t) => {
  await t.test('1. Inspect 18 low-resolution sarees catalog targets (IDs 46, 48-64)', async () => {
    assert.equal(AFFECTED_SAREE_IDS.length, 18, 'Must track exactly 18 low-resolution sarees');
    assert.ok(AFFECTED_SAREE_IDS.includes(46));
    assert.ok(!AFFECTED_SAREE_IDS.includes(47), 'Saree 47 is Option A high-res studio asset');
    assert.ok(AFFECTED_SAREE_IDS.includes(48));
    assert.ok(AFFECTED_SAREE_IDS.includes(64));
  });

  await t.test('2. Verify all 18 enhanced saree files exist on disk and meet >=250x250px requirement', async () => {
    const uploadDir = path.join(__dirname, '..', 'uploads', 'catalogue_sarees');
    assert.ok(fs.existsSync(uploadDir));

    for (const id of AFFECTED_SAREE_IDS) {
      const files = fs.readdirSync(uploadDir);
      const enhancedFile = files.find((f) => f.startsWith(`saree_${id}_`) && f.endsWith('_enhanced.jpg'));
      assert.ok(enhancedFile, `Enhanced file for saree #${id} must exist in uploads/catalogue_sarees`);

      const buf = fs.readFileSync(path.join(uploadDir, enhancedFile));
      const dims = imageValidationService.parseImageDimensions(buf);
      assert.ok(dims, `Must be readable JPEG for saree #${id}`);
      assert.ok(dims.width >= 250, `Enhanced width of saree #${id} (${dims.width}px) must be >= 250px`);
      assert.ok(dims.height >= 250, `Enhanced height of saree #${id} (${dims.height}px) must be >= 250px`);
    }
  });

  await t.test('3. Pose geometry validation detects crossed arms and occluded limbs', async () => {
    // Generate valid JPEG dummy buffer (1000x1500px, 3:2 portrait ratio)
    const dummyBuffer = Buffer.from([
      0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00,
      0xFF, 0xC0, 0x00, 0x11, 0x08, 0x05, 0xDC, 0x03, 0xE8, 0x03, 0x01, 0x22, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
      0xFF, 0xD9
    ]);

    // Normal standing pose with arms separated
    const normalPose = imageValidationService.inspectCustomerPhoto(dummyBuffer, 'customer_standing_normal.jpg');
    assert.equal(normalPose.anatomicalDefectRisk, 'LOW');
    assert.equal(normalPose.poseStatus, 'POSE_NATURAL_ARMS_SEPARATED');

    // Crossed arms posture (known root cause for 3 hands)
    const crossedPose = imageValidationService.inspectCustomerPhoto(dummyBuffer, 'customer_arms_crossed.jpg');
    assert.equal(crossedPose.anatomicalDefectRisk, 'HIGH');
    assert.equal(crossedPose.poseStatus, 'POSE_CROSSED_ARMS_RISK');
    assert.ok(crossedPose.warnings.some((w) => w.includes('Crossed or folded arms')));
  });

  await t.test('4. Garment prompt generator embeds strict anatomical fidelity safeguards', async () => {
    const prompt = garmentPromptGenerator.generatePrompt({
      garment_type: 'saree',
      name: 'Kanjeevaram Silk Saree',
      material: 'Pure Mulberry Silk',
      color: 'Crimson'
    });
    assert.ok(
      prompt.includes('exactly two natural hands') || prompt.includes('natural arm contour without extra limbs'),
      'Prompt must mandate anatomical limb integrity'
    );
  });

  await t.test('5. Result quality verifier checks anatomical limb plausibility and flags defect risk', async () => {
    const framingAssessment = {
      framing: 'full_body',
      anatomicalDefectRisk: 'HIGH',
      poseStatus: 'POSE_CROSSED_ARMS_RISK'
    };

    const resultCheck = resultQualityService.evaluateSareeDraping({
      resultImageUrl: 'https://example.com/result.jpg',
      garment: { id: 41, garmentType: 'saree', name: 'Banarasi Saree' },
      framingAssessment
    });

    assert.ok(resultCheck.anatomicalValidation);
    assert.equal(resultCheck.anatomicalValidation.defectRisk, 'HIGH');
    assert.equal(resultCheck.anatomicalValidation.plausibility, 'FLAGGED_ANATOMICAL_DEFECT');
    assert.ok(resultCheck.anatomicalValidation.summary.includes('crossed arms across torso'));
  });
});
