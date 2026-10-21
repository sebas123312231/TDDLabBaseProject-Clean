import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App.js'
import './views/styles.css'

const root = document.getElementById('root')
if (!root) throw new Error('No se encontró el punto de entrada de PerdiU.')
createRoot(root).render(<StrictMode><App /></StrictMode>)
