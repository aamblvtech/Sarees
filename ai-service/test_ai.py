"""
Tests for SAJEE AI Service:
- Provider import checks
- Mock provider output and simulation flags
- IDM-VTON availability and failure honesty
- Replicate cloud provider availability and validation
"""
import unittest
import os
import sys

# Ensure local path is importable
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from adapters import (
    MockTryOnProvider,
    IDMVTONProvider,
    ReplicateTryOnProvider,
    TryOnRequest
)

class TestAIService(unittest.TestCase):
    def test_mock_provider_returns_simulation_flag(self):
        provider = MockTryOnProvider()
        self.assertTrue(provider.is_available())
        
        req = TryOnRequest(
            job_id="test-job-001",
            person_image_path="non_existent.jpg",
            garment_image_path="non_existent_garment.jpg",
            garment_metadata={"name": "Kanjeevaram Silk", "sku": "SAJEE-TEST-01", "color": "Maroon"}
        )
        result = provider.process_tryon(req)
        self.assertEqual(result.metadata.get("mode"), "simulation")
        self.assertIn("simulate", result.metadata.get("disclaimer", "").lower())
        self.assertIsNotNone(result.result_image_url)

    def test_idm_vton_honest_availability(self):
        provider = IDMVTONProvider(checkpoint_dir="./invalid_nonexistent_checkpoints")
        health = provider.get_health_status()
        self.assertIn("provider", health)
        self.assertFalse(provider.is_available(), "Without GPU and checkpoints, IDM-VTON must honestly report is_available=False")
        
        req = TryOnRequest(
            job_id="test-job-002",
            person_image_path="test.jpg",
            garment_image_path="test_saree.jpg"
        )
        result = provider.process_tryon(req)
        self.assertEqual(result.status, "model_unavailable")
        self.assertFalse(result.is_simulation)
        err = result.error_message.lower()
        self.assertTrue("cuda" in err or "gpu" in err or "checkpoint" in err or "torch" in err or "dependencies" in err)

    def test_replicate_provider_missing_token_honesty(self):
        provider = ReplicateTryOnProvider(api_token="")
        self.assertFalse(provider.is_available())
        health = provider.get_health_status()
        self.assertFalse(health["available"])
        self.assertIn("REPLICATE_API_TOKEN", health["message"])

        req = TryOnRequest(
            job_id="test-job-003",
            person_image_path="test_person.jpg",
            garment_image_path="test_saree.jpg"
        )
        result = provider.process_tryon(req)
        self.assertEqual(result.status, "model_unavailable")
        self.assertFalse(result.is_simulation)
        self.assertIn("replicate_api_token", result.error_message.lower())

    def test_replicate_provider_configured_model(self):
        # Offline test: verifies token recognition and model schema mapping without calling Replicate API
        provider = ReplicateTryOnProvider(api_token="test_offline_token_abcdef12345")
        self.assertTrue(provider.is_available())
        health = provider.get_health_status()
        self.assertEqual(health["model"], "cuuupid/idm-vton")
        self.assertTrue(health["available"])
        self.assertTrue(health["token_configured"])
        self.assertEqual(provider.version_id, "0513734a452173b8173e907e3a59d19a36266e55b48528559432bd21c7d7e985")
        self.assertIn("/v1/predictions", provider.model_endpoint)

    def test_replicate_provider_credit_required_honesty(self):
        from unittest.mock import patch, MagicMock
        provider = ReplicateTryOnProvider(api_token="r8_mock_token_for_offline_test")
        
        # Mock requests.post to return HTTP 402 Insufficient credit
        mock_resp = MagicMock()
        mock_resp.status_code = 402
        mock_resp.json.return_value = {"detail": "Insufficient credit"}
        mock_resp.text = "Insufficient credit"

        with patch("requests.post", return_value=mock_resp), \
             patch.object(provider, "_file_to_data_uri", return_value="data:image/jpeg;base64,abc123"):
            req = TryOnRequest(
                job_id="test-job-402",
                person_image_path="test_person.jpg",
                garment_image_path="test_saree.jpg"
            )
            result = provider.process_tryon(req)
            self.assertEqual(result.status, "failed")
            self.assertFalse(result.is_simulation, "Must NOT claim to be a simulation when real inference fails")
            self.assertIn("compute credits", result.error_message)
            self.assertIn("https://replicate.com/account/billing#billing", result.error_message)


if __name__ == "__main__":
    unittest.main()
