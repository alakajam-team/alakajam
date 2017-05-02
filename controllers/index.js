'use strict'

module.exports = {

  initRoutes: function (app) {
    require('./main.js').initRoutes(app)
    require('./event.js').initRoutes(app)
    require('./entry.js').initRoutes(app)
  }

}
