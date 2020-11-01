const webpack = require('webpack')
const webpackMerge = require('webpack-merge')
const TerserPlugin = require('terser-webpack-plugin')

const webpackCommon = require('./webpack.common')

// https://webpack.js.org/guides/production/#setup
module.exports = webpackMerge(webpackCommon, {
  mode: 'production',
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin()],
  },
  plugins: [
    // https://webpack.js.org/guides/production/#specify-the-environment
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: JSON.stringify('production')
      }
    }),
    // https://webpack.js.org/guides/production/#module-concatenation
    new webpack.optimize.ModuleConcatenationPlugin()
  ]
})
