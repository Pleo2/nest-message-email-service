import { ConfigModule, ConfigService } from '@nestjs/config'
import { ThrottlerModule, ThrottlerModuleOptions } from '@nestjs/throttler'
import { ThrottlerStorageRedisService } from 'nestjs-throttler-storage-redis'

export const throttlerRedisImports = [
	ThrottlerModule.forRootAsync({
		imports: [ConfigModule],
		inject: [ConfigService],
		useFactory: (configService: ConfigService): ThrottlerModuleOptions => {
			type NamedThrottler = {
				name: string
				ttl: number
				limit: number
			}

			const defaultThrottlers: NamedThrottler[] = [
				{ name: 'short', ttl: 1000, limit: 3 },
				{ name: 'medium', ttl: 60000, limit: 100 },
			]

			const throttlers =
				configService.get<NamedThrottler[]>(
					'throttlerRedis.throttlers',
				) ?? defaultThrottlers

			return {
				throttlers,
				storage: new ThrottlerStorageRedisService({
					host: configService.get<string>('redis.host', 'localhost'),
					port: configService.get<number>('redis.port', 6379),
					password:
						configService.get<string | undefined>(
							'redis.password',
						) ?? undefined,
					db: configService.get<number>('redis.db', 0),
				}),
			}
		},
	}),
]
