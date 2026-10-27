import os
import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
api_key = os.getenv("ARTCRAFT_API_KEY", "")

endpoints = [
    '/v1/omni_gen/models/image',
    '/v1/omni_api/models',
    '/v1/omni_gen/cost/image',
    '/v1/omni_api/generate/image',
    '/v1/user',
    '/v1/account',
    '/v1/me'
]

host = 'https://api.storyteller.ai'

for ep in endpoints:
    url = host + ep
    headers = {
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0'
    }
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=8) as resp:
            print(f'SUCCESS: {url} -> {resp.status}')
            print('  Data:', resp.read()[:400].decode('utf-8', errors='replace'))
    except urllib.error.HTTPError as e:
        print(f'HTTP ERROR: {url} -> {e.code}')
        print('  Body:', e.read()[:400].decode('utf-8', errors='replace'))
    except Exception as e:
        print(f'ERR: {url} -> {e}')
