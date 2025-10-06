import {
	CallHandler,
	ExecutionContext,
	Inject,
	Injectable,
	NestInterceptor,
	Optional,
	RequestTimeoutException,
} from '@nestjs/common'
import { Observable, throwError, TimeoutError } from 'rxjs'
import { catchError, timeout } from 'rxjs/operators'

export const TIMEOUT_INTERCEPTOR_MS = Symbol('TIMEOUT_INTERCEPTOR_MS')
const DEFAULT_TIMEOUT_MS = 30_000

/**
 * Timeout Interceptor
 *
 * Establece un timeout máximo para requests
 * Por defecto: 30 segundos
 *
 * Si una request tarda más, se cancela y retorna error 408
 *
 * Útil para:
 * - Prevenir requests que nunca terminan
 * - Liberar recursos (memoria, conexiones DB)
 * - Mejorar UX (usuario no espera eternamente)
 *
 * Uso:
 * @UseInterceptors(new TimeoutInterceptor(5000)) // 5 segundos
 */
@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
	private readonly timeoutMs: number

	constructor(
		@Optional()
		@Inject(TIMEOUT_INTERCEPTOR_MS)
		timeoutMs?: number,
	) {
		this.timeoutMs = timeoutMs ?? DEFAULT_TIMEOUT_MS
	}

	intercept(
		_context: ExecutionContext,
		next: CallHandler<unknown>,
	): Observable<unknown> {
		return next.handle().pipe(
			timeout(this.timeoutMs),
			catchError((err: unknown) => {
				if (err instanceof TimeoutError) {
					return throwError(
						() =>
							new RequestTimeoutException({
								success: false,
								message: `Request timeout after ${this.timeoutMs}ms`,
								errorCode: 'REQUEST_TIMEOUT',
								statusCode: 408,
							}),
					)
				}
				return throwError(() =>
					err instanceof Error ? err : new Error(String(err)),
				)
			}),
		)
	}
}
