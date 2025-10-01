import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';

export default [
    js.configs.recommended,
    {
        files: ['**/*.ts', '**/*.tsx'],
        languageOptions: {
            parser: typescriptParser,
            parserOptions: {
                ecmaVersion: 2022,
                sourceType: 'module',
            },
            globals: {
                node: true,
                es2022: true,
                jest: true,
            },
        },
        plugins: {
            '@typescript-eslint': typescript,
        },
        rules: {
            'prefer-const': 'error',
            'no-var': 'error',
            'no-unused-vars': 'off',
            'no-undef': 'off',
            'no-useless-escape': 'off',
            '@typescript-eslint/no-unused-vars': 'error',
            '@typescript-eslint/no-explicit-any': 'warn',
        },
    },
    {
        ignores: ['dist/', 'node_modules/', 'coverage/'],
    },
];
