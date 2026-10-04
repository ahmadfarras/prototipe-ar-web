import { describe, expect, it } from 'vitest'
import { loadConfig } from './config.ts'

const DATABASE_URL = 'postgres://user:secret@localhost:5432/db'

describe('loadConfig', () => {
  it('applies safe defaults', () => {
    expect(loadConfig({ DATABASE_URL })).toEqual({
      databaseUrl: DATABASE_URL,
      host: '127.0.0.1',
      port: 3000,
      cookieSecure: true,
      trustProxy: false,
    })
  })

  it('reads every value', () => {
    expect(
      loadConfig({
        DATABASE_URL: 'postgresql://localhost/db',
        HOST: '0.0.0.0',
        PORT: '8080',
        COOKIE_SECURE: 'false',
        TRUST_PROXY: 'true',
      }),
    ).toEqual({
      databaseUrl: 'postgresql://localhost/db',
      host: '0.0.0.0',
      port: 8080,
      cookieSecure: false,
      trustProxy: true,
    })
  })

  it.each([undefined, '', 'not a url', 'mysql://localhost/db'])(
    'rejects the database URL %j',
    (value) => {
      expect(() => loadConfig({ DATABASE_URL: value })).toThrow(
        'DATABASE_URL must be a postgres:// URL',
      )
    },
  )

  it('does not leak the database URL in the error', () => {
    expect(() =>
      loadConfig({ DATABASE_URL: 'mysql://user:secret@host/db' }),
    ).not.toThrow(/secret/)
  })

  it.each(['localhost', '0.0.0', 'api', ''])('rejects the host %j', (HOST) => {
    expect(() => loadConfig({ DATABASE_URL, HOST })).toThrow(
      'HOST must be an IP address',
    )
  })

  it('accepts an IPv6 host', () => {
    expect(loadConfig({ DATABASE_URL, HOST: '::' }).host).toBe('::')
  })

  it.each(['0', '65536', '80.5', 'abc', ''])('rejects the port %j', (PORT) => {
    expect(() => loadConfig({ DATABASE_URL, PORT })).toThrow('PORT must be')
  })

  it.each(['COOKIE_SECURE', 'TRUST_PROXY'])(
    'rejects a %s that is not true or false',
    (name) => {
      expect(() => loadConfig({ DATABASE_URL, [name]: 'yes' })).toThrow(
        `${name} must be "true" or "false"`,
      )
    },
  )
})
