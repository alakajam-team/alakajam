'use strict'

/**
 * Article pages
 *
 * @module controllers/article-controller
 */

const slug = require('slug')
const settingService = require('../services/setting-service')
const articleService = require('../services/article-service')

module.exports = {
  article
}

/**
 * Articles
 */
async function article (req, res) {
  res.locals.articleName = slug(req.params.name)

  // Find featured article
  let findArticleTask = articleService.findArticle(
    res.locals.articleName
  ).then(async function (article) {
    if (article) {
      let lines = article.split('\n')
      res.locals.articleName = lines.shift()
      res.locals.articleBody = lines.join('\n')
    }
  })

  let settingArticlesTask = settingService.findArticlesSidebar()
    .then(function (sidebar) {
      res.locals.sidebar = sidebar
    })

  await Promise.all([findArticleTask, settingArticlesTask]) // Parallelize fetching everything

  if (res.locals.articleName && res.locals.articleBody) {
    res.locals.pageTitle = res.locals.articleName
    res.render('article')
  } else {
    res.errorPage(404)
  }
}
