'use strict'

require('./support/test-server.js')

describe('events', async function () {
  it('should let us manage the team of an entry', async function () {
    const eventService = require('../services/event-service')
    const userService = require('../services/user-service')
    const constants = require('../core/constants')

    await userService.register('e@example.com', 'entrant1', 'entrant1')
    let user = await userService.findByName('entrant1')
    let event = eventService.createEvent()
    event.set({
      name: 'test',
      title: 'Test'
    })
    await event.save()
    let entry = await eventService.createEntry(user, event)

    // Add user2 to the team

    await userService.register('e2@example.com', 'entrant2', 'entrant2')
    let user2 = await userService.findByName('entrant2')
    let userRoles = entry.userRoles()
    await userRoles.create({
      user_id: user2.get('id'),
      user_name: user2.get('name'),
      user_title: user2.get('title'),
      permission: constants.PERMISSION_WRITE
    })

    entry = await eventService.findEntryById(entry.get('id'))
    // console.log(entry.related('userRoles').models) TODO assert 1 + 2 are here

    // Replace user2 with user3

    await userService.register('e3@example.com', 'entrant3', 'entrant3')
    let user3 = await userService.findByName('entrant3')

    let rolesToReset = []
    userRoles.each(function (role) {
      if (role.get('permission') !== constants.PERMISSION_MANAGE) {
        rolesToReset.push(role)
        role.destroy()
      }
    })
    userRoles.remove(rolesToReset)

    await userRoles.create({
      user_id: user3.get('id'),
      user_name: user3.get('name'),
      user_title: user3.get('title'),
      permission: constants.PERMISSION_WRITE
    })

    entry = await eventService.findEntryById(entry.get('id'))
    // console.log(entry.related('userRoles').models) TODO assert 1 + 3 are here
  })
})
