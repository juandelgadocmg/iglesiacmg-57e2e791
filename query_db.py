import urllib.request
import json
import os
from dotenv import load_dotenv

load_dotenv('.env')
url = os.environ.get('VITE_SUPABASE_URL')
key = os.environ.get('VITE_SUPABASE_ANON_KEY')
service_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY', key)

req = urllib.request.Request(f"{url}/rest/v1/rpc/get_cron_errors", method="POST")
req.add_header("apikey", service_key)
req.add_header("Authorization", f"Bearer {service_key}")

try:
    with urllib.request.urlopen(req) as response:
        print(response.read().decode())
except Exception as e:
    print(e)
