import { ApiPropertyOptional } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { IsOptional, IsString, Length, Matches } from 'class-validator'

/**
 * DTO para query parameters del endpoint GET /api/otp/stats
 *
 * Ejemplo de uso:
 * GET /api/otp/stats?applicationId=medusajs-storefront
 *
 * Permite filtrar estadísticas por aplicación específica
 */
export class OtpStatisticsQueryDto {
	@ApiPropertyOptional({
		description: 'Filter statistics by specific application ID',
		example: 'medusajs-storefront',
		type: String,
	})
	@IsOptional()
	@IsString()
	@Length(3, 100, {
		message: 'Application ID must be between 3 and 100 characters',
	})
	@Transform(({ value }: { value: string }) => value.trim().toLowerCase())
	@Matches(/^[a-z0-9-_]+$/, {
		message:
			'Application ID can only contain lowercase letters, numbers, hyphens, and underscores',
	})
	applicationId?: string
}
