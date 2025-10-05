import { registerAs } from '@nestjs/config'

export default registerAs('database', () => {
	return {
		type: process.env.DB_TYPE ?? 'postgres',
		host: process.env.DB_HOST ?? 'localhost',
		port: Number.parseInt(process.env.DB_PORT ?? '5432', 10),
		username: process.env.DB_USERNAME ?? 'postgres',
		password: process.env.DB_PASSWORD ?? '',
		database: process.env.DB_NAME ?? 'test',
		synchronize: process.env.DB_SYNCHRONIZE === 'true',
		logging: process.env.DB_LOGGING === 'true',
		autoLoadEntities: true,
	}
})
