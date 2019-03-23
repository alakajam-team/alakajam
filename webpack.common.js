const path = require('path')

const rootPathTo = pathFromRoot => path.resolve(__dirname, pathFromRoot)

const outputPath = rootPathTo('dist/client/scripts')

const babelOptions = {
  presets: [
    "@babel/typescript",
    [
      '@babel/preset-env',
      {
        useBuiltIns: 'usage',
        corejs: 'core-js@3',
        modules: false
      }
    ]
  ],
  sourceType: 'unambiguous'
}

module.exports = {
  entry: {
    site: './client/scripts/site.ts'
  },
  output: {
    path: outputPath,
    filename: '[name].js',
    publicPath: '/static/scripts/'
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js']
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        include: rootPathTo('client/scripts'),
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
        test: /unicode[\\\/]category[\\\/]So\.js$/,
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
