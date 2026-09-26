#!/bin/bash
URL="https://bxqichxpvnlofqsjdcdg.supabase.co/rest/v1"
KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4cWljaHhwdm5sb2Zxc2pkY2RnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MTk2MTAsImV4cCI6MjA4ODM5NTYxMH0.KfEN9kYdW9BDICNYSTdkBB0WaFnXE45HfSDZL8oL_vU"

echo "=== VISITAS ==="
curl -s "$URL/discipulo_visitas?select=id,discipulo_id,lider_id&limit=5" -H "apikey: $KEY" -H "Authorization: Bearer $KEY"

echo ""
echo "=== LLAMADAS ==="
curl -s "$URL/discipulo_actividades?select=id,discipulo_id,lider_id&limit=5" -H "apikey: $KEY" -H "Authorization: Bearer $KEY"

