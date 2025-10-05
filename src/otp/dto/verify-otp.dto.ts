import { ApiProperty } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { IsNotEmpty, IsString, Length, Matches } from 'class-validator'

/**
 * DTO para verificar un OTP ingresado por el usuario
 * Valida formato exacto del código de 6 dígitos
 */
export class VerifyOtpDto {
	/**
	 * Email o número de teléfono (debe coincidir con el usado en generación)
	 */
	@ApiProperty({
		description: 'Email address or phone number used during OTP generation',
		example: 'user@example.com',
		type: String,
	})
	@IsNotEmpty({ message: 'Identifier is required' })
	@IsString()
	@Transform(({ value }: { value: string }) => value.trim().toLowerCase())
	identifier!: string

	/**
	 * Código OTP de 6 dígitos a verificar
	 * Solo acepta números, exactamente 6 caracteres
	 */
	@ApiProperty({
		description: '6-digit OTP code',
		example: '123456',
		minLength: 6,
		maxLength: 6,
		pattern: '^[0-9]{6}$',
	})
	@IsNotEmpty({ message: 'OTP code is required' })
	@IsString()
	@Length(6, 6, { message: 'OTP must be exactly 6 digits' })
	@Matches(/^[0-9]{6}$/, {
		message: 'OTP must contain only numeric digits',
	})
	@Transform(({ value }: { value: string }) => value.trim())
	otp!: string

	/**
	 * Identificador de aplicación (debe coincidir con generación)
	 */
	@ApiProperty({
		description: 'Application identifier used during OTP generation',
		example: 'medusajs-storefront',
	})
	@IsNotEmpty({ message: 'Application ID is required' })
	@IsString()
	@Transform(({ value }: { value: string }) => value.trim().toLowerCase())
	applicationId!: string
}
