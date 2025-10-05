# Levantar Redis

docker-compose -f docker-compose.redis.yml --env-file .env.redis up -d

# Ver logs

docker-compose -f docker-compose.redis.yml logs -f redis

# Detener

docker-compose -f docker-compose.redis.yml down

# Detener y eliminar volúmenes (borra datos)

docker-compose -f docker-compose.redis.yml down -v

# Reiniciar

docker-compose -f docker-compose.redis.yml restart

# Conectar a Redis desde terminal

docker exec -it nestjs_redis_cache redis-cli -a your_redis_password_here

# Verificar conexión Redis

docker exec -it nestjs_redis_cache redis-cli -a your_redis_password_here ping
