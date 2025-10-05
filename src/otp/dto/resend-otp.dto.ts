import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import {
	IsEmail,
	IsIn,
	IsNotEmpty,
	IsOptional,
	IsString,
	Length,
	Matches,
	ValidateIf,
} from 'class-validator'

/**
 * DTO para reenviar un OTP
 * Similar a GenerateOtpDto pero usado explícitamente para reenvíos
 */
export class ResendOtpDto {
	/**
	 * Email o número de teléfono del destinatario
	 */
	@ApiProperty({
		description: 'Email address or phone number of the recipient',
		example: 'user@example.com',
		type: String,
	})
	@IsNotEmpty({ message: 'Identifier is required' })
	@IsString()
	@Transform(({ value }: { value: string }) => value.trim().toLowerCase())
	@ValidateIf((o: ResendOtpDto) => o.type === 'email')
	@IsEmail({}, { message: 'Invalid email format' })
	@ValidateIf((o: ResendOtpDto) => o.type === 'sms')
	@Matches(/^\+?[1-9]\d{1,14}$/, {
		message: 'Invalid phone number format. Use E.164 format',
	})
	identifier!: string

	/**
	 * Tipo de canal de entrega
	 */
	@ApiProperty({
		description: 'Delivery channel for the OTP resend',
		enum: ['email', 'sms'],
		example: 'email',
	})
	@IsNotEmpty({ message: 'Type is required' })
	@IsIn(['email', 'sms'], { message: 'Type must be either email or sms' })
	type!: 'email' | 'sms'

	/**
	 * Identificador de aplicación
	 */
	@ApiProperty({
		description: 'Application identifier',
		example: 'medusajs-storefront',
	})
	@IsNotEmpty({ message: 'Application ID is required' })
	@IsString()
	@Length(3, 100)
	@Transform(({ value }: { value: string }) => value.trim().toLowerCase())
	@Matches(/^[a-z0-9-_]+$/, {
		message:
			'Application ID can only contain lowercase letters, numbers, hyphens, and underscores',
	})
	applicationId!: string

	/**
	 * Nombre de aplicación (opcional)
	 */
	@ApiPropertyOptional({
		description: 'Application name',
		example: 'MedusaJS Storefront',
	})
	@IsOptional()
	@IsString()
	@Length(3, 255)
	@Transform(({ value }: { value: string }) => value.trim())
	applicationName?: string
}
