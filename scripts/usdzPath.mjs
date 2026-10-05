const GLB_URL = /^\/models\/[a-z0-9]+(?:-[a-z0-9]+)*\.glb$/

export function usdzUrlFor(modelUrl) {
  if (!GLB_URL.test(modelUrl)) {
    throw new Error(`Not a /models/<name>.glb URL: ${modelUrl}`)
  }
  return modelUrl.replace(/\.glb$/, '.usdz')
}
