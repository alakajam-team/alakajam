'use strict'

require('./support/wejam-test.js')

const assert = require('assert')

describe('otherService', async function() {
  
  describe('#register()', function() {

    it('should fail upon invalid username', async function() {
      const userService = require('../services/user-service')
      console.log("hello")
    })

  })

})
