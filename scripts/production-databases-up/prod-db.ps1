# Script de gestión de bases de datos para desarrollo
# Uso: .\prod-db-ps1 [comando]

param(
    [Parameter(Position=0)]
    [ValidateSet('start', 'stop', 'restart', 'status', 'logs', 'clean', 'psql', 'redis', 'help')]
    [string]$Command = 'help',

    [Parameter(Position=1)]
    [string]$Service = 'all'
)

# Archivos de configuración
$POSTGRES_COMPOSE = "docker-compose.postgres.yml"
$REDIS_COMPOSE = "docker-compose.redis.yml"
$ENV_FILE = ".env"

# Función para verificar si Docker está corriendo
function Test-Docker {
    try {
        docker info | Out-Null
        return $true
    }
    catch {
        Write-Host "❌ Error: Docker no está corriendo" -ForegroundColor Red
        Write-Host "Por favor, inicia Docker Desktop" -ForegroundColor Yellow
        exit 1
    }
}

# Función para verificar archivos necesarios
function Test-Files {
    $missingFiles = @()

    if (-not (Test-Path $POSTGRES_COMPOSE)) { $missingFiles += $POSTGRES_COMPOSE }
    if (-not (Test-Path $REDIS_COMPOSE)) { $missingFiles += $REDIS_COMPOSE }
    if (-not (Test-Path $ENV_FILE)) { $missingFiles += $ENV_FILE }

    if ($missingFiles.Count -gt 0) {
        Write-Host "❌ Error: Archivos faltantes:" -ForegroundColor Red
        $missingFiles | ForEach-Object { Write-Host "   - $_" }
        exit 1
    }
}

# Función para levantar los servicios
function Start-Services {
    Write-Host "🚀 Iniciando bases de datos de desarrollo...`n" -ForegroundColor Blue

    Write-Host "📦 Levantando PostgreSQL..." -ForegroundColor Yellow
    docker-compose -f $POSTGRES_COMPOSE up -d

    Write-Host "`n📦 Levantando Redis..." -ForegroundColor Yellow
    docker-compose -f $REDIS_COMPOSE up -d

    Write-Host "`n✅ Bases de datos iniciadas correctamente" -ForegroundColor Green
    Write-Host "ℹ️  Ejecuta '.\prod-db-ps1 status' para ver el estado" -ForegroundColor Blue
}

# Función para detener los servicios
function Stop-Services {
    Write-Host "🛑 Deteniendo bases de datos...`n" -ForegroundColor Yellow

    docker-compose -f $POSTGRES_COMPOSE down
    docker-compose -f $REDIS_COMPOSE down

    Write-Host "`n✅ Bases de datos detenidas" -ForegroundColor Green
}

# Función para reiniciar los servicios
function Restart-Services {
    Write-Host "🔄 Reiniciando bases de datos...`n" -ForegroundColor Yellow
    Stop-Services
    Write-Host ""
    Start-Services
}

# Función para ver logs
function Show-Logs {
    param([string]$ServiceName)

    switch ($ServiceName) {
        'postgres' {
            Write-Host "📋 Logs de PostgreSQL:`n" -ForegroundColor Blue
            docker-compose -f $POSTGRES_COMPOSE logs -f postgres
        }
        'redis' {
            Write-Host "📋 Logs de Redis:`n" -ForegroundColor Blue
            docker-compose -f $REDIS_COMPOSE logs -f redis
        }
        default {
            Write-Host "📋 Logs de todos los servicios:`n" -ForegroundColor Blue
            Start-Job -ScriptBlock { docker-compose -f $using:POSTGRES_COMPOSE logs -f }
            docker-compose -f $REDIS_COMPOSE logs -f
        }
    }
}

# Función para ver el estado
function Show-Status {
    Write-Host "📊 Estado de los contenedores:`n" -ForegroundColor Blue
    docker ps --filter "name=nestjs_" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

    Write-Host "`n💾 Volúmenes:" -ForegroundColor Blue
    docker volume ls | Select-String -Pattern "postgres|redis"

    Write-Host "`n🔌 Verificando conectividad..." -ForegroundColor Blue

    # PostgreSQL
    try {
        docker exec nestjs_postgres_db pg_isready -U postgres 2>$null | Out-Null
        Write-Host "✓ PostgreSQL: Conectado" -ForegroundColor Green
    }
    catch {
        Write-Host "✗ PostgreSQL: No disponible" -ForegroundColor Red
    }

    # Redis
    try {
        docker exec nestjs_redis_cache redis-cli ping 2>$null | Out-Null
        Write-Host "✓ Redis: Conectado" -ForegroundColor Green
    }
    catch {
        Write-Host "✗ Redis: No disponible" -ForegroundColor Red
    }
}

# Función para limpiar todo
function Remove-All {
    Write-Host "⚠️  ADVERTENCIA: Esto eliminará todos los datos" -ForegroundColor Red
    $response = Read-Host "¿Estás seguro? (y/N)"

    if ($response -eq 'y' -or $response -eq 'Y') {
        Write-Host "🧹 Limpiando contenedores y volúmenes...`n" -ForegroundColor Yellow
        docker-compose -f $POSTGRES_COMPOSE down -v
        docker-compose -f $REDIS_COMPOSE down -v
        Write-Host "`n✅ Limpieza completada" -ForegroundColor Green
    }
    else {
        Write-Host "Operación cancelada" -ForegroundColor Blue
    }
}

# Función para conectar a PostgreSQL
function Connect-Postgres {
    Write-Host "🐘 Conectando a PostgreSQL..." -ForegroundColor Blue
    docker exec -it nestjs_postgres_db psql -U postgres -d nestjs_db
}

# Función para conectar a Redis
function Connect-Redis {
    Write-Host "🔴 Conectando a Redis..." -ForegroundColor Blue
    $password = (Get-Content $ENV_FILE | Select-String "REDIS_PASSWORD").ToString().Split('=')[1]
    if ($password) {
        docker exec -it nestjs_redis_cache redis-cli -a $password
    }
    else {
        docker exec -it nestjs_redis_cache redis-cli
    }
}

# Menú de ayuda
function Show-Help {
    Write-Host "📚 Script de gestión de bases de datos para desarrollo`n" -ForegroundColor Blue
    Write-Host "Uso: .\prod-db-ps1 [comando]`n"
    Write-Host "Comandos disponibles:"
    Write-Host "  start          - Inicia PostgreSQL y Redis"
    Write-Host "  stop           - Detiene los servicios"
    Write-Host "  restart        - Reinicia los servicios"
    Write-Host "  status         - Muestra el estado de los servicios"
    Write-Host "  logs [servicio]- Muestra los logs (postgres|redis|all)"
    Write-Host "  clean          - Elimina contenedores y volúmenes (⚠️  borra datos)"
    Write-Host "  psql           - Conecta a PostgreSQL CLI"
    Write-Host "  redis          - Conecta a Redis CLI"
    Write-Host "  help           - Muestra esta ayuda"
    Write-Host "`nEjemplos:"
    Write-Host "  .\prod-db-ps1 start"
    Write-Host "  .\prod-db-ps1 logs postgres"
    Write-Host "  .\prod-db-ps1 status"
}

# Main
Test-Docker
Test-Files

switch ($Command) {
    'start'   { Start-Services }
    'stop'    { Stop-Services }
    'restart' { Restart-Services }
    'status'  { Show-Status }
    'logs'    { Show-Logs -ServiceName $Service }
    'clean'   { Remove-All }
    'psql'    { Connect-Postgres }
    'redis'   { Connect-Redis }
    default   { Show-Help }
}
