import { ConfigModule, ConfigService } from '@nestjs/config'
import { RedisConnectionConfig, RedisModule } from '@nestjs-redis/kit'

export const redisImports = [
	RedisModule.forRootAsync({
		imports: [ConfigModule],
		inject: [ConfigService],
		useFactory: (configService: ConfigService) =>
			({
				type: 'client',
				options: {
					host: configService.get<string>('redis.host'),
					port: configService.get<number>('redis.port'),
					password:
						configService.get<string>('redis.password') ??
						undefined,
					db: configService.get<number>('redis.db'),
				},
			}) as unknown as
				| RedisConnectionConfig
				| Promise<RedisConnectionConfig>,
	}),
]
