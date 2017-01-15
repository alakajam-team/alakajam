const db = require('./db')
const log = require('./log')

module.exports.gracefulShutdown = function () {
  // TODO Windows compat, if possible...
  let signals = ['SIGINT', 'SIGQUIT', 'SIGTERM']
  signals.forEach((signal) => {
    process.on(signal, () => _doGracefulShutdown())
  })
}

function _doGracefulShutdown () {
  log.info('Shutting down.')
  db.knex.destroy()
}
