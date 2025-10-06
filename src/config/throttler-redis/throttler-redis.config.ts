import { registerAs } from '@nestjs/config'
type ThrottlerRedisConfig = {
	throttlers: Array<{
		name: string
		ttl: number
		limit: number
	}>
}

export default registerAs(
	'throttlerRedis',
	(): ThrottlerRedisConfig => ({
		throttlers: [
			{
				name: 'short',
				ttl: Number.parseInt(
					process.env.THROTTLER_SHORT_TTL ?? '1000',
					10,
				),
				limit: Number.parseInt(
					process.env.THROTTLER_SHORT_LIMIT ?? '3',
					10,
				),
			},
			{
				name: 'medium',
				ttl: Number.parseInt(
					process.env.THROTTLER_MEDIUM_TTL ?? '60000',
					10,
				),
				limit: Number.parseInt(
					process.env.THROTTLER_MEDIUM_LIMIT ?? '100',
					10,
				),
			},
		],
	}),
)
