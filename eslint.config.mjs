import typescriptEslint from "@typescript-eslint/eslint-plugin";
import react from "eslint-plugin-react";
import globals from "globals";
import tsParser from "@typescript-eslint/parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default [...compat.extends(
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
), {

    files: ["**/*.ts", "**/*.tsx"],

    plugins: {
        "@typescript-eslint": typescriptEslint,
        react,
    },

    languageOptions: {
        globals: {
            ...globals.node,
        },

        parser: tsParser,
        ecmaVersion: 5,
        sourceType: "commonjs",

        parserOptions: {
            project: "./tsconfig.json",

            ecmaFeatures: {
                jsx: true,
            },
        },
    },

    rules: {
        "@typescript-eslint/no-misused-promises": "off",
        "@typescript-eslint/no-unnecessary-type-assertion": "off",
        "@typescript-eslint/await-thenable": "off",
        "@typescript-eslint/unbound-method": "off",
        "@typescript-eslint/prefer-includes": "off",
        "@typescript-eslint/explicit-function-return-type": "off",
        "@typescript-eslint/array-type": "off",
        "@typescript-eslint/consistent-type-definitions": "error",
        "@typescript-eslint/no-unsafe-argument": "off",
        "@typescript-eslint/no-unused-expressions": "off",
        "@typescript-eslint/no-base-to-string": "off",
        "@typescript-eslint/no-require-imports": "off",
        "@typescript-eslint/no-redundant-type-constituents": "off",
        "react/jsx-uses-react": 1,
        "react/jsx-uses-vars": 1,

        "@typescript-eslint/no-unused-vars": ["error", {
            vars: "all",
            args: "none",
            ignoreRestSiblings: false,
        }],

        "@typescript-eslint/explicit-member-accessibility": ["error", {
            accessibility: "explicit",
        }],

        "@typescript-eslint/interface-name-prefix": "off",

        "@typescript-eslint/member-ordering": "off",
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-parameter-properties": "off",
        "@typescript-eslint/no-unsafe-assignment": "off",
        "@typescript-eslint/no-unsafe-call": "off",
        "@typescript-eslint/no-unsafe-member-access": "off",
        "@typescript-eslint/no-unsafe-return": "off",
        "@typescript-eslint/no-use-before-define": "off",
        "@typescript-eslint/prefer-for-of": "error",
        "@typescript-eslint/prefer-function-type": "error",
        "@typescript-eslint/restrict-plus-operands": "off",
        "@typescript-eslint/restrict-template-expressions": "off",
        "@typescript-eslint/unified-signatures": "error",
        "@typescript-eslint/camelcase": "off",
        "arrow-body-style": "off",
        "arrow-parens": "off",
        camelcase: "off",
        "comma-dangle": "off",
        complexity: "off",
        "constructor-super": "error",
        curly: "error",
        "dot-notation": "error",
        "eol-last": "error",
        eqeqeq: ["error", "smart"],
        "guard-for-in": "error",
        "id-blacklist": "off",
        "id-match": "error",
        indent: "off",
        "max-classes-per-file": ["error", 1],

        "max-len": ["error", {
            code: 150,
        }],

        "new-parens": "error",
        "no-bitwise": "error",
        "no-caller": "error",
        "no-cond-assign": "error",
        "no-console": "error",
        "no-debugger": "error",
        "no-empty": "error",
        "no-eval": "error",
        "no-fallthrough": "off",
        "no-invalid-this": "off",
        "no-multiple-empty-lines": "error",
        "no-new-wrappers": "error",

        "no-shadow": ["error", {
            hoist: "all",
        }],

        "no-throw-literal": "error",
        "no-trailing-spaces": "error",
        "no-undef-init": "error",
        "no-underscore-dangle": "off",
        "no-unsafe-finally": "error",
        "no-unused-expressions": "error",
        "no-unused-labels": "error",
        "object-shorthand": "error",
        "one-var": ["error", "never"],
        "quote-props": ["error", "consistent-as-needed"],
        radix: "error",

        "space-before-function-paren": ["error", {
            anonymous: "never",
            asyncArrow: "always",
            named: "never",
        }],

        "spaced-comment": "error",
        "use-isnan": "error",
        "valid-typeof": "off",
    },
}];