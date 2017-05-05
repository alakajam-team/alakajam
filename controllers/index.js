'use strict'

/**
 * Controllers listing
 *
 * @module controllers
 */

module.exports = {

  initRoutes: function (app) {
    require('./main-controller.js').initRoutes(app)
    require('./user-controller.js').initRoutes(app)
    require('./admin-controller.js').initRoutes(app)
    require('./event-controller.js').initRoutes(app)
    require('./entry-controller.js').initRoutes(app)
  }

}
