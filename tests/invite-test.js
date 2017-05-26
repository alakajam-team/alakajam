'use strict'

require('./support/wejam-test.js')

const assert = require('assert')

describe('inviteService', async function () {
  it('should accept generated keys', async function () {
    const inviteService = require('../services/invite-service')
    let str = await inviteService.generateKey()
    assert.equal(str.length, 4 * 4 + 3, 'keys should follow the format xxxx-xxxx-xxxx-xxxx')
    assert.equal(str.replace(/-/g, '').length, 4 * 4)
    assert(await inviteService.verifyKey(str))
  })
})
