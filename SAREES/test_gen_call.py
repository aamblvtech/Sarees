import os
import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
api_key = os.getenv("ARTCRAFT_API_KEY", "")
headers = {
    'Authorization': f'Bearer {api_key}',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Content-Type': 'application/json'
}

endpoints = [
    '/v1/omni_api/generate/image',
    '/v1/omni_gen/generate/image',
    '/v1/omni_gen/cost/image'
]

payload = {
    "model": "flux_1_schnell",
    "prompt": "A beautiful Indian woman wearing a red silk saree",
    "aspect_ratio": "tall_three_by_four",
    "batch_size": 1
}

data = json.dumps(payload).encode('utf-8')

for ep in endpoints:
    url = 'https://api.storyteller.ai' + ep
    req = urllib.request.Request(url, data=data, headers=headers, method='POST')
    try:
        with urllib.request.urlopen(req, context=ctx) as resp:
            print(f"SUCCESS: {url} -> {resp.status}")
            print("  Body:", resp.read().decode('utf-8', errors='replace'))
    except urllib.error.HTTPError as e:
        print(f"HTTP ERROR: {url} -> {e.code}")
        print("  Error Body:", e.read().decode('utf-8', errors='replace'))
    except Exception as e:
        print(f"ERR: {url} -> {e}")
