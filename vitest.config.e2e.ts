import swc from 'unplugin-swc'
import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'
import { dirname, resolve as pathResolve } from 'node:path'

import { createVitestTestConfig } from './create-vitest-test-config'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default defineConfig({
	resolve: {
		alias: {
			'@nestjs-redis/kit': pathResolve(
				__dirname,
				'tests/utils/redis-kit.stub.ts',
			),
		},
	},
	test: createVitestTestConfig('e2e'),
	plugins: [swc.vite()],
})
