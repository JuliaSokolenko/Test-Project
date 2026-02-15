const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");

module.exports = (env, { mode }) => ({
  entry: {
    main: "./src/main.ts",
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: mode === "production" ? "assets/[name].[contenthash:8].js" : "assets/[name].js",
    clean: true,
  },
  resolve: {
    extensions: [".ts", ".js"],
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  module: {
    rules: [
      {
        test: /\.(png|jpe?g|gif|webp|svg)$/i,
        use: {
          loader: "file-loader",
          options: {
            name: "assets/images/[name].[ext]",
            esModule: false,
          },
        },
        exclude: /node_modules/,
      },
      {
        test: /\.ts$/,
        use: {
          loader: "ts-loader",
          options: { transpileOnly: true },
        },
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, "index.html"),
      inject: "body",
      chunks: ["main"],
      minify: mode === "production",
    }),
    new CopyPlugin({
      patterns: [
        { from: "src/assets/css/critical.css", to: "assets/css/critical.css" },
        { from: "src/assets/css/styles.css", to: "assets/css/styles.css" },
      ],
    }),
  ],
  devServer: {
    static: { directory: path.join(__dirname, "dist") },
    port: 8080,
    hot: true,
    open: true,
  },
  devtool: mode === "development" ? "eval-source-map" : "source-map",
  target: "web",
});
