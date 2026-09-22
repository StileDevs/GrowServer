declare module "*.html" {
  const content: string;
  export default content;
}

declare module "*Caddyfile" {
  const content: string;
  export default content;
}

declare module "*Caddyfile.dev" {
  const content: string;
  export default content;
}

declare module "*.toml" {
  const content: string;
  export default content;
}

declare module "*.png" {
  const path: string;
  export default path;
}
