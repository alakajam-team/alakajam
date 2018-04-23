'use strict'

/**
 * Mail service
 *
 * @module services/mail-service
 */

const nodemailer = require('nodemailer')
const config = require('../config')
const log = require('../core/log')
const forms = require('../core/forms')

module.exports = {
  sendMail
}

let mailTransporter = null

if (!config.DEBUG_TEST_MAILER) {
  mailTransporter = nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    secure: true,
    auth: {
      user: config.SMTP_USERNAME,
      pass: config.SMTP_PASSWORD
    }
  })

  mailTransporter.verify(function (err, success) {
    if (err) {
      log.error('Failed to initialize SMTP mailer: ' + err.message)
    } else {
      log.info('SMTP mailer initialized')
    }
  })
} else {
  nodemailer.createTestAccount(function (err, account) {
    if (!err) {
      mailTransporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        tls: { rejectUnauthorized: false },
        auth: {
          user: account.user, // generated ethereal user
          pass: account.pass // generated ethereal password
        }
      })
    } else {
      log.error(err.message)
    }
  })
}

/**
 * Sends an email
 * @param  {App} app
 * @param  {User} user mail recipient
 * @param  {string} subject mail subject
 * @param  {string} template mail template name
 * @param  {object} context data to be included while rendering the template (optional)
 * @return {void}
 */
async function sendMail (app, user, subject, template, context = {}) {
  let result = new Promise(function (resolve, reject) {
    if (mailTransporter === null) {
      reject(new Error('Mail transporter is not correctly configured. Please [contact](/article/docs) the administrators.'))
    }

    let mergedContext = Object.assign({ rootUrl: config.ROOT_URL }, context)

    app.render('mail/' + template, mergedContext, function (err, html) {
      if (!err) {
        let textVersion = forms.htmlToText(html)

        let mailOptions = {
          from: 'contact@alakajam.com',
          to: user.get('email'),
          subject: '[Alakajam!] ' + subject,
          html: html,
          text: textVersion
        }

        mailTransporter.sendMail(mailOptions, function (err, info) {
          if (!err) {
            if (config.DEBUG_TEST_MAILER) {
              log.info('===============')
              log.info('mail sent')
              log.info('to: ' + (user.get('title') || user.get('name')))
              log.info('subject: ' + subject)
              log.info('body: \n' + textVersion)
              log.info('===============')
            }
            resolve()
          } else {
            reject(new Error('Failed to send mail: ' + err.message))
          }
        })
      } else {
        reject(new Error('Failed to render mail: ' + err.message))
      }
    })
  })

  result.catch(function (err) {
    log.warn(err.message)
  })

  return result
}
