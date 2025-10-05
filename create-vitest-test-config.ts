import type { UserConfig } from 'vitest'

import { loadEnv } from 'vite'

export type TestConfig = NonNullable<UserConfig['test']>

export const createVitestTestConfig = (testingType: string): TestConfig => {
	return {
		globals: true,
		isolate: false,
		passWithNoTests: true,
		include: [`tests/${testingType}/**/*.test.ts`],
		env: loadEnv('test', process.cwd(), ''),
		coverage: {
			provider: 'istanbul',
			reporter: ['text', 'json', 'html'],
			reportsDirectory: `coverage/${testingType}`,
			include: ['src/**/*.ts'],
			exclude: ['src/main.ts'],
		},
	}
}
