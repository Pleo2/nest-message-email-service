import {
	BadRequestException,
	CanActivate,
	ExecutionContext,
	ForbiddenException,
	Injectable,
	Logger,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Reflector } from '@nestjs/core'
import { FastifyRequest } from 'fastify'

import { SKIP_APP_VALIDATION_KEY } from '@/src/decorators'

/**
 * Application Validation Guard
 *
 * Valida que el applicationId en el body esté en la whitelist
 * Se puede skipear con @SkipAppValidation()
 *
 * Uso:
 * - Se aplica GLOBALMENTE en AppModule
 * - Valida todos los endpoints excepto los marcados con @SkipAppValidation()
 */
@Injectable()
export class ApplicationValidationGuard implements CanActivate {
	private readonly logger = new Logger(ApplicationValidationGuard.name)
	private readonly allowedApps: string[]

	constructor(
		private configService: ConfigService,
		private reflector: Reflector,
	) {
		const appsString = this.configService.get<string>(
			'ALLOWED_APPLICATIONS',
			'',
		)
		this.allowedApps = appsString
			.split(',')
			.map(app => app.trim())
			.filter(app => app.length > 0)

		if (this.allowedApps.length === 0) {
			this.logger.warn(
				'⚠️  ALLOWED_APPLICATIONS not configured. All apps will be allowed.',
			)
		} else {
			this.logger.log(
				`✅ Allowed applications: ${this.allowedApps.join(', ')}`,
			)
		}
	}

	canActivate(context: ExecutionContext): boolean {
		// Verificar si se debe skipear la validación
		const skipValidation = this.reflector.getAllAndOverride<boolean>(
			SKIP_APP_VALIDATION_KEY,
			[context.getHandler(), context.getClass()],
		)

		if (skipValidation) {
			return true
		}

		// Si no hay apps configuradas, permitir todo (modo desarrollo)
		if (this.allowedApps.length === 0) {
			return true
		}

		const request = context.switchToHttp().getRequest<FastifyRequest>()
		const body = request.body as any

		// Validar que exista applicationId
		if (!body?.applicationId) {
			throw new BadRequestException({
				success: false,
				message: 'applicationId is required in request body',
				errorCode: 'MISSING_APPLICATION_ID',
				statusCode: 400,
			})
		}

		// Validar que esté en la whitelist
		if (!this.allowedApps.includes(body.applicationId)) {
			this.logger.warn(
				`🚫 Unauthorized application attempt: ${body.applicationId}`,
			)

			throw new ForbiddenException({
				success: false,
				message: `Application '${body.applicationId}' is not authorized to use this service`,
				errorCode: 'UNAUTHORIZED_APPLICATION',
				statusCode: 403,
				allowedApplications: this.allowedApps, // Útil para debug
			})
		}

		return true
	}
}
