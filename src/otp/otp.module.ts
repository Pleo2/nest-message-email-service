// src/modules/otp/otp.module.ts
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ScheduleModule } from '@nestjs/schedule'
import { ThrottlerModule } from '@nestjs/throttler'
import { TypeOrmModule } from '@nestjs/typeorm'

import { redisImports } from '@/src/config/redis/redis.imports'

import { OtpEntity } from './entities/otp.entity'
import { OtpStatsCacheInterceptor } from './interceptors/otp-stats-cache.interceptor'
import { OtpController } from './api/otp.controller'
import { OtpCronService } from './otp.cron'
import { OtpService } from './otp.service'

/**
 * OTP Module
 *
 * Módulo completo de autenticación con OTP que incluye:
 * - Gestión de OTPs en PostgreSQL
 * - Caching con Redis
 * - Rate limiting con Throttler
 * - Validaciones con class-validator
 */
@Module({
	imports: [
		// TypeORM para la entidad OTP
		TypeOrmModule.forFeature([OtpEntity]),

		// Redis para caching y rate limiting
		...redisImports,

		// Throttler para rate limiting global
		ThrottlerModule.forRoot([
			{
				ttl: 60_000, // 60 segundos
				limit: 10, // 10 requests por ventana
			},
		]),

		// Scheduler para cron jobs
		ScheduleModule.forRoot(),

		// ConfigModule si no está global
		ConfigModule,
	],
	controllers: [OtpController],
	providers: [OtpService, OtpCronService, OtpStatsCacheInterceptor],
	exports: [OtpService],
})
export class OtpModule {}
