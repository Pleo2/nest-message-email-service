import type { UserConfig } from 'vitest'

import { loadEnv } from 'vite'

export const createVitestTestConfig = (testingType: string): UserConfig => {
	const loaded = loadEnv('test', process.cwd(), '')
	return {
		globals: true,
		isolate: false,
		passWithNoTests: true,
		include: [`tests/${testingType}/**/*.test.ts`],
		env: {
			...loaded,
			NODE_ENV: 'test',
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
