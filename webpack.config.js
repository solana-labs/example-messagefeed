/* eslint import/no-commonjs:0 */
const path = require('path');
const webpack = require('webpack');
const CopyPlugin = require('copy-webpack-plugin');
const WasmPackPlugin = require('@wasm-tool/wasm-pack-plugin');
const FilterWarningsPlugin = require('webpack-filter-warnings-plugin');

const distStatic = path.resolve(__dirname, 'dist', 'static');
const clientConfig = {
  target: 'web',
  entry: './src/webapp/bootstrap.js',
  output: {
    path: distStatic,
    publicPath: '/',
    filename: 'bundle.js',
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: [/node_modules/, /wasm/],
        use: ['babel-loader', 'eslint-loader'],
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['*', '.js', '.jsx'],
    mainFiles: ['index'],
  },
  plugins: [
    new webpack.HotModuleReplacementPlugin(),
    new webpack.DefinePlugin({
      'process.env': {
        LIVE: JSON.stringify(process.env.LIVE),
        PORT: JSON.stringify(process.env.PORT),
      },
    }),
    new CopyPlugin([{from: path.resolve(__dirname, 'static'), to: distStatic}]),
    new WasmPackPlugin({
      crateDirectory: path.resolve(
        __dirname,
        'bpf-rust-programs',
        'prediction-poll',
        'wasm_bindings',
      ),
      extraArgs: '--no-typescript',
      outDir: path.resolve(__dirname, 'wasm'),
      outName: 'index',
    }),
  ],
  devServer: {
    disableHostCheck: true,
    contentBase: './dist',
    hot: true,
    host: '0.0.0.0',
    historyApiFallback: {
      index: 'index.html',
    },
  },
};

const serverConfig = {
  target: 'node',
  entry: './src/server/bootstrap.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'server.js',
  },
  node: {
    __dirname: true,
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: [/node_modules/, /wasm/],
        use: ['babel-loader', 'eslint-loader'],
      },
    ],
  },
  plugins: [
    // Server also relies on the poll program wasm bindings but does not use
    // the WasmPackPlugin here to avoid redundancy with the client config.
    new FilterWarningsPlugin({
      exclude: [
        /Critical dependency: the request of a dependency is an expression/,
        /Module not found: Error: Can't resolve/, // can't use web3 websocket api
      ],
    }),
    new WasmPackPlugin({
      crateDirectory: path.resolve(
        __dirname,
        'bpf-rust-programs',
        'prediction-poll',
        'wasm_bindings',
      ),
      extraArgs: '--no-typescript',
      outDir: path.resolve(__dirname, 'wasm'),
      outName: 'index',
    }),
  ],
};

module.exports = [clientConfig, serverConfig];
