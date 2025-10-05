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
 * DTO para generar un nuevo OTP
 * Incluye validaciones condicionales según el tipo (email/sms)
 */
export class GenerateOtpDto {
	/**
	 * Email o número de teléfono del destinatario
	 * La validación es condicional según el campo 'type'
	 */
	@ApiProperty({
		description: 'Email address or phone number of the recipient',
		example: 'user@example.com',
		type: String,
	})
	@IsNotEmpty({ message: 'Identifier is required' })
	@IsString()
	@Transform(({ value }: { value: string }) => value.trim().toLowerCase()) // Normalizar email
	@ValidateIf((o: GenerateOtpDto) => o.type === 'email')
	@IsEmail({}, { message: 'Invalid email format' })
	@ValidateIf((o: GenerateOtpDto) => o.type === 'sms')
	@Matches(/^\+?[1-9]\d{1,14}$/, {
		message:
			'Invalid phone number format. Use E.164 format (e.g., +584121234567)',
	})
	identifier!: string

	/**
	 * Tipo de canal de entrega del OTP
	 * Solo acepta 'email' o 'sms'
	 */
	@ApiProperty({
		description: 'Delivery channel for the OTP',
		enum: ['email', 'sms'],
		example: 'email',
	})
	@IsNotEmpty({ message: 'Type is required' })
	@IsIn(['email', 'sms'], { message: 'Type must be either email or sms' })
	type!: 'email' | 'sms'

	/**
	 * Identificador único de la aplicación solicitante
	 * Debe estar registrado en ALLOWED_APPLICATIONS
	 */
	@ApiProperty({
		description: 'Unique identifier of the requesting application',
		example: 'medusajs-storefront',
		minLength: 3,
		maxLength: 100,
	})
	@IsNotEmpty({ message: 'Application ID is required' })
	@IsString()
	@Length(3, 100, {
		message: 'Application ID must be between 3 and 100 characters',
	})
	@Transform(({ value }: { value: string }) => value.trim().toLowerCase())
	@Matches(/^[a-z0-9-_]+$/, {
		message:
			'Application ID can only contain lowercase letters, numbers, hyphens, and underscores',
	})
	applicationId!: string

	/**
	 * Nombre legible de la aplicación (opcional)
	 * Usado para auditoría y reporting
	 */
	@ApiPropertyOptional({
		description: 'Human-readable name of the application',
		example: 'MedusaJS Storefront',
		minLength: 3,
		maxLength: 255,
	})
	@IsOptional()
	@IsString()
	@Length(3, 255, {
		message: 'Application name must be between 3 and 255 characters',
	})
	@Transform(({ value }: { value: string }) => value.trim())
	applicationName?: string
}
