import type { RedisClientType } from 'redis'

import { InjectRedis } from '@nestjs-redis/kit'
import { Injectable } from '@nestjs/common'

import { CacheInterceptor } from '@/src/interceptors'

@Injectable()
export class OtpStatsCacheInterceptor extends CacheInterceptor {
	constructor(@InjectRedis() redis: RedisClientType) {
		super(redis, 600)
	}
}
