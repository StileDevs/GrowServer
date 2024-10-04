import consola from "consola";

async function main() {
  const tools = await consola.prompt("Select package manager tools.", {
    type: "select",
    required: true,
    options: [
      { value: "pnpm", label: "pnpm", hint: "recommended" },
      { value: "npm", label: "npm" },
      { value: "bun", label: "bunjs" }
    ],
    initial: ["pnpm"]
  });
  console.log({ tools });
}

main();
