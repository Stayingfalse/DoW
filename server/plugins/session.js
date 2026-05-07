'use strict'

const fp = require('fastify-plugin')
const fastifySession = require('@fastify/session')

module.exports = fp(async function (fastify) {
  await fastify.register(fastifySession, {
    secret: process.env.SESSION_SECRET || (() => {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('SESSION_SECRET environment variable must be set in production')
      }
      return 'dev-fallback-secret-not-for-production-use-only'
    })(),
    cookieName: 'dow_session',
    cookie: {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 86400000 // 24 hours (milliseconds)
    },
    saveUninitialized: false
  })
})
