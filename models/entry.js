let db = require('../lib/db')

module.exports = db.Model.extend({
  tableName: 'entry',
  uuid: true
})
