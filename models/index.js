'use strict'

/**
 * Models listing
 *
 * @module models
 */

module.exports = {

  version: 1,

  /*
   * List models in table creation order
   */
  modelFilenamesUp: function () {
    return [
      'setting-model',
      'event-model',
      'entry-model'
    ]
  }

}
