import globals from "globals";
import html from "eslint-plugin-html";
import js from "@eslint/js";
import stylistic from "@stylistic/eslint-plugin";

export default [
    js.configs.all,
    stylistic.configs["all-flat"],
    // {files: ["**/*.html"]},
    {ignores: ["js/lib/"]},
    {
        languageOptions: {
            ecmaVersion: 2018,
            globals: {
                ...globals.browser,
                ...globals.jquery,
                define: false,
            },
            sourceType: "script",
        },
        plugins: {
            "@stylistic": stylistic,
            html,
        },
        rules: {
            "@stylistic/array-bracket-newline": ["error", "consistent"],
            "@stylistic/array-element-newline": "off",
            "@stylistic/brace-style": ["error", "1tbs", {allowSingleLine: true}],
            "@stylistic/comma-dangle": ["error", "only-multiline"],
            "@stylistic/dot-location": ["error", "property"],
            "@stylistic/function-call-argument-newline": "off",
            "@stylistic/indent": ["error", 4, {SwitchCase: 1}],
            "@stylistic/indent-binary-ops": "off",
            "@stylistic/max-len": ["error", {code: 128}],
            "@stylistic/max-statements-per-line": ["error", {max: 2}],
            "@stylistic/multiline-ternary": ["error", "always-multiline"],
            "@stylistic/newline-per-chained-call": ["error", {ignoreChainWithDepth: 5}],
            "@stylistic/no-extra-parens": ["error", "functions"],
            "@stylistic/object-property-newline": ["error", {allowAllPropertiesOnSameLine: true}],
            "@stylistic/padded-blocks": ["error", "never"],
            "@stylistic/quote-props": ["error", "consistent-as-needed"],
            "@stylistic/quotes": ["error", "double", {avoidEscape: true}],
            "@stylistic/semi": ["error", "always"],
            "@stylistic/space-before-function-paren": ["error", {
                anonymous: "always",
                named: "never",
            }],

            "camelcase": "off",
            "capitalized-comments": "off",
            "curly": ["error", "multi-line"],
            "func-names": "off",
            "func-style": ["error", "declaration"],
            "id-length": ["error", {min: 1}],
            "line-comment-position": "off",
            "logical-assignment-operators": ["error", "never"],
            "max-statements": ["error", 20],
            "multiline-comment-style": "off",
            "no-continue": "off",
            "no-inline-comments": "off",
            "no-magic-numbers": "off",
            "no-negated-condition": "off",
            "no-plusplus": "off",
            "no-ternary": "off",
            "object-shorthand": "off",
            "one-var": ["error", {initialized: "never"}],
            "prefer-named-capture-group": "off",
            "prefer-object-has-own": "off",
            "prefer-spread": "off",
            "prefer-template": "off",
            "require-unicode-regexp": "off",
        },
    },
    {
        files: ["**/*.mjs"],
        languageOptions: {ecmaVersion: 2020, sourceType: "module"},
    },
];
