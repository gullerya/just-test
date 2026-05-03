import { defineConfig } from 'eslint/config';
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const effectiveConfig = {
	extends: [js.configs.recommended, ...tseslint.configs.recommended],
	languageOptions: {
		parser: tseslint.parser,
		ecmaVersion: 2022,
		sourceType: 'module',
		globals: {
			...globals.browser,
			...globals.node
		}
	},
	files: ['src/common/**/*.{js,ts}', 'src/logging/**/*.{js,ts}', 'src/runner/**/*.{js,ts}', 'src/ui/**/*.{js,ts}', 'tests/**/*.{js,ts}'],
	rules: {
		'no-shadow': 'error',
		semi: 'error',
		quotes: ['error', 'single', {
			avoidEscape: true,
			allowTemplateLiterals: true
		}],
		curly: ['error', 'all'],
		'@typescript-eslint/no-explicit-any': 'warn',
		'@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }]
	}
};

export default defineConfig([
	{ ignores: ['bin/**'] },
	effectiveConfig,
	{
		files: ['tests/**/*.{js,ts}'],
		rules: {
			'@typescript-eslint/no-explicit-any': 'off'
		}
	},
	{
		//	src/ui intentionally opts out of TS checking via @ts-nocheck
		//	(web components using dynamically-resolved browser imports)
		files: ['src/ui/**/*.{js,ts}'],
		rules: {
			'@typescript-eslint/ban-ts-comment': 'off'
		}
	}
]);