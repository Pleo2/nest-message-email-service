import type { RedisClientType } from 'redis'

import * as crypto from 'node:crypto'

import {
	BadRequestException,
	HttpException,
	HttpStatus,
	Injectable,
	InternalServerErrorException,
	Logger,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { InjectRedis } from '@nestjs-redis/kit'
import * as bcrypt from 'bcrypt'
import { LessThan, MoreThan, Repository } from 'typeorm'

import {
	BlockedOtpErrorDto,
	CleanupResponseDto,
	ErrorResponseDto,
	GenerateOtpDto,
	GenerateOtpResponseDto,
	OtpStatisticsResponseDto,
	RateLimitErrorDto,
	ResendOtpDto,
	VerifyOtpDto,
	VerifyOtpResponseDto,
} from './dto'
import { OtpEntity } from './entities/otp.entity'

// Interface temporal para plainOtp
interface OtpEntityWithPlainOtp extends OtpEntity {
	plainOtp?: string
}

/**
 * OTP Service
 */
@Injectable()
export class OtpService {
	private readonly logger = new Logger(OtpService.name)

	// Constantes de configuración
	private OTP_LENGTH = 6
	private MAX_ATTEMPTS = 3
	private MAX_RESEND_COUNT = 5
	private BLOCK_DURATION_MINUTES = 15
	private RESEND_COOLDOWN_SECONDS = 60
	private DEFAULT_EXPIRY_MINUTES = 10
	private readonly BCRYPT_ROUNDS = 12
	private RATE_LIMIT_MAX = 5
	private RATE_LIMIT_WINDOW_SECONDS = 900

	constructor(
		@InjectRepository(OtpEntity)
		private readonly otpRepository: Repository<OtpEntity>,
		@InjectRedis()
		private readonly redis: RedisClientType,
		private readonly configService: ConfigService,
	) {
		this.initializeConfig()
	}

	private initializeConfig(): void {
		const maxAttempts = this.configService.get<number>('OTP_MAX_ATTEMPTS')
		const maxResend = this.configService.get<number>('OTP_MAX_RESEND_COUNT')
		const expiryMinutes =
			this.configService.get<number>('OTP_EXPIRY_MINUTES')
		const blockDuration = this.configService.get<number>(
			'OTP_BLOCK_DURATION_MINUTES',
		)
		const resendCooldown = this.configService.get<number>(
			'OTP_RESEND_COOLDOWN_SECONDS',
		)
		const rateLimitMax =
			this.configService.get<number>('OTP_RATE_LIMIT_MAX')
		const rateLimitWindow = this.configService.get<number>(
			'OTP_RATE_LIMIT_WINDOW_SECONDS',
		)

		// Aplicar valores solo si son números válidos
		if (typeof maxAttempts === 'number') this.MAX_ATTEMPTS = maxAttempts
		if (typeof maxResend === 'number') this.MAX_RESEND_COUNT = maxResend
		if (typeof expiryMinutes === 'number')
			this.DEFAULT_EXPIRY_MINUTES = expiryMinutes
		if (typeof blockDuration === 'number')
			this.BLOCK_DURATION_MINUTES = blockDuration
		if (typeof resendCooldown === 'number')
			this.RESEND_COOLDOWN_SECONDS = resendCooldown
		if (typeof rateLimitMax === 'number') this.RATE_LIMIT_MAX = rateLimitMax
		if (typeof rateLimitWindow === 'number')
			this.RATE_LIMIT_WINDOW_SECONDS = rateLimitWindow

		this.logger.log(
			`OTP Service initialized: MAX_ATTEMPTS=${this.MAX_ATTEMPTS}, MAX_RESEND=${this.MAX_RESEND_COUNT}, EXPIRY=${this.DEFAULT_EXPIRY_MINUTES}min`,
		)
	}

	async generateOtp(
		dto: GenerateOtpDto,
		requestIp?: string,
	): Promise<GenerateOtpResponseDto> {
		try {
			this.logger.debug(
				`Generating OTP for ${dto.identifier}, app: ${dto.applicationId}`,
			)

			this.validateApplication(dto.applicationId)
			await this.checkRateLimit(dto.identifier, dto.applicationId)

			const existingOtp = await this.findActiveOtp(
				dto.identifier,
				dto.applicationId,
			)

			if (existingOtp) {
				if (existingOtp.blockedUntil > new Date()) {
					this.logger.warn(
						`Blocked OTP request: ${dto.identifier}, app: ${dto.applicationId}`,
					)

					const errorDto = new BlockedOtpErrorDto({
						success: false,
						message: `Account temporarily blocked until ${existingOtp.blockedUntil.toISOString()}`,
						statusCode: HttpStatus.TOO_MANY_REQUESTS,
						errorCode: 'OTP_BLOCKED',
						timestamp: new Date().toISOString(),
						blockedUntil: existingOtp.blockedUntil.toISOString(),
					})

					throw new HttpException(
						errorDto,
						HttpStatus.TOO_MANY_REQUESTS,
					)
				}

				const cooldownEnds = new Date(
					existingOtp.lastResendAt.getTime() +
						this.RESEND_COOLDOWN_SECONDS * 1000,
				)

				if (cooldownEnds > new Date()) {
					const secondsRemaining = Math.ceil(
						(cooldownEnds.getTime() - Date.now()) / 1000,
					)
					this.logger.debug(
						`Cooldown active: ${secondsRemaining}s remaining`,
					)

					return new GenerateOtpResponseDto({
						success: false,
						message: `Please wait ${secondsRemaining} seconds before requesting another OTP`,
						resendAllowedAt: cooldownEnds,
					})
				}

				if (existingOtp.resendCount >= this.MAX_RESEND_COUNT) {
					this.logger.warn(`Max resend exceeded: ${dto.identifier}`)
					await this.blockOtp(
						existingOtp,
						'Max resend attempts exceeded',
					)

					const blockedUntil = existingOtp.blockedUntil.toISOString()

					const errorDto = new BlockedOtpErrorDto({
						success: false,
						message: `Maximum resend attempts exceeded. Account blocked for ${this.BLOCK_DURATION_MINUTES} minutes.`,
						statusCode: HttpStatus.TOO_MANY_REQUESTS,
						errorCode: 'MAX_RESEND_EXCEEDED',
						timestamp: new Date().toISOString(),
						blockedUntil,
					})

					throw new HttpException(
						errorDto,
						HttpStatus.TOO_MANY_REQUESTS,
					)
				}
			}

			const otpCode = this.generateSecureOtp()
			const hashedOtp = await this.hashOtp(otpCode)
			const expiresAt = this.calculateExpiryDate()
			const now = new Date()

			let otpEntity: OtpEntity

			if (existingOtp) {
				existingOtp.hashedOtp = hashedOtp
				existingOtp.expiresAt = expiresAt
				existingOtp.resendCount += 1
				existingOtp.lastResendAt = now
				existingOtp.attempts = 0
				existingOtp.blocked = false
				existingOtp.blockedUntil = new Date(0)
				existingOtp.requestIp = requestIp ?? existingOtp.requestIp

				otpEntity = await this.otpRepository.save(existingOtp)
				this.logger.log(
					`OTP resent (count: ${otpEntity.resendCount}): ${dto.identifier}`,
				)
			} else {
				otpEntity = this.otpRepository.create({
					identifier: dto.identifier,
					hashedOtp,
					type: dto.type,
					applicationId: dto.applicationId,
					applicationName: dto.applicationName,
					expiresAt,
					requestIp: requestIp ?? '',
					resendCount: 0,
					attempts: 0,
					verified: false,
					blocked: false,
				})

				otpEntity = await this.otpRepository.save(otpEntity)
				this.logger.log(
					`New OTP generated: ${dto.identifier}, id: ${otpEntity.id}`,
				)
			}

			await this.storeOtpInRedis(
				dto.applicationId,
				dto.identifier,
				otpEntity,
			)

			await this.updateRateLimit(dto.identifier, dto.applicationId)

			const nextResendAt = new Date(
				now.getTime() + this.RESEND_COOLDOWN_SECONDS * 1000,
			)

			// Guardar código en texto plano para envío
			const otpEntityWithCode = otpEntity as OtpEntityWithPlainOtp
			otpEntityWithCode.plainOtp = otpCode

			return new GenerateOtpResponseDto({
				success: true,
				message: existingOtp
					? 'OTP resent successfully'
					: 'OTP generated successfully',
				expiresAt,
				resendAllowedAt: nextResendAt,
			})
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : 'Unknown error'
			const errorStack = error instanceof Error ? error.stack : undefined

			this.logger.error(
				`Error generating OTP: ${errorMessage}`,
				errorStack,
			)
			throw error
		}
	}

	async verifyOtp(
		dto: VerifyOtpDto,
		requestIp?: string,
	): Promise<VerifyOtpResponseDto> {
		try {
			this.logger.debug(
				`Verifying OTP: ${dto.identifier}, app: ${dto.applicationId}`,
			)

			const redisKey = this.getRedisKey(dto.applicationId, dto.identifier)

			let otpEntity: OtpEntity | null | undefined = undefined
			const cachedData = await this.redis.get(redisKey)

			if (cachedData) {
				try {
					const parsed = JSON.parse(cachedData) as { id: string }
					otpEntity = await this.otpRepository.findOne({
						where: { id: parsed.id },
					})
				} catch (parseError) {
					const message =
						parseError instanceof Error
							? parseError.message
							: 'Unknown parse error'
					this.logger.warn(`Redis parse error: ${message}`)
				}
			}

			if (!otpEntity) {
				otpEntity = await this.findActiveOtp(
					dto.identifier,
					dto.applicationId,
				)
			}

			if (!otpEntity) {
				this.logger.warn(`OTP not found: ${dto.identifier}`)
				return new VerifyOtpResponseDto({
					success: false,
					message: 'Invalid or expired OTP',
				})
			}

			if (otpEntity.expiresAt < new Date()) {
				this.logger.debug(`OTP expired: ${dto.identifier}`)
				await this.cleanupOtp(otpEntity)
				return new VerifyOtpResponseDto({
					success: false,
					message: 'OTP has expired. Please request a new one.',
				})
			}

			if (otpEntity.blockedUntil > new Date()) {
				this.logger.warn(
					`Verification on blocked OTP: ${dto.identifier}`,
				)
				return new VerifyOtpResponseDto({
					success: false,
					message: `Account temporarily blocked until ${otpEntity.blockedUntil.toISOString()}`,
				})
			}

			if (otpEntity.verified) {
				this.logger.warn(`Already verified OTP: ${dto.identifier}`)
				return new VerifyOtpResponseDto({
					success: false,
					message: 'This OTP has already been used',
				})
			}

			const isValid = await this.compareOtp(dto.otp, otpEntity.hashedOtp)

			otpEntity.attempts += 1
			otpEntity.lastAttemptAt = new Date()
			otpEntity.requestIp = requestIp ?? otpEntity.requestIp

			if (isValid) {
				otpEntity.verified = true
				await this.otpRepository.save(otpEntity)
				await this.redis.del(redisKey)

				const sessionToken = this.generateSessionToken(
					dto.identifier,
					dto.applicationId,
				)

				this.logger.log(`✅ OTP verified: ${dto.identifier}`)

				return new VerifyOtpResponseDto({
					success: true,
					message: 'OTP verified successfully',
					token: sessionToken,
				})
			}

			const remainingAttempts = this.MAX_ATTEMPTS - otpEntity.attempts

			if (remainingAttempts <= 0) {
				await this.blockOtp(
					otpEntity,
					'Max verification attempts exceeded',
				)

				this.logger.warn(`❌ OTP blocked: ${dto.identifier}`)

				return new VerifyOtpResponseDto({
					success: false,
					message: `Too many failed attempts. Account blocked for ${this.BLOCK_DURATION_MINUTES} minutes.`,
					remainingAttempts: 0,
				})
			}

			await this.otpRepository.save(otpEntity)
			await this.updateOtpInRedis(
				dto.applicationId,
				dto.identifier,
				otpEntity,
			)

			this.logger.warn(
				`❌ Invalid OTP: ${dto.identifier}, remaining: ${remainingAttempts}`,
			)

			return new VerifyOtpResponseDto({
				success: false,
				message: `Invalid OTP. ${remainingAttempts} attempt${remainingAttempts > 1 ? 's' : ''} remaining.`,
				remainingAttempts,
			})
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : 'Unknown error'
			const errorStack = error instanceof Error ? error.stack : undefined

			this.logger.error(
				`Error verifying OTP: ${errorMessage}`,
				errorStack,
			)
			throw error
		}
	}

	async resendOtp(
		dto: ResendOtpDto,
		requestIp?: string,
	): Promise<GenerateOtpResponseDto> {
		this.logger.debug(
			`Resend OTP: ${dto.identifier}, app: ${dto.applicationId}`,
		)

		return this.generateOtp(
			{
				identifier: dto.identifier,
				type: dto.type,
				applicationId: dto.applicationId,
				applicationName: dto.applicationName,
			},
			requestIp,
		)
	}

	async cleanupExpiredOtps(): Promise<CleanupResponseDto> {
		try {
			this.logger.debug('Starting cleanup of expired OTPs')

			const expired = await this.otpRepository.find({
				where: {
					expiresAt: LessThan(new Date()),
				},
			})

			if (expired.length === 0) {
				this.logger.debug('No expired OTPs to clean')
				return new CleanupResponseDto({
					success: true,
					message: 'No expired OTPs found',
					cleanedCount: 0,
				})
			}

			await this.otpRepository.remove(expired)

			for (const otp of expired) {
				const redisKey = this.getRedisKey(
					otp.applicationId,
					otp.identifier,
				)
				await this.redis.del(redisKey)
			}

			this.logger.log(`✅ Cleaned up ${expired.length} expired OTPs`)

			return new CleanupResponseDto({
				success: true,
				message: `Successfully cleaned up ${expired.length} expired OTP${expired.length > 1 ? 's' : ''}`,
				cleanedCount: expired.length,
			})
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : 'Unknown error'
			const errorStack = error instanceof Error ? error.stack : undefined

			this.logger.error(
				`Error during cleanup: ${errorMessage}`,
				errorStack,
			)
			throw new InternalServerErrorException(
				new ErrorResponseDto({
					success: false,
					message: 'Failed to cleanup expired OTPs',
					statusCode: 500,
					errorCode: 'CLEANUP_FAILED',
					timestamp: new Date().toISOString(),
				}),
			)
		}
	}

	async getStatistics(
		applicationId?: string,
	): Promise<OtpStatisticsResponseDto> {
		try {
			this.logger.debug(
				`Getting statistics${applicationId ? ` for app: ${applicationId}` : ''}`,
			)

			const baseWhere = applicationId ? { applicationId } : {}

			const [
				totalOtps,
				activeOtps,
				verifiedOtps,
				blockedOtps,
				cleanupNeeded,
			] = await Promise.all([
				this.otpRepository.count({ where: baseWhere }),
				this.otpRepository.count({
					where: {
						...baseWhere,
						verified: false,
						expiresAt: MoreThan(new Date()),
					},
				}),
				this.otpRepository.count({
					where: { ...baseWhere, verified: true },
				}),
				this.otpRepository.count({
					where: { ...baseWhere, blocked: true },
				}),
				this.otpRepository.count({
					where: {
						...baseWhere,
						expiresAt: LessThan(new Date()),
					},
				}),
			])

			return new OtpStatisticsResponseDto({
				totalOtps,
				activeOtps,
				verifiedOtps,
				blockedOtps,
				cleanupNeeded,
				applicationId,
			})
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : 'Unknown error'
			const errorStack = error instanceof Error ? error.stack : undefined

			this.logger.error(
				`Error getting statistics: ${errorMessage}`,
				errorStack,
			)
			throw new InternalServerErrorException(
				new ErrorResponseDto({
					success: false,
					message: 'Failed to retrieve statistics',
					statusCode: 500,
					errorCode: 'STATS_FAILED',
					timestamp: new Date().toISOString(),
				}),
			)
		}
	}

	// ============================================================================
	// MÉTODOS PRIVADOS
	// ============================================================================

	private generateSecureOtp(): string {
		const buffer = crypto.randomBytes(4)
		const randomNumber = buffer.readUInt32BE(0)
		const otp = (randomNumber % Math.pow(10, this.OTP_LENGTH))
			.toString()
			.padStart(this.OTP_LENGTH, '0')
		return otp
	}

	private async hashOtp(otp: string): Promise<string> {
		return bcrypt.hash(otp, this.BCRYPT_ROUNDS)
	}

	private async compareOtp(
		plainOtp: string,
		hashedOtp: string,
	): Promise<boolean> {
		return bcrypt.compare(plainOtp, hashedOtp)
	}

	private calculateExpiryDate(): Date {
		return new Date(Date.now() + this.DEFAULT_EXPIRY_MINUTES * 60 * 1000)
	}

	private generateSessionToken(
		identifier: string,
		applicationId: string,
	): string {
		const payload = {
			identifier,
			applicationId,
			timestamp: Date.now(),
			verified: true,
		}
		return Buffer.from(JSON.stringify(payload)).toString('base64')
	}

	private async findActiveOtp(
		identifier: string,
		applicationId: string,
	): Promise<OtpEntity | null> {
		return this.otpRepository.findOne({
			where: {
				identifier,
				applicationId,
				verified: false,
				expiresAt: MoreThan(new Date()),
			},
			order: { createdAt: 'DESC' },
		})
	}

	private async blockOtp(
		otpEntity: OtpEntity,
		reason: string,
	): Promise<void> {
		otpEntity.blocked = true
		otpEntity.blockedUntil = new Date(
			Date.now() + this.BLOCK_DURATION_MINUTES * 60 * 1000,
		)
		await this.otpRepository.save(otpEntity)
		this.logger.warn(
			`🔒 OTP blocked: ${otpEntity.identifier}, reason: ${reason}`,
		)
	}

	private async cleanupOtp(otpEntity: OtpEntity): Promise<void> {
		const redisKey = this.getRedisKey(
			otpEntity.applicationId,
			otpEntity.identifier,
		)
		await this.redis.del(redisKey)
		await this.otpRepository.remove(otpEntity)
	}

	private async checkRateLimit(
		identifier: string,
		applicationId: string,
	): Promise<void> {
		const rateLimitKey = `rate_limit:${applicationId}:${identifier}`
		const current = await this.redis.get(rateLimitKey)

		if (current && Number.parseInt(current, 10) >= this.RATE_LIMIT_MAX) {
			const ttl = await this.redis.ttl(rateLimitKey)
			this.logger.warn(`Rate limit exceeded: ${identifier}`)

			const errorDto = new RateLimitErrorDto({
				success: false,
				message: `Rate limit exceeded. Please try again in ${ttl} seconds.`,
				statusCode: HttpStatus.TOO_MANY_REQUESTS,
				errorCode: 'RATE_LIMIT_EXCEEDED',
				timestamp: new Date().toISOString(),
				retryAfter: ttl,
			})

			throw new HttpException(errorDto, HttpStatus.TOO_MANY_REQUESTS)
		}
	}

	private async updateRateLimit(
		identifier: string,
		applicationId: string,
	): Promise<void> {
		const rateLimitKey = `rate_limit:${applicationId}:${identifier}`
		const current = await this.redis.get(rateLimitKey)
		await (current
			? this.redis.incr(rateLimitKey)
			: this.redis.setEx(
					rateLimitKey,
					this.RATE_LIMIT_WINDOW_SECONDS,
					'1',
				))
	}

	private validateApplication(applicationId: string): void {
		const allowedApps = this.configService
			.get<string>('ALLOWED_APPLICATIONS', '')
			.split(',')
			.map(app => app.trim())
			.filter(app => app.length > 0)

		if (allowedApps.length === 0) return

		if (!allowedApps.includes(applicationId)) {
			this.logger.warn(`Invalid application ID: ${applicationId}`)
			throw new BadRequestException('Invalid application identifier')
		}
	}

	private getRedisKey(applicationId: string, identifier: string): string {
		return `otp:${applicationId}:${identifier}`
	}

	private async storeOtpInRedis(
		applicationId: string,
		identifier: string,
		otpEntity: OtpEntity,
	): Promise<void> {
		const redisKey = this.getRedisKey(applicationId, identifier)
		const ttlSeconds = Math.floor(
			(otpEntity.expiresAt.getTime() - Date.now()) / 1000,
		)

		const data = JSON.stringify({
			id: otpEntity.id,
			hashedOtp: otpEntity.hashedOtp,
			expiresAt: otpEntity.expiresAt.toISOString(),
			attempts: otpEntity.attempts,
			blocked: otpEntity.blocked,
		})

		await this.redis.setEx(redisKey, ttlSeconds, data)
	}

	private async updateOtpInRedis(
		applicationId: string,
		identifier: string,
		otpEntity: OtpEntity,
	): Promise<void> {
		const redisKey = this.getRedisKey(applicationId, identifier)
		const ttl = await this.redis.ttl(redisKey)

		if (ttl > 0) {
			const data = JSON.stringify({
				id: otpEntity.id,
				hashedOtp: otpEntity.hashedOtp,
				expiresAt: otpEntity.expiresAt.toISOString(),
				attempts: otpEntity.attempts,
				blocked: otpEntity.blocked,
			})
			await this.redis.setEx(redisKey, ttl, data)
		}
	}
}
