import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

// Ogre3D Mesh Serializer v1.41 chunk ids
const M_HEADER = 0x1000
const M_MESH = 0x3000
const M_SUBMESH = 0x4000
const M_GEOMETRY = 0x5000
const M_VERTEX_DECL = 0x5100
const M_VERTEX_ELEMENT = 0x5110
const M_VERTEX_BUFFER = 0x5200
// sub-chunks we can simply skip (their length includes the 6-byte header)
const SKIP = new Set([0x4010 /* operation */, 0x4080 /* bone assignment */, 0x4100 /* tex alias */, 0xa000 /* edge list */])

// vertex element type -> byte size (this game's variant)
const TYPE_SIZE = { 0: 4, 1: 12, 2: 8, 3: 16, 5: 4, 7: 8 }
function typeSize(t) {
  return TYPE_SIZE[t] || 4
}

function readLine(u, p) {
  let e = p
  while (e < u.length && u[e] !== 0x0a) e++
  return [new TextDecoder().decode(u.subarray(p, e)), e + 1]
}

function parseSubmesh(dv, u, p) {
  let b = p + 6
  const [material, b2] = readLine(u, b)
  b = b2
  const useShared = u[b]
  b += 1
  const idxCount = dv.getUint32(b, true)
  b += 4
  const idx32 = u[b]
  b += 1
  const idx = new Uint32Array(idxCount)
  for (let i = 0; i < idxCount; i++)
    idx[i] = idx32 ? dv.getUint32(b + i * 4, true) : dv.getUint16(b + i * 2, true)
  b += idxCount * (idx32 ? 4 : 2)

  if (dv.getUint16(b, true) !== M_GEOMETRY) return null
  const glen = dv.getUint32(b + 2, true) // includes 6-byte header
  let g = b + 6
  const vc = dv.getUint32(g, true)
  g += 4
  const gend = b + glen

  let decl = []
  let stride = 12
  let vstart = 0
  while (g < gend) {
    const cid = dv.getUint16(g, true)
    const clen = dv.getUint32(g + 2, true) // includes header
    if (cid === M_VERTEX_DECL) {
      let gg = g + 6
      const gge = g + clen
      while (gg < gge) {
        const eid = dv.getUint16(gg, true)
        const elen = dv.getUint32(gg + 2, true) // includes header
        if (eid === M_VERTEX_ELEMENT) {
          const o = gg + 6
          const typ = dv.getUint16(o + 4, true)
          const oft = dv.getUint16(o + 6, true)
          const sz = typeSize(typ)
          decl.push({ typ, oft, sz })
          if (oft + sz > stride) stride = oft + sz
        }
        gg += elen
      }
    } else if (cid === M_VERTEX_BUFFER) {
      const body = g + 6
      const bodyLen = clen - 6
      const headerLen = bodyLen - stride * vc
      vstart = headerLen >= 0 && headerLen <= 64 ? body + headerLen : body
    }
    g += clen
  }

  // position = 3 floats; prefer the 12-byte element at offset 0
  const pe = decl.find((d) => d.oft === 0 && d.sz === 12) || { oft: 0 }
  const positions = new Float32Array(vc * 3)
  for (let i = 0; i < vc; i++) {
    const base = vstart + i * stride + pe.oft
    positions[i * 3] = dv.getFloat32(base, true)
    positions[i * 3 + 1] = dv.getFloat32(base + 4, true)
    positions[i * 3 + 2] = dv.getFloat32(base + 8, true)
  }
  return { material, idx, positions, vc, gend }
}

function parseOgreMesh(buf) {
  const dv = new DataView(buf)
  const u = new Uint8Array(buf)
  const L = buf.byteLength
  if (dv.getUint16(0, true) !== M_HEADER) throw new Error('Not an Ogre .mesh file')
  let e = 2
  while (e < L && u[e] !== 0x0a) e++
  let pos = e + 1 // past version line
  if (dv.getUint16(pos, true) !== M_MESH) throw new Error('Missing MESH chunk')
  pos += 6 + 1 // mesh header + leading bool

  const subs = []
  let guard = 0
  while (pos < L - 6 && guard++ < 64) {
    const cid = dv.getUint16(pos, true)
    if (cid === M_SUBMESH) {
      const s = parseSubmesh(dv, u, pos)
      if (s) {
        subs.push({ material: s.material, idx: s.idx, positions: s.positions, vc: s.vc })
        pos = s.gend
      } else {
        break
      }
    } else if (SKIP.has(cid)) {
      pos += dv.getUint32(pos + 2, true)
    } else {
      break
    }
  }
  return subs
}

export async function mountMeshViewer(container, url) {
  container.innerHTML = '<div class="mv-loading">Loading 3D…</div>'
  let buf
  try {
    const r = await fetch(url)
    buf = await r.arrayBuffer()
  } catch (err) {
    container.innerHTML = '<div class="err">Failed to load mesh: ' + err.message + '</div>'
    return () => {}
  }

  let subs
  try {
    subs = parseOgreMesh(buf)
  } catch (err) {
    container.innerHTML = '<div class="err">' + err.message + '</div>'
    return () => {}
  }
  if (!subs.length) {
    container.innerHTML = '<div class="err">No renderable geometry found in this .mesh.</div>'
    return () => {}
  }

  const W = container.clientWidth || 800
  const H = container.clientHeight || 600
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x14161d)
  const grid = new THREE.GridHelper(100, 20, 0x2a3040, 0x1c2029)
  grid.material.transparent = true
  grid.material.opacity = 0.5
  scene.add(grid)

  const box = new THREE.Box3()
  let triCount = 0
  const palette = [0x4f9cff, 0xff8a3d, 0x6be083, 0xe06bd8, 0xffd23d, 0x7ad7e0]
  subs.forEach((s, si) => {
    const geom = new THREE.BufferGeometry()
    geom.setAttribute('position', new THREE.BufferAttribute(s.positions, 3))
    const maxIdx = s.idx.reduce((m, v) => (v > m ? v : m), 0)
    geom.setIndex(new THREE.BufferAttribute(s.idx, maxIdx > 65534 ? 32 : 16))
    geom.computeVertexNormals()
    const mat = new THREE.MeshStandardMaterial({
      color: palette[si % palette.length],
      metalness: 0.1,
      roughness: 0.7,
      side: THREE.DoubleSide,
      flatShading: true,
    })
    const mesh = new THREE.Mesh(geom, mat)
    scene.add(mesh)
    triCount += s.idx.length / 3
    box.setFromPoints([geom.attributes.position.array])
  })

  // frame the camera around the combined bounds
  const sphere = new THREE.Sphere()
  box.makeEmpty()
  subs.forEach((s) => {
    const p = s.positions
    for (let i = 0; i < p.length; i += 3) box.expandByPoint(new THREE.Vector3(p[i], p[i + 1], p[i + 2]))
  })
  box.getBoundingSphere(sphere)

  const cam = new THREE.PerspectiveCamera(50, W / H, 0.01, 5000)
  const r = Math.max(1, sphere.radius)
  cam.position.set(sphere.center.x + r * 1.6, sphere.center.y + r * 1.2, sphere.center.z + r * 1.8)
  cam.lookAt(sphere.center)

  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(W, H)
  renderer.setPixelRatio(window.devicePixelRatio)
  container.innerHTML = ''
  container.appendChild(renderer.domElement)
  renderer.domElement.style.display = 'block'

  scene.add(new THREE.HemisphereLight(0xffffff, 0x404040, 1.1))
  const dir = new THREE.DirectionalLight(0xffffff, 1.2)
  dir.position.set(1, 2, 1.5)
  scene.add(dir)

  const controls = new OrbitControls(cam, renderer.domElement)
  controls.target.copy(sphere.center)
  controls.update()

  const info = document.createElement('div')
  info.className = 'mv-info'
  info.textContent = `${subs.length} submesh · ${triCount} tris · drag to orbit`
  container.appendChild(info)

  let raf = 0
  function loop() {
    raf = requestAnimationFrame(loop)
    controls.update()
    renderer.render(scene, cam)
  }
  loop()

  const ro = new ResizeObserver(() => {
    const w = container.clientWidth
    const h = container.clientHeight
    if (w && h) {
      cam.aspect = w / h
      cam.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
  })
  ro.observe(container)

  let disposed = false
  return function cleanup() {
    if (disposed) return
    disposed = true
    cancelAnimationFrame(raf)
    ro.disconnect()
    controls.dispose()
    renderer.dispose()
    subs.forEach((s) => {})
  }
}
