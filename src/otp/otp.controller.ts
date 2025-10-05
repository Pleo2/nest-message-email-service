// src/modules/otp/otp.controller.ts
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
} from '@nestjs/common'
import {
	ApiBadRequestResponse,
	ApiOkResponse,
	ApiOperation,
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
} from './dto'
import { OtpService } from './otp.service'

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
@UseGuards(ThrottlerGuard)
export class OtpController {
	constructor(private readonly otpService: OtpService) {}

	/**
	 * Generar y enviar un nuevo OTP
	 */
	@Post('generate')
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

	/**
	 * Obtener estadísticas del servicio OTP (Admin)
	 */
	@Get('stats')
	@HttpCode(HttpStatus.OK)
	@ApiOperation({
		summary: 'Get OTP statistics',
		description:
			'Retrieves statistical information about OTP usage. Can be filtered by application ID.',
	})
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
	 * Limpiar OTPs expirados (Admin)
	 */
	@Post('cleanup')
	@HttpCode(HttpStatus.OK)
	@ApiOperation({
		summary: 'Clean up expired OTPs',
		description:
			'Manually triggers cleanup of expired OTPs from database and cache.',
	})
	@ApiOkResponse({
		description: 'Cleanup completed successfully',
		type: CleanupResponseDto,
	})
	async cleanupExpired(): Promise<CleanupResponseDto> {
		return this.otpService.cleanupExpiredOtps()
	}
}
