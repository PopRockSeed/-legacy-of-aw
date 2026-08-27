import { defineConfig } from 'vite'
import fs from 'fs'
import path from 'path'

const RESOURCE = path.resolve(__dirname, 'resource')

const IMAGE_EXT = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp'])
const VIDEO_EXT = new Set(['mp4', 'webm'])
const MESH_EXT = new Set(['mesh'])
const MIME = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
  gif: 'image/gif', webp: 'image/webp', mp4: 'video/mp4', webm: 'video/webm',
  mesh: 'application/octet-stream',
}

function listDir(relDir) {
  const abs = path.resolve(RESOURCE, relDir)
  if (abs !== RESOURCE && !abs.startsWith(RESOURCE + path.sep)) {
    throw new Error('forbidden')
  }
  const entries = fs.readdirSync(abs, { withFileTypes: true })
  const dirs = []
  const files = []
  for (const e of entries) {
    if (e.isDirectory()) dirs.push(e.name)
    else if (e.isFile()) {
      const ext = e.name.split('.').pop().toLowerCase()
      if (IMAGE_EXT.has(ext) || VIDEO_EXT.has(ext) || MESH_EXT.has(ext))
        files.push({ name: e.name, ext })
    }
  }
  dirs.sort()
  files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
  return { dirs, files }
}

export default defineConfig({
  plugins: [
    {
      name: 'asset-browser-api',
      configureServer(server) {
        // serve files under /resource/
        server.middlewares.use((req, res, next) => {
          if (!req.url.startsWith('/resource/')) return next()
          const rel = decodeURIComponent(req.url.slice('/resource/'.length).split('?')[0])
          const abs = path.join(RESOURCE, rel)
          if (abs !== RESOURCE && !abs.startsWith(RESOURCE + path.sep)) {
            res.statusCode = 403
            return res.end()
          }
          fs.stat(abs, (err, stat) => {
            if (err || !stat.isFile()) { res.statusCode = 404; return res.end() }
            const ext = path.extname(abs).slice(1).toLowerCase()
            res.setHeader('content-type', MIME[ext] || 'application/octet-stream')
            fs.createReadStream(abs).pipe(res)
          })
        })

        // API routes
        server.middlewares.use((req, res, next) => {
          const url = new URL(req.url, 'http://localhost')
          if (url.pathname === '/api/categories') {
            const cats = fs.readdirSync(RESOURCE, { withFileTypes: true })
              .filter((d) => d.isDirectory()).map((d) => d.name).sort()
            res.setHeader('content-type', 'application/json')
            return res.end(JSON.stringify(cats))
          }
          if (url.pathname === '/api/list') {
            try {
              const dir = url.searchParams.get('dir') || ''
              const data = listDir(dir)
              res.setHeader('content-type', 'application/json')
              return res.end(JSON.stringify(data))
            } catch (err) {
              res.statusCode = 403
              return res.end('Forbidden')
            }
          }
          next()
        })
      },
    },
  ],
  publicDir: false,
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true,
    watch: { ignored: ['**/resource/**'] },
  },
})
