import urllib.request
import re
import ssl

ctx = ssl.create_default_context()
req = urllib.request.Request('https://app.getartcraft.com/', headers={'User-Agent': 'Mozilla/5.0'})
try:
    html = urllib.request.urlopen(req, context=ctx).read().decode('utf-8')
    scripts = re.findall(r'src=["\']([^"\']+\.js)["\']', html)
    print('Found scripts:', scripts)

    for s in scripts:
        s_url = s if s.startswith('http') else 'https://app.getartcraft.com' + (s if s.startswith('/') else '/' + s)
        print('Checking script:', s_url)
        try:
            req_js = urllib.request.Request(s_url, headers={'User-Agent': 'Mozilla/5.0'})
            js = urllib.request.urlopen(req_js, context=ctx).read().decode('utf-8')
            
            domains = set(re.findall(r'https?://[a-zA-Z0-9_\-\.]*(?:artcraft|storytell|api)[a-zA-Z0-9_\-\.]*', js, re.I))
            print('Found domain matches:', domains)
            
            omni = set(re.findall(r'/[a-zA-Z0-9_\-\.]*omni[a-zA-Z0-9_\-\./]*', js))
            print('Found omni paths:', list(omni)[:15])

            # Look for api endpoints
            endpoints = set(re.findall(r'["\'](/v1/[^"\']+)["\']', js))
            print('Found /v1/ endpoints:', list(endpoints)[:15])
            
        except Exception as e:
            print('Error fetching script:', e)

except Exception as e:
    print('Error loading html:', e)
