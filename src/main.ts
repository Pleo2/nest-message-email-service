import 'reflect-metadata'

import { Logger, ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import {
	FastifyAdapter,
	NestFastifyApplication,
} from '@nestjs/platform-fastify'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'

import { AppModule } from '@/app/app.module'

const GLOBAL_PREFIX = 'api'
const SWAGGER_PATH = 'doc'

async function bootstrap() {
	const app = await NestFactory.create<NestFastifyApplication>(
		AppModule,
		new FastifyAdapter(),
	)

	app.setGlobalPrefix(GLOBAL_PREFIX)

	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true,
			transform: true,
			forbidNonWhitelisted: true,
			transformOptions: {
				enableImplicitConversion: true,
			},
		}),
	)

	const config = new DocumentBuilder()
		.setTitle('OTP Authentication Microservice')
		.setDescription(
			`
## Secure OTP-based authentication API

### Features
- Email and SMS OTP delivery
- Rate limiting and cooldown protection
- Multi-application support
- Redis caching for performance
- Admin endpoints protected with API Key

### Authentication
- **Public endpoints**: No authentication required (generate, verify, resend)
- **Admin endpoints**: Require API Key via \`X-API-Key\` header

### Usage
1. Generate OTP: \`POST /api/otp/generate\`
2. User receives OTP via email/SMS
3. Verify OTP: \`POST /api/otp/verify\`
4. Get session token on success

### Admin Endpoints
Protected with API Key. Set \`X-API-Key\` header with your admin key.
		`,
		)
		.setVersion('1.0')
		.addTag('OTP Authentication', 'Public OTP generation and verification')
		.addTag('Admin', 'Admin endpoints (require API Key)')
		.addApiKey(
			{
				type: 'apiKey',
				name: 'X-API-Key',
				in: 'header',
				description: 'Admin API Key for protected endpoints',
			},
			'X-API-Key',
		)
		.addServer('http://localhost:3000', 'Development')
		.addServer('https://api.production.com', 'Production')
		.build()

	const document = SwaggerModule.createDocument(app, config)
	SwaggerModule.setup('api/docs', app, document, {
		swaggerOptions: {
			persistAuthorization: true,
			tagsSorter: 'alpha',
			operationsSorter: 'alpha',
		},
	})

	const documentFactory = () => SwaggerModule.createDocument(app, config)
	SwaggerModule.setup(
		`/${GLOBAL_PREFIX}/${SWAGGER_PATH}`,
		app,
		documentFactory,
	)

	const configService = app.get(ConfigService)
	const port = configService.get<number>('PORT', 3000)

	await app.listen(port, '0.0.0.0')

	const logger = app.get(Logger)
	const actualUrl = `http://localhost:${port}`
	logger.log(`App is ready and listening on port ${port} 🚀`)
	logger.log(`Swagger UI available at ${actualUrl}/${GLOBAL_PREFIX}/doc 📄`)
}

bootstrap().catch(handleError)

function handleError(error: unknown) {
	// eslint-disable-next-line no-console
	console.error(error)
	// eslint-disable-next-line unicorn/no-process-exit
	process.exit(1)
}

process.on('uncaughtException', handleError)
