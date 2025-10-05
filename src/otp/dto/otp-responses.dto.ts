import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

/**
 * Respuesta estándar para generación/reenvío de OTP
 */
export class GenerateOtpResponseDto {
	@ApiProperty({
		description: 'Indicates if the operation was successful',
		example: true,
		type: Boolean,
	})
	success!: boolean

	@ApiProperty({
		description: 'Descriptive message about the operation result',
		example: 'OTP generated and sent successfully',
		type: String,
	})
	message!: string

	@ApiPropertyOptional({
		description: 'Timestamp when the OTP will expire (ISO 8601 format)',
		example: '2025-10-05T14:25:00.000Z',
		type: Date,
	})
	expiresAt?: Date

	@ApiPropertyOptional({
		description: 'Timestamp when resend will be allowed (ISO 8601 format)',
		example: '2025-10-05T14:16:00.000Z',
		type: Date,
	})
	resendAllowedAt?: Date

	constructor(partial: Partial<GenerateOtpResponseDto>) {
		Object.assign(this, partial)
	}
}

/**
 * Respuesta para verificación de OTP
 */
export class VerifyOtpResponseDto {
	@ApiProperty({
		description: 'Indicates if verification was successful',
		example: true,
		type: Boolean,
	})
	success!: boolean

	@ApiProperty({
		description: 'Descriptive message about the verification result',
		example: 'OTP verified successfully',
		type: String,
	})
	message!: string

	@ApiPropertyOptional({
		description:
			'Session token generated after successful verification (Base64 encoded or JWT)',
		example:
			'eyJpZGVudGlmaWVyIjoidXNlckBleGFtcGxlLmNvbSIsImFwcGxpY2F0aW9uSWQiOiJtZWR1c2Fqcy1zdG9yZWZyb250IiwidGltZXN0YW1wIjoxNzI4MTQ0MDAwMDAwLCJ2ZXJpZmllZCI6dHJ1ZX0=',
		type: String,
	})
	token?: string

	@ApiPropertyOptional({
		description:
			'Number of verification attempts remaining (only on failure)',
		example: 2,
		type: Number,
		minimum: 0,
		maximum: 3,
	})
	remainingAttempts?: number

	constructor(partial: Partial<VerifyOtpResponseDto>) {
		Object.assign(this, partial)
	}
}

/**
 * Respuesta para estadísticas del servicio OTP
 */
export class OtpStatisticsResponseDto {
	@ApiProperty({
		description: 'Total number of OTPs created in the system',
		example: 1500,
		type: Number,
	})
	totalOtps!: number

	@ApiProperty({
		description:
			'Number of currently active OTPs (not expired, not verified)',
		example: 45,
		type: Number,
	})
	activeOtps!: number

	@ApiProperty({
		description: 'Number of successfully verified OTPs',
		example: 1200,
		type: Number,
	})
	verifiedOtps!: number

	@ApiProperty({
		description:
			'Number of blocked OTPs due to security reasons (max attempts exceeded)',
		example: 23,
		type: Number,
	})
	blockedOtps!: number

	@ApiProperty({
		description: 'Number of expired OTPs pending cleanup',
		example: 232,
		type: Number,
	})
	cleanupNeeded!: number

	@ApiPropertyOptional({
		description: 'Application ID filter used (if any)',
		example: 'medusajs-storefront',
		type: String,
	})
	applicationId?: string

	constructor(partial: Partial<OtpStatisticsResponseDto>) {
		Object.assign(this, partial)
	}
}

/**
 * Respuesta para operación de cleanup manual
 */
export class CleanupResponseDto {
	@ApiProperty({
		description: 'Indicates if cleanup was successful',
		example: true,
		type: Boolean,
	})
	success!: boolean

	@ApiProperty({
		description: 'Message about cleanup results',
		example: 'Successfully cleaned up 150 expired OTPs',
		type: String,
	})
	message!: string

	@ApiPropertyOptional({
		description: 'Number of OTPs that were cleaned up',
		example: 150,
		type: Number,
	})
	cleanedCount?: number

	constructor(partial: Partial<CleanupResponseDto>) {
		Object.assign(this, partial)
	}
}
