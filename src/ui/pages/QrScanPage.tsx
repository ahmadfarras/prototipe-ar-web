import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  buildProductPath,
  parseProductLink,
  VIEW_IN_AR_PATH,
} from '../../domain/productLink'
import { QrScanner, type ScanError } from '../components/QrScanner'

const ERROR_MESSAGES: Record<ScanError, string> = {
  'permission-denied':
    'Camera access was blocked. Allow camera access for this site and reload.',
  'no-camera':
    'No camera is available. The scanner needs a camera and a secure (HTTPS) connection.',
}

export function QrScanPage() {
  const navigate = useNavigate()
  const hasNavigated = useRef(false)
  const [error, setError] = useState<ScanError | null>(null)
  const [isUnrecognised, setIsUnrecognised] = useState(false)

  function handleResult(text: string) {
    if (hasNavigated.current) return

    const slug = parseProductLink(text)
    if (!slug) {
      setIsUnrecognised(true)
      return
    }

    hasNavigated.current = true
    void navigate(buildProductPath(slug))
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-slate-900">Scan QR code</h1>
      {error ? (
        <>
          <p role="alert" className="mt-2 text-red-700">
            {ERROR_MESSAGES[error]}
          </p>
          <Link
            to={VIEW_IN_AR_PATH}
            className="mt-4 inline-block font-semibold underline"
          >
            Browse products instead
          </Link>
        </>
      ) : (
        <>
          <p className="mt-2 mb-4 text-slate-600">
            Point the camera at the QR code on the product.
          </p>
          <QrScanner onResult={handleResult} onError={setError} />
          {isUnrecognised && (
            <output className="mt-3 block text-sm text-slate-600">
              That QR code is not a product code. Try another one.
            </output>
          )}
        </>
      )}
    </>
  )
}
