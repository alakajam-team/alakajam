'use strict'

const weJamTest = require('./support/wejam-test.js')
const assert = require('assert')

before(weJamTest)

describe('userService', function() {
  
  const userService = require('../services/user-service')

  describe('#register()', function() {

    it('should fail upon invalid username', async function() {
      let result = await userService.register('1user', 'password')
      assert(typeof result === 'string')
    })

    it('should succeed upon valid username and password', async function() {
      assert(await userService.register('user', 'password'))
    })

  })

})
