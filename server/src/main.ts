import { loadConfig } from './app/config.ts'
import { createServer } from './app/server.ts'

const LISTEN_HOST = '127.0.0.1'

const config = loadConfig(process.env)
const { app } = await createServer(config.databaseUrl, {
  cookieSecure: config.cookieSecure,
  trustProxy: config.trustProxy,
  logger: true,
})

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => void app.close())
}

await app.listen({ port: config.port, host: LISTEN_HOST })
