import { ApiProperty } from '@nestjs/swagger'

/**
 * DTO para errores de validación (400 Bad Request)
 *
 * Se usa cuando:
 * - Los datos de entrada no cumplen las validaciones (class-validator)
 * - Formato de email inválido
 * - OTP no tiene 6 dígitos
 * - ApplicationId muy corto/largo
 */
export class ValidationErrorDto {
	@ApiProperty({
		description: 'HTTP status code',
		example: 400,
		type: Number,
	})
	statusCode!: number

	@ApiProperty({
		description: 'Array of validation error messages',
		example: [
			'OTP must be exactly 6 digits',
			'Invalid email format',
			'Application ID must be between 3 and 100 characters',
		],
		type: [String],
		isArray: true,
	})
	message!: string[]

	@ApiProperty({
		description: 'Error type',
		example: 'Bad Request',
		type: String,
	})
	error!: string

	constructor(partial: Partial<ValidationErrorDto>) {
		Object.assign(this, partial)
	}
}

/**
 * DTO para errores genéricos del sistema
 *
 * Se usa cuando:
 * - Rate limit excedido (429)
 * - OTP bloqueado temporalmente (429)
 * - Application ID no autorizado (403)
 * - Errores internos del servidor (500)
 */
export class ErrorResponseDto {
	@ApiProperty({
		description: 'Indicates operation failure',
		example: false,
		type: Boolean,
	})
	success!: boolean

	@ApiProperty({
		description: 'Error message for the user',
		example: 'Too many requests. Please try again later.',
		type: String,
	})
	message!: string

	@ApiProperty({
		description: 'HTTP status code',
		example: 429,
		type: Number,
	})
	statusCode!: number

	@ApiProperty({
		description: 'Error code for programmatic handling',
		example: 'RATE_LIMIT_EXCEEDED',
		type: String,
	})
	errorCode!: string

	@ApiProperty({
		description: 'ISO timestamp of when the error occurred',
		example: '2025-10-05T14:30:00.000Z',
		type: String,
	})
	timestamp!: string

	constructor(partial: Partial<ErrorResponseDto>) {
		Object.assign(this, partial)
	}
}

/**
 * DTO para errores de rate limiting específicamente
 * Extiende ErrorResponseDto con información adicional
 */
export class RateLimitErrorDto extends ErrorResponseDto {
	@ApiProperty({
		description: 'Number of seconds until rate limit resets',
		example: 450,
		type: Number,
	})
	retryAfter!: number

	constructor(partial: Partial<RateLimitErrorDto>) {
		super(partial)
		Object.assign(this, partial)
	}
}

/**
 * DTO para errores de OTP bloqueado
 */
export class BlockedOtpErrorDto extends ErrorResponseDto {
	@ApiProperty({
		description: 'ISO timestamp when the block expires',
		example: '2025-10-05T14:45:00.000Z',
		type: String,
	})
	blockedUntil!: string

	constructor(partial: Partial<BlockedOtpErrorDto>) {
		super(partial)
		Object.assign(this, partial)
	}
}
