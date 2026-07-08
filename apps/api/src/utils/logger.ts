import pino from 'pino'
import pinoHttp from 'pino-http'
import { v4 as uuidv4 } from 'uuid'

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
})

export const loggerMiddleware = pinoHttp({
  logger,
  genReqId: (req, res) => {
    const id = req.headers['x-request-id'] || uuidv4()
    res.setHeader('X-Request-Id', id)
    return id
  },
})
