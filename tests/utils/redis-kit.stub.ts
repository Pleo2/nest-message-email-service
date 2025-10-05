// Minimal stub of @nestjs-redis/kit for Vitest
// Provides a RedisModule with forRootAsync returning a DynamicModule-like object.
export class RedisModule {
	static forRootAsync(): any {
		return { module: RedisModule }
	}
}
