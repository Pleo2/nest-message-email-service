import {
	CallHandler,
	ExecutionContext,
	Injectable,
	NestInterceptor,
} from '@nestjs/common'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'

/**
 * Sanitize Interceptor
 *
 * Elimina campos sensibles de las respuestas:
 * - password, hashedPassword
 * - hashedOtp (solo en OTP entity)
 * - refreshToken
 * - apiKey, secret
 * - creditCard, ssn
 *
 * Útil para:
 * - Prevenir leaks de información sensible
 * - Compliance (GDPR, PCI-DSS)
 * - Seguridad
 */
@Injectable()
export class SanitizeInterceptor implements NestInterceptor {
	// Campos que siempre se deben eliminar
	private readonly SENSITIVE_FIELDS = [
		'password',
		'hashedPassword',
		'hashedOtp',
		'refreshToken',
		'apiKey',
		'secret',
		'privateKey',
		'accessToken',
		'creditCard',
		'cvv',
		'ssn',
		'pin',
	]

	intercept(
		_context: ExecutionContext,
		next: CallHandler,
	): Observable<unknown> {
		return next.handle().pipe(
			map((data: unknown) => {
				if (data == undefined) {
					return data
				}
				return this.sanitize(data)
			}),
		)
	}

	/**
	 * Sanitiza un objeto recursivamente
	 */
	private sanitize(value: unknown): unknown {
		// Si no es objeto, retornar tal cual
		if (value === null || typeof value !== 'object') {
			return value
		}

		// Sí es array, sanitizar cada elemento
		if (Array.isArray(value)) {
			return value.map(item => this.sanitize(item))
		}

		// Si es objeto, clonar y sanitizar cada propiedad
		// eslint-disable-next-line unicorn/no-array-reduce
		return Object.entries(value as Record<string, unknown>).reduce<
			Record<string, unknown>
		>((acc, [key, currentValue]) => {
			// Si el campo es sensible, no incluirlo
			if (this.SENSITIVE_FIELDS.includes(key)) {
				return acc
			}

			// Si el valor es objeto o array, sanitizar recursivamente
			acc[key] = this.sanitize(currentValue)
			return acc
		}, {})
	}
}
