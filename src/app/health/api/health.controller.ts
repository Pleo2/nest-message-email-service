import { Controller, Get, HttpCode, Inject, Logger } from '@nestjs/common'

import { SkipAppValidation } from '@/src/decorators'

@Controller('health')
export class HealthController {
	constructor(@Inject(Logger) private readonly logger: Logger) {}

	@Get()
	@HttpCode(200)
	@SkipAppValidation()
	run() {
		this.logger.log('Health endpoint called!')
		return { status: 'ok' }
	}
}
