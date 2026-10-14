import urllib.request
import json
import os
from dotenv import load_dotenv

load_dotenv('.env')
url = os.environ.get('VITE_SUPABASE_URL')
key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')

req = urllib.request.Request(f"{url}/rest/v1/buckets?select=*", method="GET")
req.add_header("apikey", key)
req.add_header("Authorization", f"Bearer {key}")

try:
    with urllib.request.urlopen(req) as response:
        print(response.read().decode())
except Exception as e:
    print(e)
