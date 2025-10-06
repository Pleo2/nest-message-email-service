import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core'

import { OtpModule } from '@/src/otp'

import { HealthModule } from '@/app/health/health.module'

import { LoggerModule } from '@/shared/logger/logger.module'

import { UserModule } from '@/contexts/users/user.module'

import { validate } from '../common/env.validation'
import { LoggerMiddleware } from '../common/logger.middleware'
import configuration from '../config/configuration'
import { databaseImports } from '../config/database/database.imports'
import { redisImports } from '../config/redis/redis.imports'
import { throttlerRedisImports } from '../config/throttler-redis/throttler-redis.imports'
import { ApplicationValidationGuard, CustomThrottlerGuard } from '../guards'
import {
	LoggingInterceptor,
	SanitizeInterceptor,
	TimeoutInterceptor,
	TransformInterceptor,
} from '../interceptors'

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
	LoggerModule,
	HealthModule,
	UserModule,
]

@Module({
	imports: isTest
		? coreImports
		: [...coreImports, ...databaseImports, ...redisImports, ...throttlerRedisImports, OtpModule],
	providers: [
		{
			provide: APP_GUARD,
			useClass: CustomThrottlerGuard, // ← Global guard
		},
		// ApplicationValidationGuard global
		{
			provide: APP_GUARD,
			useClass: ApplicationValidationGuard,
		},

		// Interceptors GLOBALES
		{
			provide: APP_INTERCEPTOR,
			useClass: LoggingInterceptor,
		},
		{
			provide: APP_INTERCEPTOR,
			useClass: TransformInterceptor,
		},
		{
			provide: APP_INTERCEPTOR,
			useClass: SanitizeInterceptor,
		},
		{
			provide: APP_INTERCEPTOR,
			useClass: TimeoutInterceptor,
		},
	],
})
export class AppModule implements NestModule {
	configure(consumer: MiddlewareConsumer) {
		consumer.apply(LoggerMiddleware).forRoutes('*')
	}
}
