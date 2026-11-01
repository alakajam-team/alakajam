import tseslint from "typescript-eslint";
import stylistic from "@stylistic/eslint-plugin";
import globals from "globals";

export default tseslint.config(
  {
    ignores: [
      "dist/", "node_modules/", ".claude/",
      "static/", "client/css/",
      "e2e/test-results/", "e2e/playwright-report/", "e2e/tmp/"
    ]
  },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        projectService: { allowDefaultProject: ["playwright.config.ts"] },
        tsconfigRootDir: import.meta.dirname,
        ecmaFeatures: {
          jsx: true
        }
      }
    },
    plugins: {
      "@stylistic": stylistic
    },
    rules: {
      // Too slow for what they're worth
      "@typescript-eslint/no-misused-promises": "off",
      "@typescript-eslint/no-unnecessary-type-assertion": "off",
      "@typescript-eslint/await-thenable": "off",
      "@typescript-eslint/unbound-method": "off",

      "@typescript-eslint/prefer-includes": "off",

      // New in typescript-eslint 8's recommendedTypeChecked, too noisy for what they're worth
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-base-to-string": "off",
      "@typescript-eslint/no-redundant-type-constituents": "off",

      "@typescript-eslint/consistent-type-definitions": "error",
      "@typescript-eslint/no-unused-vars": ["error", {
        "vars": "all",
        "args": "none",
        "ignoreRestSiblings": false,
        "caughtErrors": "none"
      }],
      "@typescript-eslint/explicit-member-accessibility": [
        "error",
        {
          "accessibility": "explicit"
        }
      ],
      "@stylistic/indent": [
        "error",
        2,
        {
          "SwitchCase": 0,
          "ignoredNodes": [
            "JSXElement", "JSXElement > *", "JSXAttribute", "JSXIdentifier", "JSXNamespacedName", "JSXMemberExpression",
            "JSXSpreadAttribute", "JSXExpressionContainer", "JSXOpeningElement", "JSXClosingElement", "JSXFragment",
            "JSXOpeningFragment", "JSXClosingFragment", "JSXText", "JSXEmptyExpression", "JSXSpreadChild"
          ],
          "FunctionDeclaration": {
            "parameters": "off"
          },
          "FunctionExpression": {
            "parameters": "first"
          }
        }
      ],
      "@stylistic/member-delimiter-style": [
        "error",
        {
          "multiline": {
            "delimiter": "semi",
            "requireLast": true
          },
          "singleline": {
            "delimiter": "semi",
            "requireLast": false
          }
        }
      ],
      "@typescript-eslint/member-ordering": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-use-before-define": "off",
      "@typescript-eslint/prefer-for-of": "error",
      "@typescript-eslint/prefer-function-type": "error",
      "@stylistic/quotes": [
        "error",
        "double",
        {
          "avoidEscape": true
        }
      ],
      "@typescript-eslint/restrict-plus-operands": "off",
      "@typescript-eslint/restrict-template-expressions": "off",
      "@stylistic/semi": [
        "error",
        "always"
      ],
      "@typescript-eslint/unified-signatures": "error",
      "arrow-body-style": "off",
      "arrow-parens": "off",
      "camelcase": "off",
      "comma-dangle": "off",
      "complexity": "off",
      "constructor-super": "error",
      "curly": "error",
      "dot-notation": "error",
      "@stylistic/eol-last": "error",
      "eqeqeq": [
        "error",
        "smart"
      ],
      "guard-for-in": "error",
      "id-match": "error",
      "indent": "off",
      "max-classes-per-file": [
        "error",
        1
      ],
      "@stylistic/max-len": [
        "error",
        {
          "code": 150
        }
      ],
      "@stylistic/new-parens": "error",
      "no-bitwise": "error",
      "no-caller": "error",
      "no-cond-assign": "error",
      "no-console": "error",
      "no-debugger": "error",
      "no-empty": "error",
      "no-eval": "error",
      "no-fallthrough": "off",
      "no-invalid-this": "off",
      "@stylistic/no-multiple-empty-lines": "error",
      "no-new-wrappers": "error",
      "no-restricted-imports": ["error", {
        patterns: [
          {
            group: ["**/core/models", "./models"],
            message: "Bookshelf models are being migrated to TypeORM, see server/entity/BOOKSHELF_MIGRATION.md"
          },
          {
            group: ["typeorm"],
            importNames: ["getRepository", "getManager", "getConnection", "createConnection", "Connection"],
            message: "Global TypeORM helpers are removed in 1.x, use dbTypeorm.dataSource instead"
          }
        ]
      }],
      "no-shadow": [
        "error",
        {
          "hoist": "all"
        }
      ],
      "no-throw-literal": "error",
      "@stylistic/no-trailing-spaces": "error",
      "no-undef-init": "error",
      "no-underscore-dangle": "off",
      "no-unsafe-finally": "error",
      "no-unused-expressions": "off", // superseded by the typescript-eslint version, enabled in recommended
      "no-unused-labels": "error",
      "object-shorthand": "error",
      "one-var": [
        "error",
        "never"
      ],
      "@stylistic/quote-props": [
        "error",
        "consistent-as-needed"
      ],
      "radix": "error",
      "@stylistic/space-before-function-paren": [
        "error",
        {
          "anonymous": "never",
          "asyncArrow": "always",
          "named": "never"
        }
      ],
      "@stylistic/spaced-comment": "error",
      "use-isnan": "error",
      "valid-typeof": "off"
    }
  },
  {
    // Shrinking allowlist: remove a file from here once it no longer uses the Bookshelf models (see BOOKSHELF_MIGRATION.md).
    // Do not add new entries.
    files: [
      "server/core/security.spec.ts",
      "server/core/security.ts",
      "server/core/settings.ts",
      "server/entry/entry-hotness.service.spec.ts",
      "server/entry/entry.service.ts",
      "server/entry/highscore/highscore.service.ts",
      "server/entry/manage/entry-manage.controller.ts",
      "server/entry/platform/platform.repository.ts",
      "server/entry/tag/tag.service.ts",
      "server/entry/team/team-invite.service.ts",
      "server/entry/team/team.service.ts",
      "server/event/event.service.ts",
      "server/event/manage/create/event-template.service.ts",
      "server/event/manage/settings/event-preset.service.ts",
      "server/event/ratings/rating.service.ts",
      "server/event/theme/theme-shortlist.service.ts",
      "server/event/theme/theme-stats.service.ts",
      "server/event/theme/theme-voting.service.ts",
      "server/event/theme/theme.service.ts",
      "server/event/tournament/tournament.service.ts",
      "server/migrations/0029_upgrade_thumbnails.ts",
      "server/post/comment/comment.service.ts",
      "server/post/like/like.service.spec.ts",
      "server/post/like/like.service.ts",
      "server/post/manage/post-manage.controller.ts",
      "server/post/post.service.spec.ts",
      "server/post/post.service.ts",
      "server/user/user.service.spec.ts",
      "server/user/user.service.ts"
    ],
    rules: {
      "no-restricted-imports": "off"
    }
  },
  {
    files: ["client/**"],
    languageOptions: {
      globals: globals.browser
    },
    rules: {
      "@typescript-eslint/no-this-alias": "off",
      "no-console": "off"
    }
  }
);
