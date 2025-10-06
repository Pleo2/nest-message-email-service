import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'

import { HealthModule } from '@/app/health/health.module'
import { LoggerModule } from '@/shared/logger/logger.module'
import { UserModule } from '@/contexts/users/user.module'

import { validate } from '../common/env.validation'
import configuration from '../config/configuration'
import { databaseImports } from '../config/database/database.imports'
import { OtpModule } from '@/src/otp'
import { redisImports } from '../config/redis/redis.imports'
import { APP_GUARD } from '@nestjs/core'

const isTest = process.env.NODE_ENV === 'test'

const coreImports = [
	ConfigModule.forRoot({
		isGlobal: true,
		load: configuration,
		envFilePath: isTest ? ['.env.test', '.env'] : ['.env'],
		validate,
		validationOptions: {
			abortEarly: false,
			allowUnknown: true,
		},
	}),

	ThrottlerModule.forRoot([
			{
				name: 'short',
				ttl: 1000, // 1 segundo
				limit: 3, // 3 requests
			},
			{
				name: 'medium',
				ttl: 10_000, // 10 segundos
				limit: 20,
			},
			{
				name: 'long',
				ttl: 60_000, // 1 minuto
				limit: 100,
			},
	]),
	LoggerModule,
	HealthModule,
	UserModule,
]

@Module({
	imports: isTest
		? coreImports
		: [...coreImports, ...databaseImports, ...redisImports, OtpModule],
    providers: [
        {
			provide: APP_GUARD,
			useClass: ThrottlerGuard, // ← Global guard
		},
    ],
})
export class AppModule {}
