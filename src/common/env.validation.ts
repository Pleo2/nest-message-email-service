import { plainToClass } from 'class-transformer'
import {
	IsBoolean,
	IsEnum,
	IsNumber,
	IsOptional,
	IsString,
	validateSync,
} from 'class-validator'

export enum Environment {
	Development = 'development',
	Production = 'production',
	Test = 'test',
}

export enum LoggerLevel {
	Log = 'log',
	Error = 'error',
	Warn = 'warn',
	Debug = 'debug',
	Verbose = 'verbose',
	Fatal = 'fatal',
}

export class EnvironmentVariables {
	@IsEnum(Environment)
	NODE_ENV: Environment = Environment.Development

	@IsNumber()
	PORT = 3000

	@IsEnum(LoggerLevel)
	LOGGER_LEVEL: LoggerLevel = LoggerLevel.Log

	// Database
	@IsString()
	DB_TYPE!: string // e.g., 'postgres'

	@IsString()
	DB_HOST!: string

	@IsNumber()
	DB_PORT = 5432

	@IsString()
	DB_USERNAME!: string

	@IsString()
	DB_PASSWORD!: string

	@IsString()
	DB_NAME!: string

	@IsBoolean()
	DB_SYNCHRONIZE!: boolean

	@IsBoolean()
	DB_LOGGING!: boolean

	// Redis
	@IsString()
	REDIS_HOST!: string

	@IsNumber()
	REDIS_PORT = 6379

	@IsOptional()
	@IsString()
	REDIS_PASSWORD?: string

	@IsNumber()
	REDIS_DB = 0

	// Throttler
	@IsOptional()
	@IsNumber()
	THROTTLER_SHORT_TTL = 1000

	@IsOptional()
	@IsNumber()
	THROTTLER_SHORT_LIMIT = 3

	@IsOptional()
	@IsNumber()
	THROTTLER_MEDIUM_TTL = 60000

	@IsOptional()
	@IsNumber()
	THROTTLER_MEDIUM_LIMIT = 100

	// Security
	@IsOptional()
	@IsString()
	ALLOWED_APPLICATIONS?: string // Comma-separated list of allowed application IDs

	@IsString()
	ADMIN_API_KEY!: string // API Key for admin endpoints
}

export function validate(config: Record<string, unknown>) {
	// Coerce common numeric and boolean environment variables (env files provide strings)
	const processedConfig: Record<string, unknown> = { ...config }
	const numericKeys = [
		'PORT',
		'DB_PORT',
		'REDIS_PORT',
		'REDIS_DB',
		'THROTTLER_SHORT_TTL',
		'THROTTLER_SHORT_LIMIT',
		'THROTTLER_MEDIUM_TTL',
		'THROTTLER_MEDIUM_LIMIT',
	]
	const booleanKeys = ['DB_SYNCHRONIZE', 'DB_LOGGING']

	for (const key of numericKeys) {
		if (processedConfig[key] !== undefined) {
			const val = processedConfig[key]
			if (typeof val === 'string' && val.trim() !== '') {
				const num = Number(val)
				if (!Number.isNaN(num)) processedConfig[key] = num
			}
		}
	}

	for (const key of booleanKeys) {
		if (processedConfig[key] !== undefined) {
			const val = processedConfig[key]
			if (typeof val === 'string') {
				processedConfig[key] = val === 'true'
			}
		}
	}

	const validatedConfig = plainToClass(
		EnvironmentVariables,
		processedConfig,
		{
			enableImplicitConversion: true,
		},
	)

	const errors = validateSync(validatedConfig, {
		skipMissingProperties: false,
	})

	if (errors.length > 0) {
		throw new Error(errors.toString())
	}

	// Preserve unknown env variables (similar to Joi unknown(true))
	return { ...config, ...validatedConfig } as Record<string, unknown>
}
