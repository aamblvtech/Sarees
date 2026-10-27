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

# 1. Fetch available image models
url = 'https://api.storyteller.ai/v1/omni_gen/models/image'
req = urllib.request.Request(url, headers=headers)
try:
    with urllib.request.urlopen(req, context=ctx) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        print("MODELS AVAILABLE:")
        for m in data.get('models', []):
            print(f"- {m.get('model')} ({m.get('full_name')} by {m.get('model_creator')})")
            print(f"  Aspect ratios: {m.get('aspect_ratio_options')}")
except Exception as e:
    print("Error fetching models:", e)
