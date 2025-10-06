import { SetMetadata } from '@nestjs/common'

/**
 * Public Decorator
 *
 * Marca un endpoint como público (sin autenticación)
 * Hace que ApiKeyGuard lo ignore
 *
 * Uso:
 * @Public()
 * @Post('generate')
 * async generateOtp() { ... }
 */
export const IS_PUBLIC_KEY = 'isPublic'
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true)
