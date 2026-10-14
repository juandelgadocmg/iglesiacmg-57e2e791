#!/bin/bash
URL="https://bxqichxpvnlofqsjdcdg.supabase.co/rest/v1"
KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4cWljaHhwdm5sb2Zxc2pkY2RnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MTk2MTAsImV4cCI6MjA4ODM5NTYxMH0.KfEN9kYdW9BDICNYSTdkBB0WaFnXE45HfSDZL8oL_vU"

echo "=== DISCIPULOS ==="
curl -s "$URL/discipulos?select=id,full_name,casa_de_paz_id&limit=1" -H "apikey: $KEY" -H "Authorization: Bearer $KEY"
echo -e "\n=== LEADERS ==="
curl -s "$URL/leaders?select=id,full_name,casa_de_paz_id,red_id&limit=1" -H "apikey: $KEY" -H "Authorization: Bearer $KEY"
