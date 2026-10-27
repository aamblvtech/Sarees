import os
import urllib.request
import json
import ssl
import uuid
import time
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
OUTPUTS_DIR = BASE_DIR / "outputs"
OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)

API_KEY = os.getenv("ARTCRAFT_API_KEY", "")
ctx = ssl.create_default_context()

sarees_to_gen = [
    {
        "id": 1,
        "name": "Traditional Crimson Silk Saree",
        "filename": "artcraft_saree_1.jpg",
        "prompt": "Full body portrait of a graceful Indian woman standing outdoors in a garden, wearing an exquisite traditional Crimson Banarasi silk saree with intricate gold floral zari embroidery, matching red short-sleeved blouse, gold choker necklace, realistic drape, rich silk folds, natural ambient sunlight, 8k fashion photography"
    },
    {
        "id": 2,
        "name": "Peacock Royal Blue Saree",
        "filename": "artcraft_saree_2.jpg",
        "prompt": "Full body portrait of a graceful Indian woman standing outdoors in a garden, wearing an authentic Peacock Royal Blue chiffon georgette saree with glistening ornate silver and gold zari border, matching royal blue blouse, gold temple jewelry, realistic drape, elegant pleats, natural ambient daylight, 8k fashion photography"
    },
    {
        "id": 3,
        "name": "Heritage Emerald Silk Saree",
        "filename": "artcraft_saree_3.jpg",
        "prompt": "Full body portrait of a graceful Indian woman standing outdoors in a garden, wearing a luxurious Heritage Emerald Green Kanchipuram silk saree with majestic golden temple zari pallu, matching green silk blouse, elegant gold necklace, photorealistic fabric drape, natural garden ambient lighting, 8k cinematic fashion"
    }
]

headers = {
    'Authorization': f'Bearer {API_KEY}',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Content-Type': 'application/json'
}

def generate_one(item):
    print(f"\n==========================================")
    print(f"Generating Saree {item['id']}: {item['name']}")
    print(f"==========================================")
    
    payload = {
        "model": "flux_1_schnell",
        "prompt": item["prompt"],
        "idempotency_token": str(uuid.uuid4()),
        "aspect_ratio": "tall_three_by_four",
        "resolution": None,
        "quality": None,
        "image_batch_count": 1,
        "image_media_tokens": None
    }
    
    url = "https://api.storyteller.ai/v1/omni_api/generate/image"
    req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers=headers, method='POST')
    
    with urllib.request.urlopen(req, context=ctx, timeout=20) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        
    job_token = data.get("inference_job_token")
    print(f"Job Token: {job_token}")
    if not job_token:
        print("Failed to get job token:", data)
        return False
        
    poll_url = f"https://api.storyteller.ai/v1/omni_api/job_status/job/{job_token}"
    for attempt in range(25):
        time.sleep(2)
        p_req = urllib.request.Request(poll_url, headers=headers)
        with urllib.request.urlopen(p_req, context=ctx, timeout=10) as p_resp:
            p_data = json.loads(p_resp.read().decode('utf-8'))
            state = p_data.get("state", {})
            status = state.get("status", {}).get("status")
            print(f"  Attempt {attempt+1}: status = {status}")
            
            if status == "complete_success":
                cdn_url = state.get("maybe_result", {}).get("media_links", {}).get("cdn_url")
                print(f"  CDN URL: {cdn_url}")
                if cdn_url:
                    out_path = OUTPUTS_DIR / item["filename"]
                    d_req = urllib.request.Request(cdn_url, headers={'User-Agent': 'Mozilla/5.0'})
                    with urllib.request.urlopen(d_req, context=ctx, timeout=20) as d_resp:
                        out_path.write_bytes(d_resp.read())
                    print(f"  SUCCESS! Saved {out_path.name} ({out_path.stat().st_size} bytes)")
                    return True
            elif status in ["failed", "error"]:
                print("  Generation failed:", p_data)
                return False
                
    return False

if __name__ == "__main__":
    for s in sarees_to_gen:
        generate_one(s)
    print("\nAll ArtCraft generations complete!")
