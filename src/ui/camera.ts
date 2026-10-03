export type CameraError = 'permission-denied' | 'no-camera'

// getUserMedia fails the same way for both cases on some browsers, so the
// device list decides.
export async function cameraFailureReason(): Promise<CameraError> {
  const devices = await navigator.mediaDevices
    .enumerateDevices()
    .catch((): MediaDeviceInfo[] => [])
  return devices.some((device) => device.kind === 'videoinput')
    ? 'permission-denied'
    : 'no-camera'
}
