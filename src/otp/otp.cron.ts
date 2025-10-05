import type { RedisClientType } from 'redis'

import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression, SchedulerRegistry } from '@nestjs/schedule'
import { InjectRepository } from '@nestjs/typeorm'
import { InjectRedis } from '@nestjs-redis/kit'
import { LessThan, MoreThan, Repository } from 'typeorm'

import { OtpEntity } from './entities/otp.entity'

/**
 * OTP Cron Service
 *
 * Limpieza automática SOLO de Redis
 * La base de datos PostgreSQL mantiene todo el historial
 */
@Injectable()
export class OtpCronService {
	private readonly logger = new Logger(OtpCronService.name)
	private isCleanupRunning = false

	constructor(
		@InjectRepository(OtpEntity)
		private readonly otpRepository: Repository<OtpEntity>,
		@InjectRedis()
		private readonly redis: RedisClientType,
		private readonly schedulerRegistry: SchedulerRegistry,
	) {
		this.logger.log('OTP Cron Service initialized (Redis cleanup only)')
	}

	private hasToISOString(value: unknown): value is { toISOString: () => string } {
		return (
			typeof (value as { toISOString?: unknown }).toISOString === 'function'
		)
	}

	private hasToISO(value: unknown): value is { toISO: () => string } {
		return typeof (value as { toISO?: unknown }).toISO === 'function'
	}

	private hasToString(value: unknown): value is { toString: () => string } {
		return typeof (value as { toString?: unknown }).toString === 'function'
	}

	private toIso(value: unknown): string {
		if (!value) return 'unknown'
		if (this.hasToISOString(value)) return value.toISOString()
		if (this.hasToISO(value)) return value.toISO()
		if (this.hasToString(value)) return value.toString()
		return 'unknown'
	}

	/**
	 * Limpieza de Redis cada 30 minutos
	 */
	@Cron(CronExpression.EVERY_30_MINUTES, {
		name: 'cleanup-redis-otps',
	})
	async cleanupExpiredRedisKeys() {
		if (this.isCleanupRunning) {
			this.logger.warn('⏳ Cleanup already running, skipping...')
			return
		}

		this.isCleanupRunning = true
		const startTime = Date.now()
		let deletedKeys = 0

		try {
			this.logger.log('🧹 Starting Redis cleanup...')

			// 1. Obtener todos los OTPs expirados o verificados
			const expiredOrVerified = await this.otpRepository.find({
				where: [
					{ expiresAt: LessThan(new Date()) },
					{ verified: true },
					{ blocked: true },
				],
				select: ['applicationId', 'identifier'],
			})

			// 2. Eliminar claves de Redis correspondientes
			for (const otp of expiredOrVerified) {
				const redisKey = `otp:${otp.applicationId}:${otp.identifier}`
				try {
					const deleted = await this.redis.del(redisKey)
					if (deleted > 0) {
						deletedKeys++
					}
				} catch (error) {
					this.logger.warn(`Failed to delete key ${redisKey}: ${error instanceof Error ? error.message : 'Unknown error'}`)
				}
			}

			// 3. Limpiar rate limit keys antiguos
			// Nota: redis.keys() puede ser lento, usar con precaución
			const rateLimitPattern = 'rate_limit:*'
			const rateLimitKeys = await this.redis.keys(rateLimitPattern)

			for (const key of rateLimitKeys) {
				try {
					const ttl = await this.redis.ttl(key)
					// Si TTL es -1 (sin expiración) o -2 (no existe), eliminar
					if (ttl === -1 || ttl === -2) {
						await this.redis.del(key)
						deletedKeys++
					}
				} catch (error) {
					this.logger.warn(`Failed to check TTL for key ${key}: ${error instanceof Error ? error.message : 'Unknown error'}`)
				}
			}

			const duration = Date.now() - startTime

			this.logger.log(
				`✅ Redis cleanup completed: ${deletedKeys} keys removed in ${duration}ms`,
			)
			this.logger.log(
				`📊 DB records kept: ${expiredOrVerified.length} (history preserved)`,
			)
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error'
			this.logger.error(`Redis cleanup failed: ${errorMessage}`)
		} finally {
			this.isCleanupRunning = false
		}
	}

	/**
	 * Limpieza agresiva de Redis cada 6 horas
	 */
	@Cron(CronExpression.EVERY_6_HOURS, {
		name: 'aggressive-redis-cleanup',
	})
	async aggressiveRedisCleanup() {
		try {
			this.logger.log('🔥 Starting aggressive Redis cleanup...')

			// Obtener todas las keys OTP
			const otpPattern = 'otp:*'
			const otpKeys = await this.redis.keys(otpPattern)

			let deletedOtpKeys = 0
			if (otpKeys.length > 0) {
				for (const k of otpKeys) {
					deletedOtpKeys += await this.redis.del(k)
				}
				this.logger.log(`Deleted ${deletedOtpKeys} OTP keys from Redis`)
			}

			// Obtener todas las keys rate_limit
			const rateLimitPattern = 'rate_limit:*'
			const rateLimitKeys = await this.redis.keys(rateLimitPattern)

			let deletedRateLimitKeys = 0
			if (rateLimitKeys.length > 0) {
				for (const k of rateLimitKeys) {
					deletedRateLimitKeys += await this.redis.del(k)
				}
				this.logger.log(`Deleted ${deletedRateLimitKeys} rate limit keys from Redis`)
			}

			this.logger.log(
				`✅ Aggressive cleanup completed: ${deletedOtpKeys + deletedRateLimitKeys} total keys removed`,
			)
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error'
			this.logger.error(`Aggressive cleanup failed: ${errorMessage}`)
		}
	}

	/**
	 * Reporte diario de uso de Redis vs PostgreSQL
	 */
	@Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
		name: 'daily-redis-report',
	})
	async generateDailyRedisReport() {
		try {
			this.logger.log('📊 Generating daily Redis report...')

			// Contar keys en Redis
			const otpKeys = await this.redis.keys('otp:*')
			const rateLimitKeys = await this.redis.keys('rate_limit:*')

			// Contar registros en DB
			const [totalOtps, activeOtps, expiredOtps, verifiedOtps] =
				await Promise.all([
					this.otpRepository.count(),
					this.otpRepository.count({
						where: {
							verified: false,
							expiresAt: MoreThan(new Date()),
						},
					}),
					this.otpRepository.count({
						where: {
							expiresAt: LessThan(new Date()),
						},
					}),
					this.otpRepository.count({
						where: {
							verified: true,
						},
					}),
				])

			const report = {
				redis: {
					otpKeys: otpKeys.length,
					rateLimitKeys: rateLimitKeys.length,
					total: otpKeys.length + rateLimitKeys.length,
				},
				database: {
					total: totalOtps,
					active: activeOtps,
					expired: expiredOtps,
					verified: verifiedOtps,
				},
				difference: {
					cacheEfficiency:
						activeOtps > 0
							? ((otpKeys.length / activeOtps) * 100).toFixed(2) +
								'%'
							: 'N/A',
				},
			}

			this.logger.log('Daily Report:')
			this.logger.log(JSON.stringify(report, null, 2))
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error'
			this.logger.error(`Report generation failed: ${errorMessage}`)
		}
	}

	/**
	 * Trigger manual de limpieza
	 */
	async triggerManualCleanup(): Promise<{
		redisKeysDeleted: number
		dbRecordsKept: number
	}> {
		this.logger.log('🔧 Manual Redis cleanup triggered')

		try {
			const otpKeys = await this.redis.keys('otp:*')
			const rateLimitKeys = await this.redis.keys('rate_limit:*')

			let deletedOtpKeys = 0
			let deletedRateLimitKeys = 0

			if (otpKeys.length > 0) {
				for (const k of otpKeys) {
					deletedOtpKeys += await this.redis.del(k)
				}
			}

			if (rateLimitKeys.length > 0) {
				for (const k of rateLimitKeys) {
					deletedRateLimitKeys += await this.redis.del(k)
				}
			}

			const totalKeys = deletedOtpKeys + deletedRateLimitKeys
			const dbRecords = await this.otpRepository.count()

			this.logger.log(
				`✅ Manual cleanup: ${totalKeys} Redis keys deleted, ${dbRecords} DB records preserved`,
			)

			return {
				redisKeysDeleted: totalKeys,
				dbRecordsKept: dbRecords,
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error'
			this.logger.error(`Manual cleanup failed: ${errorMessage}`)

			return {
				redisKeysDeleted: 0,
				dbRecordsKept: await this.otpRepository.count(),
			}
		}
	}

	/**
	 * Obtener estado de los cron jobs
	 */
	getCronJobsStatus() {
		const jobs = this.schedulerRegistry.getCronJobs()
		type CronJobStatus = { running?: boolean; lastDate: string; nextDate: string }
		const status: Record<string, CronJobStatus> = {}

		for (const [name, job] of jobs.entries()) {
			// Compatibilidad con diferentes versiones de 'cron'
			interface MaybeCronJob {
				running?: boolean
				lastDate?: () => unknown
				nextDate?: () => unknown
			}
			const anyJob = job as unknown as MaybeCronJob

			const last = anyJob.lastDate?.()
			const next = anyJob.nextDate?.()

			status[name] = {
				running: anyJob.running ?? undefined,
				lastDate: last ? this.toIso(last) : 'never',
				nextDate: next ? this.toIso(next) : 'unknown',
			}
		}

		return status
	}

	/**
	 * Sincronizar Redis con DB (reconstruir caché)
	 */
	async syncRedisFromDatabase(): Promise<number> {
		try {
			this.logger.log('🔄 Syncing Redis from database...')

			const activeOtps = await this.otpRepository.find({
				where: {
					verified: false,
					expiresAt: MoreThan(new Date()),
				},
			})

			let syncedCount = 0

			for (const otp of activeOtps) {
				const redisKey = `otp:${otp.applicationId}:${otp.identifier}`
				const ttlSeconds = Math.floor(
					(otp.expiresAt.getTime() - Date.now()) / 1000,
				)

				if (ttlSeconds > 0) {
					const data = JSON.stringify({
						id: otp.id,
						hashedOtp: otp.hashedOtp,
						expiresAt: otp.expiresAt.toISOString(),
						attempts: otp.attempts,
						blocked: otp.blocked,
					})

					try {
						await this.redis.setEx(redisKey, ttlSeconds, data)
						syncedCount++
					} catch {}
				}
			}

			this.logger.log(`✅ Synced ${syncedCount} OTPs to Redis`)
			return syncedCount
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : 'Unknown error'
			this.logger.error(`❌ Sync failed: ${errorMessage}`)
			return 0
		}
	}
}
