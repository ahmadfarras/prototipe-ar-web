import { useId } from 'react'
import type { RegisteredTarget } from '../../domain/targetManifest'

type Props = {
  targets: readonly RegisteredTarget[]
}

export function RegisteredTargets({ targets }: Props) {
  const headingId = useId()

  return (
    <section aria-labelledby={headingId} className="mt-8">
      <h2 id={headingId} className="text-lg font-semibold text-slate-900">
        Images you can scan
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        Point the camera at one of these registered products, printed or on
        another screen. Tap an image to open it full size.
      </p>
      <ul className="mt-3 grid grid-cols-2 gap-4">
        {targets.map((target) => (
          <li key={target.imageUrl}>
            <a
              href={target.imageUrl}
              target="_blank"
              rel="noopener"
              className="block"
            >
              <img
                src={target.imageUrl}
                alt={`Scan target: ${target.name}`}
                loading="lazy"
                decoding="async"
                className="aspect-[3/4] w-full rounded-lg border border-slate-200 bg-slate-100 object-contain"
              />
              <span className="mt-2 block text-sm font-medium text-slate-900 underline">
                {target.name}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}
