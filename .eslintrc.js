module.exports = {
    "env": {
        "browser": true,
        "es6": true,
        "node": true
    },
    "parser": "@typescript-eslint/parser",
    "parserOptions": {
        "project": "tsconfig.json",
        "sourceType": "module"
    },
    "plugins": [
        "@typescript-eslint"
    ],
    "extends": [
        "eslint:recommended",
        "plugin:@typescript-eslint/eslint-recommended",
        "plugin:@typescript-eslint/recommended"
    ],
    "rules": {
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-non-null-assertion": "off",
        '@typescript-eslint/no-this-alias': [
            'error',
            {
              allowDestructuring: true, // Allow `const { props, state } = this`; false by default
              allowedNames: ['_that'], // Allow `const self = this`; `[]` by default
            },
        ],
        '@typescript-eslint/no-inferrable-types': {
            ignoreParameters: true
        }
    }
};
