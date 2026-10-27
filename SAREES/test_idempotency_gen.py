import os
import urllib.request
import json
import ssl
import uuid

ctx = ssl.create_default_context()
api_key = os.getenv("ARTCRAFT_API_KEY", "")
headers = {
    'Authorization': f'Bearer {api_key}',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Content-Type': 'application/json'
}

payload = {
    "model": "flux_1_schnell",
    "prompt": "An Indian woman draped gracefully in a luxurious crimson Banarasi silk saree with gold zari embroidery",
    "idempotency_token": str(uuid.uuid4()),
    "aspect_ratio": "tall_three_by_four",
    "resolution": None,
    "quality": None,
    "image_batch_count": 1,
    "image_media_tokens": None
}

endpoints = [
    '/v1/omni_api/generate/image',
    '/v1/omni_gen/generate/image'
]

data = json.dumps(payload).encode('utf-8')

for ep in endpoints:
    url = 'https://api.storyteller.ai' + ep
    print(f"\n--- Testing {url} ---")
    req = urllib.request.Request(url, data=data, headers=headers, method='POST')
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=15) as resp:
            print(f"SUCCESS {resp.status}!")
            res_body = resp.read().decode('utf-8')
            print("Response:", res_body)
    except urllib.error.HTTPError as e:
        print(f"HTTP ERROR {e.code}:")
        print("Body:", e.read().decode('utf-8', errors='replace'))
    except Exception as e:
        print("Error:", e)
