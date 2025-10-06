import {
	ExecutionContext,
	HttpException,
	HttpStatus,
	Injectable,
	Logger,
} from '@nestjs/common'
import { ThrottlerGuard, ThrottlerLimitDetail } from '@nestjs/throttler'
import { FastifyRequest } from 'fastify'

/**
 * Custom Throttler Guard
 *
 * Rate limiting inteligente que limita por:
 * - applicationId:identifier (endpoints OTP)
 * - IP (endpoints admin y otros)
 */
@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
	private readonly logger = new Logger(CustomThrottlerGuard.name)

	/**
	 * Genera la key única para throttling
	 */
	protected getTracker(req: FastifyRequest): Promise<string> {
		const { url } = req
		const otpPayload = this.extractOtpPayload(req.body)

		// Para endpoints OTP: usar applicationId + identifier
		if (url && this.isOtpEndpoint(url) && otpPayload) {
			const key = `${otpPayload.applicationId}:${otpPayload.identifier}`
			this.logger.debug(`Throttle key: ${key}`)
			return Promise.resolve(key)
		}

		// Para endpoints admin y otros: usar IP
		const ip = this.getIp(req)
		this.logger.debug(`Throttle key (IP): ${ip}`)
		return Promise.resolve(ip)
	}

	/**
	 * Detecta si es un endpoint OTP
	 */
	private isOtpEndpoint(url: string): boolean {
		return (
			url.includes('/api/otp/generate') ||
			url.includes('/api/otp/verify') ||
			url.includes('/api/otp/resend')
		)
	}

	/**
	 * Obtiene la IP real (soporta proxies)
	 */
	private getIp(req: FastifyRequest): string {
		const forwarded = req.headers['x-forwarded-for']
		if (forwarded) {
			return Array.isArray(forwarded)
				? forwarded[0]
				: forwarded.split(',')[0].trim()
		}
		return req.ip || 'unknown'
	}

	/**
	 * Override para mensajes de error personalizados
	 */
	protected throwThrottlingException(
		context: ExecutionContext,
		throttlerLimitDetail: ThrottlerLimitDetail,
	): Promise<void> {
		const request = context.switchToHttp().getRequest<FastifyRequest>()
		const otpPayload = this.extractOtpPayload(request.body)
		const identifier = otpPayload?.identifier ?? this.getIp(request)
		const retryAfterSeconds = Math.max(
			1,
			Math.ceil(
				throttlerLimitDetail.timeToBlockExpire ||
					throttlerLimitDetail.ttl,
			),
		)

		const exception = new HttpException(
			{
				success: false,
				message: 'Too many requests. Please try again later.',
				errorCode: 'RATE_LIMIT_EXCEEDED',
				statusCode: 429,
				identifier,
				retryAfter: retryAfterSeconds,
			},
			HttpStatus.TOO_MANY_REQUESTS,
		)

		return Promise.reject(exception)
	}

	private extractOtpPayload(
		payload: unknown,
	): { applicationId: string; identifier: string } | undefined {
		if (!payload || typeof payload !== 'object') {
			return undefined
		}
		const record = payload as Record<string, unknown>
		const applicationId = record.applicationId
		const identifier = record.identifier

		if (
			!this.isStringOrNumber(applicationId) ||
			!this.isStringOrNumber(identifier)
		) {
			return undefined
		}

		return {
			applicationId: String(applicationId),
			identifier: String(identifier),
		}
	}

	private isStringOrNumber(value: unknown): value is string | number {
		return typeof value === 'string' || typeof value === 'number'
	}
}
