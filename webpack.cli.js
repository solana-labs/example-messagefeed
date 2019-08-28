/* eslint import/no-commonjs:0 */
const path = require('path');
const FilterWarningsPlugin = require('webpack-filter-warnings-plugin');

module.exports = {
  target: 'node',
  entry: './src/cli/bootstrap-poll.js',
  output: {
    path: path.resolve(__dirname, 'dist', 'cli'),
    filename: 'prediction-poll.js',
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
    new FilterWarningsPlugin({
      exclude: [
        /Critical dependency: the request of a dependency is an expression/,
        /Module not found: Error: Can't resolve/, // can't use web3 websocket api
      ],
    }),
  ],
};
