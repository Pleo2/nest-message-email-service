# Guardar API Key

export API_KEY="tu-api-key-del-env"

# Ver estadísticas ✅

curl http://localhost:3000/api/otp/stats \
 -H "X-API-Key: $API_KEY"

# Cleanup manual ✅

curl -X POST http://localhost:3000/api/otp/cleanup \
 -H "X-API-Key: $API_KEY"

# Sync Redis ✅

curl -X POST http://localhost:3000/api/otp/sync-redis \
 -H "X-API-Key: $API_KEY"

# Ver cron status ✅

curl http://localhost:3000/api/otp/cron/status \
 -H "X-API-Key: $API_KEY"

# Alternativa: Bearer token

curl http://localhost:3000/api/otp/stats \
 -H "Authorization: Bearer $API_KEY"
