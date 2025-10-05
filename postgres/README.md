# Levantar PostgreSQL

docker-compose -f docker-compose.postgres.yml --env-file .env.postgres up -d

# Ver logs

docker-compose -f docker-compose.postgres.yml logs -f postgres

# Detener

docker-compose -f docker-compose.postgres.yml down

# Detener y eliminar volúmenes (borra datos)

docker-compose -f docker-compose.postgres.yml down -v

# Reiniciar

docker-compose -f docker-compose.postgres.yml restart

# Conectar a PostgreSQL desde terminal

docker exec -it nestjs_postgres_db psql -U postgres -d nestjs_db
