'use strict'

const fp = require('fastify-plugin')
const fastifyCookie = require('@fastify/cookie')

module.exports = fp(async function (fastify) {
  await fastify.register(fastifyCookie)
})
