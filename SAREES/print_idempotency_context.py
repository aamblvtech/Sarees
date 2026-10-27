import urllib.request
import re
import ssl

ctx = ssl.create_default_context()
req = urllib.request.Request('https://app.getartcraft.com/assets/index-BCS8QQFg.js', headers={'User-Agent': 'Mozilla/5.0'})
js = urllib.request.urlopen(req, context=ctx).read().decode('utf-8')

for match in re.finditer(r'idempotency_token', js):
    start = max(0, match.start() - 250)
    end = min(len(js), match.end() + 250)
    print("--------------------------------------------------")
    print(js[start:end])
