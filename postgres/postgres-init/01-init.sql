-- Script de inicialización para PostgreSQL
-- Se ejecuta automáticamente al crear el contenedor por primera vez

-- Crear extensiones útiles
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Crear esquemas adicionales si es necesario
-- CREATE SCHEMA IF NOT EXISTS app_schema;

-- Crear usuario adicional para la aplicación (opcional)
-- CREATE USER app_user WITH PASSWORD 'app_password';
-- GRANT ALL PRIVILEGES ON DATABASE nestjs_db TO app_user;

-- Logging
\echo 'Database initialized successfully'
