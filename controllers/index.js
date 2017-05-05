'use strict'

/**
 * Controllers listing
 *
 * @module controllers
 */

module.exports = {

  initRoutes: function (app) {
    require('./main.js').initRoutes(app)
    require('./user.js').initRoutes(app)
    require('./admin.js').initRoutes(app)
    require('./event.js').initRoutes(app)
    require('./entry.js').initRoutes(app)
  }

}
