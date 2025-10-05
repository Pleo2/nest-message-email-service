import { DataSource } from 'typeorm'
import * as dotenv from 'dotenv'

// Cargar variables de entorno
dotenv.config()

export const AppDataSource = new DataSource({
	// Configuración de conexión
	type: 'postgres',
	host: process.env.DB_HOST ?? 'localhost',
	port: Number.parseInt(process.env.DB_PORT ?? '5432', 10),
	username: process.env.DB_USERNAME ?? 'postgres',
	password: process.env.DB_PASSWORD ?? 'postgres',
	database: process.env.DB_NAME ?? 'otp_service',

	// Rutas de entities (para leer la estructura)
	entities: ['src/**/*.entity.ts'],

	// Rutas de migraciones (dónde se guardan)
	migrations: ['src/migrations/*.ts'],

	// IMPORTANTE: En producción SIEMPRE false
	synchronize: false,

	// Logging para ver qué hace
	logging: true,
})
