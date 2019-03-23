const path = require('path')

const rootPathTo = pathFromRoot => path.resolve(__dirname, pathFromRoot)

const outputPath = rootPathTo('dist/client/js')

const babelOptions = {
  presets: [
    [
      '@babel/preset-env',
      {
        useBuiltIns: 'usage',
        corejs: 'core-js@3'
      }
    ]
  ],
  sourceType: 'unambiguous'
}

module.exports = {
  entry: {
    site: './client/js/site.js'
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
        include: rootPathTo('client/js'),
        use: [
          {
            loader: 'babel-loader',
            options: babelOptions
          }
        ]
      },
      // Remove the massive Unicode table pulled in by the `slug` package.
      // https://www.npmjs.com/package/slug
      // https://stackoverflow.com/questions/41873334/webpack-browserify-ignore-equivalent
      {
        test: /unicode\/category\/So\.js$/,
        use: [
          {
            loader: 'null-loader'
          }
        ]
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
