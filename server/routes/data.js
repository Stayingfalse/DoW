'use strict'

const scenariosData = require('../data/scenarios.json')
const charactersData = require('../data/characters.json')
const locationsData = require('../data/locations.json')
const itemsData = require('../data/items.json')
const db = require('../db/queries')

module.exports = async function (fastify) {
  /**
   * GET /game/scenarios
   * Returns the list of available scenarios.
   */
  fastify.get('/scenarios', async (request, reply) => {
    return reply.send(scenariosData)
  })

  /**
   * GET /game/characters
   * Returns the list of playable characters (public info only, no objectives).
   */
  fastify.get('/characters', async (request, reply) => {
    return reply.send(charactersData.map(c => ({
      id: c.id,
      name: c.name,
      influence: c.influence,
      attackDie: c.attackDie,
      searchDie: c.searchDie,
      woundThreshold: c.woundThreshold,
      startLocation: c.startLocation,
      ability: c.ability,
      abilityDescription: c.abilityDescription
    })))
  })

  /**
   * GET /game/items
   * Returns the list of all item cards (public metadata).
   */
  fastify.get('/items', async (request, reply) => {
    return reply.send(itemsData)
  })

  /**
   * GET /game/locations
   * Returns the list of board locations (static data).
   */
  fastify.get('/locations', async (request, reply) => {
    return reply.send(locationsData)
  })

  /**
   * GET /game/games
   * Returns a list of active/recent games (requires authentication).
   */
  fastify.get('/games', async (request, reply) => {
    if (!request.session || !request.session.isAuthenticated) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }
    return reply.send(db.listGames())
  })
}
