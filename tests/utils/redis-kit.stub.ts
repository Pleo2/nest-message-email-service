// Minimal stub of @nestjs-redis/kit for Vitest
// Provides a RedisModule with forRootAsync returning a DynamicModule-like object
// and a no-op InjectRedis decorator for constructor injection in tests.

export class RedisModule {
	static forRootAsync(): any {
		return { module: RedisModule }
	}
}

export function InjectRedis(): ParameterDecorator {
	// No-op decorator used only in tests to satisfy Nest DI
	return () => {}
}
