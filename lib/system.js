let db = require('./db')

module.exports.initFilesLayout = function () {
  // TODO Init config.js if needed, mkdir data/
}

module.exports.gracefulShutdown = function () {
  let signals = ['SIGINT', 'SIGQUIT', 'SIGTERM']
  signals.forEach(() => _doGracefulShutdown())
}

function _doGracefulShutdown () {
  //console.log('Shutting down...')
 // db.knex.destroy()
}
