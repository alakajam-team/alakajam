const Entry = require('../models/entry')

module.exports = {

  initRoutes: function (app) {
    app.get('/', index)
    app.get('*', error404)
  }

}

async function index (req, res) {
  try {
    console.log(req.url)
    await new Entry({title: 'Game'}).save()
    let count = await new Entry().count()
    res.render('index', { count })
  } catch (e) {
    res.render('index', {
      count: e.message()
    })
  }
}

function error404 (req, res) {
  res.status(404)
  res.end('404')
}
