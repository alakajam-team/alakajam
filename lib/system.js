
module.exports.gracefulShutdown = function (app) {
  // FIXME Not working
  if (process.platform === 'win32') {
    var rl = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    })

    rl.on('SIGINT', () => process.emit('SIGINT'))
    rl.on('SIGUSR2', () => process.emit('SIGUSR2'))
  }

  process.once('SIGINT', () => _doGracefulShutdown(app))
  process.once('SIGUSR2', () => _doGracefulShutdown(app))
}

function _doGracefulShutdown (app) {
  console.log('Shutting down...')
  app.close()
  process.exit()
}
