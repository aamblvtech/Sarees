import urllib.request
import re
import ssl

ctx = ssl.create_default_context()
req = urllib.request.Request('https://app.getartcraft.com/assets/index-BCS8QQFg.js', headers={'User-Agent': 'Mozilla/5.0'})
js = urllib.request.urlopen(req, context=ctx).read().decode('utf-8')

# Search for idempotency
matches = re.findall(r'.{0,50}idempotency.{0,100}', js, re.I)
print(f"Found {len(matches)} idempotency occurrences:")
for m in matches[:10]:
    print("---", m)
