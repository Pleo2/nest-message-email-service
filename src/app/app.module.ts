import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'

import { HealthModule } from '@/app/health/health.module'

import { LoggerModule } from '@/shared/logger/logger.module'

import { UserModule } from '@/contexts/users/user.module'

import { validate } from '../common/env.validation'
import configuration from '../config/configuration'
import { databaseImports } from '../config/database/database.imports'
import { redisImports } from '../config/redis/redis.imports'

const isTest = process.env.NODE_ENV === 'test'

const coreImports = [
	ConfigModule.forRoot({
		isGlobal: true,
		load: configuration,
		envFilePath: isTest ? ['.env.test', '.env'] : ['.env'],
		validate,
		validationOptions: {
			abortEarly: false,
			allowUnknown: true,
		},
	}),
	LoggerModule,
	HealthModule,
	UserModule,
]

@Module({
	imports: isTest
		? coreImports
		: [...coreImports, ...databaseImports, ...redisImports],
})
export class AppModule {}
