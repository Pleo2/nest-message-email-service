import { SetMetadata } from '@nestjs/common'

/**
 * Skip App Validation Decorator
 *
 * Marca un endpoint para que NO valide applicationId
 * Útil para endpoints admin que no necesitan applicationId
 *
 * Uso:
 * @SkipAppValidation()
 * @Get('stats')
 * async getStatistics() { ... }
 */
export const SKIP_APP_VALIDATION_KEY = 'skipAppValidation'
export const SkipAppValidation = () =>
	SetMetadata(SKIP_APP_VALIDATION_KEY, true)
