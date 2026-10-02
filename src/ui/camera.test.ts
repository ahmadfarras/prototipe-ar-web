import { afterEach, describe, expect, it, vi } from 'vitest'
import { cameraFailureReason } from './camera'

function stubDevices(enumerateDevices: () => Promise<{ kind: string }[]>) {
  vi.stubGlobal('navigator', { mediaDevices: { enumerateDevices } })
}

afterEach(() => vi.unstubAllGlobals())

describe('cameraFailureReason', () => {
  it('blames the permission when a camera exists', async () => {
    stubDevices(async () => [{ kind: 'audioinput' }, { kind: 'videoinput' }])

    expect(await cameraFailureReason()).toBe('permission-denied')
  })

  it.each([
    ['there is no camera', async () => [{ kind: 'audioinput' }]],
    ['there are no devices', async () => []],
    ['the device list fails', () => Promise.reject(new Error('blocked'))],
  ])('reports no camera when %s', async (_label, enumerateDevices) => {
    stubDevices(enumerateDevices)

    expect(await cameraFailureReason()).toBe('no-camera')
  })
})
