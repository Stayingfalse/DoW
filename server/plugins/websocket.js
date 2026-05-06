'use strict'

const fp = require('fastify-plugin')
const fastifyWebsocket = require('@fastify/websocket')

module.exports = fp(async function (fastify) {
  await fastify.register(fastifyWebsocket, {
    options: { maxPayload: 1048576 }
  })
})
