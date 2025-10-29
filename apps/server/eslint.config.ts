import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import stylisticTs from "@stylistic/eslint-plugin-ts";

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.recommended,
  {
    ignores: ["node_modules/*", "dist/*", "build/*", "data/*", "scripts/*"],
    plugins: {
      "@stylistic/ts": stylisticTs
    },
    rules: {
      indent:            "off",
      "no-unused-vars":  "off",
      "keyword-spacing": "error",
      "key-spacing":     [
        "error",
        {
          align: "value",
        }
      ],
      "@typescript-eslint/no-unused-vars": "off",
      "@stylistic/ts/indent":              [
        "error",
        2,
        {
          SwitchCase: 1
        }
      ]
    }
  }
);
