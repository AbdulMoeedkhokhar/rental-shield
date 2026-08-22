module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    // Lets Drizzle's generated .sql migrations be imported as strings and
    // bundled into the app, so migrations ship with the binary.
    plugins: [["inline-import", { extensions: [".sql"] }]],
  };
};
