import consola from "consola";

async function main() {
  const tools = await consola.prompt("Select additional tools.", {
    type: "multiselect",
    required: true,
    options: [
      { value: "eslint", label: "ESLint", hint: "recommended" },
      { value: "prettier", label: "Prettier" },
      { value: "gh-action", label: "GitHub Action" }
    ],
    initial: ["eslint", "prettier"]
  });
}

main();
