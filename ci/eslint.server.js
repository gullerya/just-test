import { defineConfig } from 'eslint/config';
import js from '@eslint/js';
import globals from 'globals';

const effectiveConfig = {
	extends: [js.configs.recommended],
	languageOptions: {
		ecmaVersion: 2022,
		sourceType: 'module',
		globals: {
			...globals.node
		}
	},
	files: ['ci/**', 'src/common/**', 'src/coverage/**', 'src/server/**', 'src/testing/**', 'tests/**'],
	rules: {
		'no-shadow': 'error',
		semi: 'error',
		quotes: ['error', 'single', {
			avoidEscape: true,
			allowTemplateLiterals: true
		}]
	}
};

export default defineConfig([
	effectiveConfig
]);