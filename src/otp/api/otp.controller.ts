import {
	Body,
	Controller,
	Get,
	HttpCode,
	HttpStatus,
	Ip,
	Post,
	Query,
	UseGuards,
	UseInterceptors,
} from '@nestjs/common'
import {
	ApiBadRequestResponse,
	ApiHeader,
	ApiOkResponse,
	ApiOperation,
	ApiSecurity,
	ApiTags,
	ApiTooManyRequestsResponse,
} from '@nestjs/swagger'
import { ThrottlerGuard } from '@nestjs/throttler'

import {
	CleanupResponseDto,
	ErrorResponseDto,
	GenerateOtpDto,
	GenerateOtpResponseDto,
	OtpStatisticsQueryDto,
	OtpStatisticsResponseDto,
	RateLimitErrorDto,
	ResendOtpDto,
	ValidationErrorDto,
	VerifyOtpDto,
	VerifyOtpResponseDto,
} from '../dto'

// Guards
import { ApiKeyGuard } from '../../guards'

// Decorators
import { Public, SkipAppValidation } from '../../decorators'

// Services
import { OtpStatsCacheInterceptor } from '../interceptors/otp-stats-cache.interceptor'
import { OtpCronService } from '../otp.cron'
import { OtpService } from '../otp.service'
import { TimeoutInterceptor } from '../../interceptors'

/**
 * OTP Controller
 *
 * Endpoints públicos para gestión de OTPs:
 * - POST /api/otp/generate - Generar nuevo OTP
 * - POST /api/otp/verify - Verificar OTP
 * - POST /api/otp/resend - Reenviar OTP
 * - GET /api/otp/stats - Estadísticas (admin)
 * - POST /api/otp/cleanup - Limpiar expirados (admin)
 */
@ApiTags('OTP Authentication')
@Controller('api/otp')
@UseGuards(ThrottlerGuard, ApiKeyGuard)
export class OtpController {
	constructor(
		private readonly otpService: OtpService,
		private readonly otpCronService: OtpCronService,
	) {}

	/**
	 * Generar y enviar un nuevo OTP
	 */
	@Post('generate')
    @UseInterceptors(new TimeoutInterceptor(5000))
	@Public()
	@HttpCode(HttpStatus.OK)
	@ApiOperation({
		summary: 'Generate and send OTP',
		description:
			'Generates a new OTP code and sends it via email or SMS. Includes rate limiting and cooldown protection.',
	})
	@ApiOkResponse({
		description: 'OTP generated and sent successfully',
		type: GenerateOtpResponseDto,
	})
	@ApiBadRequestResponse({
		description: 'Invalid request parameters',
		type: ValidationErrorDto,
	})
	@ApiTooManyRequestsResponse({
		description: 'Rate limit exceeded or cooldown active',
		type: RateLimitErrorDto,
	})
	async generateOtp(
		@Body() generateOtpDto: GenerateOtpDto,
		@Ip() ip: string,
	): Promise<GenerateOtpResponseDto> {
		return this.otpService.generateOtp(generateOtpDto, ip)
	}

	/**
	 * Verificar un código OTP
	 */
	@Post('verify')
    @UseInterceptors(new TimeoutInterceptor(5000))
	@Public()
	@HttpCode(HttpStatus.OK)
	@ApiOperation({
		summary: 'Verify OTP code',
		description:
			'Verifies the OTP code entered by the user. Returns a session token on success.',
	})
	@ApiOkResponse({
		description: 'OTP verification result',
		type: VerifyOtpResponseDto,
	})
	@ApiBadRequestResponse({
		description: 'Invalid OTP format or parameters',
		type: ValidationErrorDto,
	})
	@ApiTooManyRequestsResponse({
		description: 'Too many failed attempts',
		type: ErrorResponseDto,
	})
	async verifyOtp(
		@Body() verifyOtpDto: VerifyOtpDto,
		@Ip() ip: string,
	): Promise<VerifyOtpResponseDto> {
		return this.otpService.verifyOtp(verifyOtpDto, ip)
	}

	/**
	 * Reenviar un OTP
	 */
	@Post('resend')
    @UseInterceptors(new TimeoutInterceptor(5000))
	@Public()
	@HttpCode(HttpStatus.OK)
	@ApiOperation({
		summary: 'Resend OTP code',
		description:
			'Generates and sends a new OTP code. Subject to cooldown and resend limits.',
	})
	@ApiOkResponse({
		description: 'OTP resent successfully',
		type: GenerateOtpResponseDto,
	})
	@ApiBadRequestResponse({
		description: 'Invalid request parameters',
		type: ValidationErrorDto,
	})
	@ApiTooManyRequestsResponse({
		description: 'Resend cooldown active or limit exceeded',
		type: RateLimitErrorDto,
	})
	async resendOtp(
		@Body() resendOtpDto: ResendOtpDto,
		@Ip() ip: string,
	): Promise<GenerateOtpResponseDto> {
		return this.otpService.resendOtp(resendOtpDto, ip)
	}

	// ============================================================================
	// ENDPOINTS ADMIN (requieren API Key)
	// ============================================================================

	/**
	 * Obtener estadísticas
	 */
	@Get('stats')
	@UseInterceptors(OtpStatsCacheInterceptor)
	@SkipAppValidation() // No requiere applicationId en body
	@HttpCode(HttpStatus.OK)
	@ApiOperation({
		summary: 'Get OTP statistics',
		description:
			'Admin endpoint. Retrieves statistical information about OTP usage. Can be filtered by applicationId.',
	})
	@ApiHeader({
		name: 'X-API-Key',
		description: 'Admin API Key',
		required: true,
		example: 'your-api-key-here',
	})
	@ApiSecurity('X-API-Key')
	@ApiOkResponse({
		description: 'Statistics retrieved successfully',
		type: OtpStatisticsResponseDto,
	})
	async getStatistics(
		@Query() query: OtpStatisticsQueryDto,
	): Promise<OtpStatisticsResponseDto> {
		return this.otpService.getStatistics(query.applicationId)
	}
	/**
	 * Limpiar OTPs expirados
	 */
	@Post('cleanup')
	@SkipAppValidation()
	@HttpCode(HttpStatus.OK)
	@ApiOperation({
		summary: 'Clean up expired OTPs',
		description:
			'Admin endpoint. Manually triggers cleanup of expired OTPs from Redis. Database records are preserved.',
	})
	@ApiHeader({
		name: 'X-API-Key',
		description: 'Admin API Key',
		required: true,
	})
	@ApiSecurity('X-API-Key')
	@ApiOkResponse({
		description: 'Cleanup completed successfully',
		type: CleanupResponseDto,
	})
	async cleanupExpired(): Promise<CleanupResponseDto> {
		return this.otpService.cleanupExpiredOtps()
	}
	/**
	 * Sincronizar Redis desde DB
	 */
	@Post('sync-redis')
	@SkipAppValidation()
	@HttpCode(HttpStatus.OK)
	@ApiOperation({
		summary: 'Sync Redis from database',
		description:
			'Admin endpoint. Rebuilds Redis cache from active OTPs in database. Useful after Redis restart.',
	})
	@ApiHeader({
		name: 'X-API-Key',
		description: 'Admin API Key',
		required: true,
	})
	@ApiSecurity('X-API-Key')
	@ApiOkResponse({
		description: 'Sync completed successfully',
	})
	async syncRedis(): Promise<{ success: boolean; syncedCount: number }> {
		const syncedCount = await this.otpCronService.syncRedisFromDatabase()
		return {
			success: true,
			syncedCount,
		}
	}

	/**
	 * Cleanup manual de Redis
	 */
	@Post('cleanup/manual')
	@SkipAppValidation()
	@HttpCode(HttpStatus.OK)
	@ApiOperation({
		summary: 'Trigger manual Redis cleanup',
		description:
			'Admin endpoint. Manually triggers Redis cleanup without waiting for scheduled cron job.',
	})
	@ApiHeader({
		name: 'X-API-Key',
		description: 'Admin API Key',
		required: true,
	})
	@ApiSecurity('X-API-Key')
	async manualCleanup() {
		return this.otpCronService.triggerManualCleanup()
	}

	/**
	 * Ver estado de cron jobs
	 */
	@Get('cron/status')
	@SkipAppValidation()
	@ApiOperation({
		summary: 'Get cron jobs status',
		description:
			'Admin endpoint. Returns the status of all scheduled cron jobs including last and next execution times.',
	})
	@ApiHeader({
		name: 'X-API-Key',
		description: 'Admin API Key',
		required: true,
	})
	@ApiSecurity('X-API-Key')
	async getCronStatus() {
		return this.otpCronService.getCronJobsStatus()
	}
}
