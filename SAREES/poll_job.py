import os
import urllib.request
import json
import ssl
import time

ctx = ssl.create_default_context()
api_key = os.getenv("ARTCRAFT_API_KEY", "")
headers = {
    'Authorization': f'Bearer {api_key}',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Content-Type': 'application/json'
}

job_id = "jinf_bt5en9fwgd450b0kf7x9f34n8hc"
url = f"https://api.storyteller.ai/v1/omni_api/job_status/job/{job_id}"

print(f"Polling {url}...")
for attempt in range(15):
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, context=ctx) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            print(f"[{attempt+1}] Response:", json.dumps(data, indent=2))
            # Check if job is completed
            if data.get("is_complete") or data.get("status") in ["completed", "succeeded", "failed"]:
                print("Job finished!")
                break
    except Exception as e:
        print("Polling error:", e)
    time.sleep(2)
