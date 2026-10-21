import { posix } from 'node:path'

const importSpecifiers = (source) =>
  [...source.matchAll(/(?:\bfrom\s*|\bimport\s*\(?\s*)(['"])([^'"]+)\1/g)].map(
    (match) => match[2],
  )
const browserApi =
  /(?<![\w$./'"-])(?:window|document|localStorage|sessionStorage|navigator)\s*\.|(?<![\w$.])fetch\s*\(/
const relativeTarget = (path, specifier) =>
  posix.normalize(posix.join(posix.dirname(path), specifier)).split('/')[0]
const isPackage = (specifier, name) => specifier === name || specifier.startsWith(`${name}/`)
const rules = {
  app: {
    layers: ['app', 'views', 'presenters', 'models', 'infrastructure', 'shared'],
    packages: ['react', 'react-dom'],
  },
  infrastructure: {
    layers: ['infrastructure', 'models', 'shared'],
    packages: ['@perdiu/contracts', '@supabase/auth-js'],
  },
  models: { layers: ['models', 'shared'], packages: ['@perdiu/contracts'] },
  presenters: { layers: ['presenters', 'models', 'shared'], packages: ['@perdiu/contracts'] },
  shared: { layers: ['shared'], packages: [] },
  views: { layers: ['views', 'presenters', 'shared'], packages: ['react', 'lucide-react'] },
}

export function webLayerViolations(path, source) {
  const layer = path === 'main.tsx' ? 'app' : path.split('/')[0]
  const rule = rules[layer]
  if (!rule) return [`${path}: ubicar el archivo en una capa MVP reconocida.`]

  const violations = []
  const isReactAdapter = layer === 'presenters' && /^use[A-Z]\w*\.ts$/.test(posix.basename(path))
  const allowedPackages = isReactAdapter ? [...rule.packages, 'react'] : rule.packages
  const specifiers = importSpecifiers(source)

  if (['models', 'presenters'].includes(layer) && path.endsWith('.tsx')) {
    violations.push(`${layer} no debe contener JSX; la interfaz pertenece a views.`)
  }
  if (['models', 'presenters'].includes(layer) && browserApi.test(source)) {
    violations.push(`${layer} no debe usar APIs del navegador.`)
  }

  for (const specifier of specifiers) {
    if (specifier.startsWith('.')) {
      const target = relativeTarget(path, specifier)
      if (!rule.layers.includes(target)) {
        violations.push(`${layer} no debe importar ${target} (${specifier}).`)
      }
    } else if (!allowedPackages.some((name) => isPackage(specifier, name))) {
      violations.push(
        layer === 'presenters' && isPackage(specifier, 'react')
          ? 'presenters no debe importar react fuera de un hook use*.ts.'
          : `${layer} no debe importar ${specifier}.`,
      )
    }
  }
  return violations
}
