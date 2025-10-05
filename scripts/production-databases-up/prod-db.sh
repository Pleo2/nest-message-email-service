#!/bin/bash

# Colores para mensajes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Archivos de configuración
POSTGRES_COMPOSE="docker-compose.postgres.yml"
REDIS_COMPOSE="docker-compose.redis.yml"
ENV_FILE=".env"

# Función para verificar si Docker está corriendo
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        echo -e "${RED}❌ Error: Docker no está corriendo${NC}"
        echo -e "${YELLOW}Por favor, inicia Docker Desktop o Docker daemon${NC}"
        exit 1
    fi
}

# Función para verificar archivos necesarios
check_files() {
    local missing_files=()

    if [ ! -f "$POSTGRES_COMPOSE" ]; then
        missing_files+=("$POSTGRES_COMPOSE")
    fi

    if [ ! -f "$REDIS_COMPOSE" ]; then
        missing_files+=("$REDIS_COMPOSE")
    fi

    if [ ! -f "$ENV_FILE" ]; then
        missing_files+=("$ENV_FILE")
    fi

    if [ ${#missing_files[@]} -ne 0 ]; then
        echo -e "${RED}❌ Error: Archivos faltantes:${NC}"
        for file in "${missing_files[@]}"; do
            echo -e "   - $file"
        done
        exit 1
    fi
}

# Función para levantar los servicios
start() {
    echo -e "${BLUE}🚀 Iniciando bases de datos de desarrollo...${NC}\n"

    echo -e "${YELLOW}📦 Levantando PostgreSQL...${NC}"
    docker-compose -f "$POSTGRES_COMPOSE" up -d

    echo -e "\n${YELLOW}📦 Levantando Redis...${NC}"
    docker-compose -f "$REDIS_COMPOSE" up -d

    echo -e "\n${GREEN}✅ Bases de datos iniciadas correctamente${NC}"
    echo -e "${BLUE}ℹ️  Ejecuta './prod-db.sh status' para ver el estado${NC}"
}

# Función para detener los servicios
stop() {
    echo -e "${YELLOW}🛑 Deteniendo bases de datos...${NC}\n"

    docker-compose -f "$POSTGRES_COMPOSE" down
    docker-compose -f "$REDIS_COMPOSE" down

    echo -e "\n${GREEN}✅ Bases de datos detenidas${NC}"
}

# Función para reiniciar los servicios
restart() {
    echo -e "${YELLOW}🔄 Reiniciando bases de datos...${NC}\n"
    stop
    echo ""
    start
}

# Función para ver logs
logs() {
    local service=$1

    if [ "$service" == "postgres" ]; then
        echo -e "${BLUE}📋 Logs de PostgreSQL:${NC}\n"
        docker-compose -f "$POSTGRES_COMPOSE" logs -f postgres
    elif [ "$service" == "redis" ]; then
        echo -e "${BLUE}📋 Logs de Redis:${NC}\n"
        docker-compose -f "$REDIS_COMPOSE" logs -f redis
    else
        echo -e "${BLUE}📋 Logs de todos los servicios:${NC}\n"
        docker-compose -f "$POSTGRES_COMPOSE" logs -f &
        docker-compose -f "$REDIS_COMPOSE" logs -f
    fi
}

# Función para ver el estado
status() {
    echo -e "${BLUE}📊 Estado de los contenedores:${NC}\n"
    docker ps --filter "name=nestjs_" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

    echo -e "\n${BLUE}💾 Volúmenes:${NC}"
    docker volume ls | grep -E "postgres|redis"

    # Verificar conectividad
    echo -e "\n${BLUE}🔌 Verificando conectividad...${NC}"

    # PostgreSQL
    if docker exec nestjs_postgres_db pg_isready -U postgres > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PostgreSQL: Conectado${NC}"
    else
        echo -e "${RED}✗ PostgreSQL: No disponible${NC}"
    fi

    # Redis
    if docker exec nestjs_redis_cache redis-cli ping > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Redis: Conectado${NC}"
    else
        echo -e "${RED}✗ Redis: No disponible${NC}"
    fi
}

# Función para limpiar todo (incluyendo volúmenes)
clean() {
    echo -e "${RED}⚠️  ADVERTENCIA: Esto eliminará todos los datos${NC}"
    read -p "¿Estás seguro? (y/N): " -n 1 -r
    echo

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}🧹 Limpiando contenedores y volúmenes...${NC}\n"
        docker-compose -f "$POSTGRES_COMPOSE" down -v
        docker-compose -f "$REDIS_COMPOSE" down -v
        echo -e "\n${GREEN}✅ Limpieza completada${NC}"
    else
        echo -e "${BLUE}Operación cancelada${NC}"
    fi
}

# Función para conectar a PostgreSQL
psql() {
    echo -e "${BLUE}🐘 Conectando a PostgreSQL...${NC}"
    docker exec -it nestjs_postgres_db psql -U postgres -d nestjs_db
}

# Función para conectar a Redis
redis_cli() {
    echo -e "${BLUE}🔴 Conectando a Redis...${NC}"
    local password=$(grep REDIS_PASSWORD "$ENV_FILE" | cut -d '=' -f2)
    if [ -n "$password" ]; then
        docker exec -it nestjs_redis_cache redis-cli -a "$password"
    else
        docker exec -it nestjs_redis_cache redis-cli
    fi
}

# Menú de ayuda
help() {
    echo -e "${BLUE}📚 Script de gestión de bases de datos para desarrollo${NC}\n"
    echo "Uso: ./prod-db.sh [comando]"
    echo ""
    echo "Comandos disponibles:"
    echo "  start          - Inicia PostgreSQL y Redis"
    echo "  stop           - Detiene los servicios"
    echo "  restart        - Reinicia los servicios"
    echo "  status         - Muestra el estado de los servicios"
    echo "  logs [servicio]- Muestra los logs (postgres|redis|all)"
    echo "  clean          - Elimina contenedores y volúmenes (⚠️  borra datos)"
    echo "  psql           - Conecta a PostgreSQL CLI"
    echo "  redis          - Conecta a Redis CLI"
    echo "  help           - Muestra esta ayuda"
    echo ""
    echo "Ejemplos:"
    echo "  ./prod-db.sh start"
    echo "  ./prod-db.sh logs postgres"
    echo "  ./prod-db.sh status"
}

# Main
main() {
    check_docker
    check_files

    case "${1:-help}" in
        start)
            start
            ;;
        stop)
            stop
            ;;
        restart)
            restart
            ;;
        status)
            status
            ;;
        logs)
            logs "${2:-all}"
            ;;
        clean)
            clean
            ;;
        psql)
            psql
            ;;
        redis)
            redis_cli
            ;;
        help|*)
            help
            ;;
    esac
}

main "$@"
