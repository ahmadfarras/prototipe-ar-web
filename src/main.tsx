import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { productCatalog } from './app/container'
import { createRoutes } from './app/router'
import './index.css'

const router = createBrowserRouter(createRoutes(productCatalog))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
