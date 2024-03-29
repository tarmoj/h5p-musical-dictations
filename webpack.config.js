const path = require("path");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const TerserPlugin = require("terser-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");

const nodeEnv = process.env.NODE_ENV || "development";
const isProd = nodeEnv === "production";

// original was drop_console: true -  and now messages to console. Not for now.,

module.exports = {
  mode: nodeEnv,
  optimization: {
    minimize: isProd,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: false,
          },
        },
      }),
    ],
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: "h5p-musical-dictations.css",
    }),
    new MiniCssExtractPlugin({
      filename: "joubel-ui.css",
    }),
    new CopyPlugin({
      patterns: [
        { from: "src/scripts/vexflow-react-components/images/", to: "images" },
      ],
    }),
  ],
  entry: {
    dist: "./src/entries/h5p-musical-dictations.js",
  },
  output: {
    filename: "h5p-musical-dictations.js",
    path: path.resolve(__dirname, "dist"),
  },
  target: ["web", "es5"], // IE11
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: "babel-loader",
      },
      {
        test: /\.(s[ac]ss|css)$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
            options: {
              publicPath: "",
            },
          },
          { loader: "css-loader" },
          {
            loader: "sass-loader",
          },
        ],
      },
      // {
      //   test: /\.svg|\.jpg|\.png$/,
      //   include: path.join(__dirname, "src/scripts/vexflow-react-components/images/"),
      //   type: "asset/resource",
      // },
      {
        test: /\.woff$/,
        include: path.join(__dirname, "src/fonts"),
        type: "asset/resource",
      },
    ],
  },
  resolve: {
    extensions: [".js"],
  },
  stats: {
    colors: true,
  },
  devtool: isProd ? undefined : "eval-cheap-module-source-map",
};
