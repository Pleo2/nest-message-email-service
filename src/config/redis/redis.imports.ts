import { ConfigModule, ConfigService } from '@nestjs/config'
import { RedisModule } from '@nestjs-redis/kit'

export const redisImports = [
	RedisModule.forRootAsync({
		imports: [ConfigModule],
		inject: [ConfigService],
		useFactory: (configService: ConfigService) => ({
			options: {
				host: configService.get<string>('redis.host'),
				port: configService.get<number>('redis.port'),
				password: configService.get<string>('redis.password'),
				db: configService.get<number>('redis.db'),
			},
		}),
	}),
]
