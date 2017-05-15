'use strict'

/**
 * Controllers listing
 *
 * @module controllers
 */

module.exports = {

  initRoutes: function (app) {
    // Using express-promise-router instead of the default express.Router
    // allows our routes to return rejected promises to trigger the error
    // handling.
    const router = require('express-promise-router')()
    app.use(router)

    require('./main-controller.js').initRoutes(router)
    require('./user-controller.js').initRoutes(router)
    require('./admin-controller.js').initRoutes(router)
    require('./entry-controller.js').initRoutes(router)
    require('./event-controller.js').initRoutes(router)
    require('./post-controller.js').initRoutes(router)
  }

}
