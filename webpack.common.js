const path = require('path')

const rootPathTo = pathFromRoot => path.resolve(__dirname, pathFromRoot)

const outputPath = rootPathTo('static/js')

const babelOptions = {
  presets: [
    [
      'env',
      {
        // https://github.com/babel/babel/tree/master/experimental/babel-preset-env#usebuiltins
        // Requires babel-core >= 7 (otherwise just true and false are supported).
        // TODO Once Babel 7 stabilizes, set to 'usage' and remove require('babel-polyfill') from main.js
        // useBuiltIns: 'usage'
        useBuiltIns: true,
        targets: {
          'browsers': [ '>0.25%', 'not op_mini all' ],
          'firefox': '29' // Sorceress compatibility!
        }
      }
    ]
  ]
}

module.exports = {
  entry: {
    site: './assets/js/site.js'
  },
  output: {
    path: outputPath,
    filename: '[name].js',
    publicPath: '/static/js/'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        include: rootPathTo('static/js'),
        loader: 'babel-loader',
        options: babelOptions
      },
      // Remove the massive Unicode table pulled in by the `slug` package.
      // https://www.npmjs.com/package/slug
      // https://stackoverflow.com/questions/41873334/webpack-browserify-ignore-equivalent
      {
        test: /unicode\/category\/So\.js$/,
        loader: 'null-loader'
      }
    ]
  },
  context: __dirname,
  target: 'web',
  // https://webpack.js.org/configuration/stats/
  stats: {
    chunks: false,
    colors: true,
    modules: false,
    performance: false,
    warnings: true
  }
}
