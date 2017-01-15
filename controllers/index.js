let db = require('../lib/db')

let Entry = require('../models/entry')

module.exports = {
  
  initRoutes: function(app) {
    app.use('/', index)
  }
  
}

async function index(req, res) {
  try {
    await new Entry({title: 'Game'}).save()
    let count = await new Entry().count()
    res.render('index', { count })
  } catch (e) {
    res.render('index', {
      count: e.message()
    })
  }
}
