import { eslintConfig } from "@growserver/config";

export default [
  ...eslintConfig,
  {
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: __dirname,
      },
    },
  },
];