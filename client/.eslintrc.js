module.exports = {
    files: ["**/*.ts", "**/*.tsx"],
    parserOptions: {
        project: "./client/tsconfig.json"
    },
    env: {
        es6: true,
        browser: true
    },
    rules: {
        "@typescript-eslint/no-this-alias": "off",
        "no-console": "off"
    }
};
