/** @type {import("prettier").Config & import("prettier-plugin-tailwindcss").PluginOptions} */
const config = {
  printWidth: 100,
  trailingComma: "all",
  plugins: ["prettier-plugin-tailwindcss"],
  // Tailwind v4 has no JS config; the plugin reads the theme from the CSS entry point.
  tailwindStylesheet: "./src/app/globals.css",
  tailwindFunctions: ["cn"],
};

export default config;
