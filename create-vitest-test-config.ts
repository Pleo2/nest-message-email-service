import { loadEnv } from 'vite'
import { InlineConfig } from 'vitest'
import { fileURLToPath } from 'node:url'

export const createVitestTestConfig = (testingType: string): InlineConfig => {
	return {
		root: './',
		globals: true,
		isolate: false,
		passWithNoTests: true,
		include: [`tests/${testingType}/**/*.test.ts`],
		env: loadEnv('test', process.cwd(), ''),
		resolve: {
			alias: {
				'@nestjs-redis/kit': fileURLToPath(
					new URL('./tests/utils/redis-kit.stub.ts', import.meta.url),
				),
			},
		},
		coverage: {
			provider: 'istanbul',
			reporter: ['text', 'json', 'html'],
			reportsDirectory: `coverage/${testingType}`,
			include: ['src/**/*.ts'],
			exclude: ['src/main.ts'],
		},
	}
}
