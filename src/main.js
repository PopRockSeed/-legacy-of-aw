import './style.css'
import { mountMeshViewer } from './meshViewer.js'

const app = document.getElementById('app')
let currentDir = ''
let lightboxCleanup = null

function assetUrl(dir, name) {
  return '/resource/' + [dir, name].filter(Boolean).map(encodeURIComponent).join('/')
}

async function fetchJSON(url) {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`${url} -> ${r.status}`)
  return r.json()
}

function renderShell() {
  app.innerHTML = `
    <header>
      <h1>Resource Browser</h1>
      <nav id="crumbs" class="crumbs"></nav>
    </header>
    <main>
      <aside class="sidebar">
        <div class="side-title">Categories</div>
        <ul id="cats"></ul>
      </aside>
      <section id="content" class="content"></section>
    </main>
    <div id="lightbox" class="lightbox hidden"></div>
  `
}

async function loadCategories() {
  const cats = document.getElementById('cats')
  cats.innerHTML = '<li class="muted">loading…</li>'
  const list = await fetchJSON('/api/categories')
  cats.innerHTML = list
    .map(
      (c) =>
        `<li><button class="cat ${c === currentDir ? 'active' : ''}" data-dir="${c}">${c}</button></li>`,
    )
    .join('')
  cats.querySelectorAll('.cat').forEach((b) =>
    b.addEventListener('click', () => go(b.dataset.dir)),
  )
}

function renderCrumbs() {
  const crumbs = document.getElementById('crumbs')
  const parts = currentDir ? currentDir.split('/') : []
  let html = `<button class="crumb" data-dir="">resource</button>`
  let acc = ''
  for (const p of parts) {
    acc = acc ? acc + '/' + p : p
    html += `<span class="sep">/</span><button class="crumb" data-dir="${acc}">${p}</button>`
  }
  crumbs.innerHTML = html
  crumbs.querySelectorAll('.crumb').forEach((b) =>
    b.addEventListener('click', () => go(b.dataset.dir)),
  )
}

async function load(dir) {
  const content = document.getElementById('content')
  content.innerHTML = '<p class="muted">loading…</p>'
  let data
  try {
    data = await fetchJSON('/api/list?dir=' + encodeURIComponent(dir))
  } catch (e) {
    content.innerHTML = '<p class="err">Failed to load: ' + e.message + '</p>'
    return
  }
  let html = ''
  if (data.dirs.length) {
    html += '<div class="grid folders">'
    for (const d of data.dirs) {
      const sub = dir ? dir + '/' + d : d
      html += `<button class="folder" data-dir="${sub}"><span class="ico">📁</span>${d}</button>`
    }
    html += '</div>'
  }
  if (data.files.length) {
    html += '<div class="grid thumbs">'
    for (const f of data.files) {
      const src = assetUrl(dir, f.name)
      if (f.ext === 'mp4' || f.ext === 'webm') {
        html += `<button class="thumb" data-type="video" data-src="${src}">
          <span class="play">▶</span>
          <div class="tlabel">${f.name}</div>
        </button>`
      } else {
        html += `<button class="thumb" data-type="image" data-src="${src}">
          <img loading="lazy" src="${src}" alt="${f.name}" />
          <div class="tlabel">${f.name}</div>
        </button>`
      }
    }
    html += '</div>'
  }
  if (!data.dirs.length && !data.files.length) {
    html = '<p class="muted">No browseable images or videos here.</p>'
  }
  content.innerHTML = html
  content.querySelectorAll('.folder').forEach((b) =>
    b.addEventListener('click', () => go(b.dataset.dir)),
  )
  content.querySelectorAll('.thumb').forEach((b) =>
    b.addEventListener('click', () => openLightbox(b.dataset.type, b.dataset.src)),
  )
}

function go(dir) {
  currentDir = dir || ''
  renderCrumbs()
  loadCategories()
  load(currentDir)
}

function openLightbox(type, src) {
  const lb = document.getElementById('lightbox')
  if (type === 'mesh') {
    lb.classList.remove('hidden')
    lb.innerHTML = `<div class="lb-canvas"><button class="lb-close">✕</button><div class="lb-mount" id="lbMount"></div></div>`
    const mount = document.getElementById('lbMount')
    mountMeshViewer(mount, src).then((c) => (lightboxCleanup = c))
  } else {
    const el =
      type === 'video'
        ? `<video src="${src}" controls autoplay></video>`
        : `<img src="${src}" />`
    lb.innerHTML = `<div class="lb-inner"><button class="lb-close">✕</button>${el}</div>`
    lb.classList.remove('hidden')
  }
  lb.querySelector('.lb-close').onclick = closeLightbox
  lb.onclick = (e) => {
    if (e.target === lb) closeLightbox()
  }
}

function closeLightbox() {
  const lb = document.getElementById('lightbox')
  lb.classList.add('hidden')
  if (lightboxCleanup) {
    lightboxCleanup()
    lightboxCleanup = null
  }
  lb.innerHTML = ''
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeLightbox()
})

renderShell()
go('')
