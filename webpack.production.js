const webpackMerge = require('webpack-merge')
const UglifyjsWebpackPlugin = require('uglifyjs-webpack-plugin')
const webpack = require('webpack')

const webpackCommon = require('./webpack.common')

// https://webpack.js.org/guides/production/#setup
module.exports = webpackMerge(webpackCommon, {
  mode: 'production',
  // https://webpack.js.org/guides/production/#source-mapping
  devtool: 'source-map',
  plugins: [
    // https://webpack.js.org/guides/production/#specify-the-environment
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: JSON.stringify('production')
      }
    }),
    // https://webpack.js.org/guides/tree-shaking/#minify-the-output
    new UglifyjsWebpackPlugin({
      sourceMap: true
    }),
    // https://webpack.js.org/guides/production/#module-concatenation
    new webpack.optimize.ModuleConcatenationPlugin()
  ]
})
