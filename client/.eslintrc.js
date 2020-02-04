module.exports = {
    parserOptions: {
        project: "./client/tsconfig.json"
    },
    env: {
        es6: true,
        browser: true
    },
    rules: {
        "@typescript-eslint/no-this-alias": "off"
    }
};
