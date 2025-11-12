import { defineConfig } from 'eslint/config';
import js from '@eslint/js';
import globals from 'globals';

const effectiveConfig = {
	extends: [js.configs.recommended],
	languageOptions: {
		ecmaVersion: 2022,
		sourceType: 'module',
		globals: {
			...globals.browser,
			...globals.node
		}
	},
	rules: {
		'no-shadow': [
			'error'
		],
		semi: [
			'error',
			'always'
		]
	}
};

export default defineConfig([
	effectiveConfig
]);