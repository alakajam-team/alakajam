const db = require('./db')
const log = require('./log')

// Allows to display unhandled rejections more nicely
module.exports.catchUnhandledPromises = function () {
  process.on('unhandledRejection', (reason, p) => {
    log.error('Unhandled promise rejection:', p)
  })
}

// Stops the server gracefully upon shut down signals
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
