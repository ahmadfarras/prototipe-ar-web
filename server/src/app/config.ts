export type Config = {
  databaseUrl: string
  port: number
  cookieSecure: boolean
  trustProxy: boolean
}

type Env = Record<string, string | undefined>

const DEFAULT_PORT = 3000
const MAX_PORT = 65535

export function loadConfig(env: Env): Config {
  return {
    databaseUrl: readDatabaseUrl(env.DATABASE_URL),
    port: readPort(env.PORT),
    cookieSecure: readBoolean('COOKIE_SECURE', env.COOKIE_SECURE, true),
    trustProxy: readBoolean('TRUST_PROXY', env.TRUST_PROXY, false),
  }
}

// Messages never include the value: DATABASE_URL holds a password.
function readDatabaseUrl(value: string | undefined): string {
  const protocol = value && URL.canParse(value) ? new URL(value).protocol : ''
  if (protocol !== 'postgres:' && protocol !== 'postgresql:') {
    throw new Error('DATABASE_URL must be a postgres:// URL')
  }
  return value!
}

function readPort(value: string | undefined): number {
  if (value === undefined) return DEFAULT_PORT
  const port = Number(value)
  if (!Number.isInteger(port) || port < 1 || port > MAX_PORT) {
    throw new Error(`PORT must be an integer between 1 and ${MAX_PORT}`)
  }
  return port
}

function readBoolean(
  name: string,
  value: string | undefined,
  fallback: boolean,
): boolean {
  if (value === undefined) return fallback
  if (value === 'true') return true
  if (value === 'false') return false
  throw new Error(`${name} must be "true" or "false"`)
}
