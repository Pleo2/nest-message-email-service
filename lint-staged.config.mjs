const config = {
	// Removed TS compile and Vitest from pre-commit to speed up commits and avoid CI-like checks locally
	'*.{js,jsx,mjs,cjs,ts,tsx,mts}': ['node --run lint:file'],
	'*.{md,json}': 'prettier --write',
	'*': 'node --run typos',
	'*.{yml,yaml}': 'node --run lint:yaml',
}

export default config
