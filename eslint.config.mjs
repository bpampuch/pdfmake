import jsdoc from "eslint-plugin-jsdoc";
import globals from "globals";
import js from "@eslint/js";

export default [
	{
		ignores: ["src/3rd-party/svg-to-pdfkit/*"],
	},

	js.configs.recommended,

	{
		plugins: {
			jsdoc,
		},

		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node,
				...globals.mocha,
			},

			ecmaVersion: 9,
			sourceType: "module",
		},

		rules: {
			semi: 2,
			"no-throw-literal": 2,
			"no-prototype-builtins": 0,
			"jsdoc/check-examples": 0,
			"jsdoc/check-param-names": 1,
			"jsdoc/check-tag-names": 1,
			"jsdoc/check-types": 1,
			"jsdoc/no-undefined-types": 1,
			"jsdoc/require-description": 0,
			"jsdoc/require-description-complete-sentence": 0,
			"jsdoc/require-example": 0,
			"jsdoc/require-hyphen-before-param-description": 0,
			"jsdoc/require-param": 1,
			"jsdoc/require-param-description": 0,
			"jsdoc/require-param-name": 1,
			"jsdoc/require-param-type": 1,
			"jsdoc/require-returns": 1,
			"jsdoc/require-returns-check": 1,
			"jsdoc/require-returns-description": 0,
			"jsdoc/require-returns-type": 1,
			"jsdoc/valid-types": 1,
		},
	}
];
