import { useEffect, useRef } from "react"
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  ConeGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Scene,
  WebGLRenderer,
} from "three"

/* Contornos fatiados do STL oficial do 3DBenchy, de Daniel Norée / Creative Tools (CC0).
   O bico segue cada segmento da camada atual; o filamento novo brilha em roxo.
   A malha é carregada à parte para manter o formulário leve. */
type PrintLayer = { start: number; count: number; height: number }
type BoatLayers = { positions: number[]; layers: PrintLayer[] }

const PRINT_SECONDS = 16
const HOLD_SECONDS = 4
const FADE_SECONDS = 1.2

const HOT = new Color("#a75eff")
const WARM = new Color("#d5b2ff")
const COLD_LOW = new Color("#43394f")
const COLD_HIGH = new Color("#d5c8e5")

function buildGeometry(data: BoatLayers) {
  const g = new BufferGeometry()
  g.setAttribute("position", new BufferAttribute(new Float32Array(data.positions), 3))
  g.setAttribute("color", new BufferAttribute(new Float32Array(data.positions.length), 3))
  return g
}

/** Pinta as camadas: as recém-impressas quentes, as antigas no cinza de altura. */
function paint(colors: BufferAttribute, current: number, layers: PrintLayer[]) {
  const LAYERS = layers.length
  const arr = colors.array as Float32Array
  const c = new Color()
  for (let l = 0; l < LAYERS; l++) {
    const age = current - l
    const t = l / (LAYERS - 1)
    c.copy(COLD_LOW).lerp(COLD_HIGH, 0.35 + t * 0.65)
    if (age >= 0 && age < 9) {
      const heat = 1 - age / 9
      c.lerp(age < 1.5 ? HOT : WARM, heat * heat)
      if (age < 1.5) c.copy(HOT)
    }
    const start = layers[l].start * 3
    const end = start + layers[l].count * 3
    for (let i = start; i < end; i += 3) {
      arr[i] = c.r; arr[i + 1] = c.g; arr[i + 2] = c.b
    }
  }
  colors.needsUpdate = true
}

function mountScene(el: HTMLDivElement, data: BoatLayers) {
  const LAYERS = data.layers.length
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches

  let renderer: WebGLRenderer
  try {
    renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" })
  } catch {
    return // sem WebGL: o fundo da seção já basta
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setClearColor(0x000000, 0)
  renderer.domElement.setAttribute("aria-hidden", "true")
  renderer.domElement.style.display = "block"
  el.appendChild(renderer.domElement)

  const scene = new Scene()
  const camera = new PerspectiveCamera(32, 1, 0.1, 100)
  camera.position.set(3.6, 3.3, 7.5)
  camera.lookAt(0, 1.3, 0)

  const piece = new Group()
  scene.add(piece)

  const geo = buildGeometry(data)
  const mat = new LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 1 })
  const lines = new LineSegments(geo, mat)
  piece.add(lines)
  const colors = geo.getAttribute("color") as BufferAttribute

  // Mesa: pontos em grade, como a placa texturizada.
  const bedPts: number[] = []
  for (let x = -14; x <= 14; x++)
    for (let z = -14; z <= 14; z++) {
      const d = Math.hypot(x, z)
      if (d <= 14) bedPts.push(x * 0.15, -0.02, z * 0.15)
    }
  const bedGeo = new BufferGeometry()
  bedGeo.setAttribute("position", new BufferAttribute(new Float32Array(bedPts), 3))
  const bed = new Points(bedGeo, new PointsMaterial({ color: 0x4a4d55, size: 0.025, transparent: true, opacity: 0.8 }))
  scene.add(bed)

  // Bico e o brilho do filamento saindo.
  const nozzle = new Mesh(new ConeGeometry(0.07, 0.22, 20), new MeshBasicMaterial({ color: 0xd8dade }))
  nozzle.rotation.x = Math.PI
  const glowGeo = new BufferGeometry()
  glowGeo.setAttribute("position", new BufferAttribute(new Float32Array([0, 0, 0]), 3))
  const glow = new Points(
    glowGeo,
    new PointsMaterial({ color: HOT, size: 0.35, transparent: true, opacity: 0.55, blending: AdditiveBlending, depthWrite: false })
  )
  piece.add(nozzle, glow)

  let pointerX = 0
  let pointerY = 0
  const onPointer = (e: PointerEvent) => {
    const r = el.getBoundingClientRect()
    pointerX = ((e.clientX - r.left) / r.width - 0.5) * 2
    pointerY = ((e.clientY - r.top) / r.height - 0.5) * 2
  }
  window.addEventListener("pointermove", onPointer, { passive: true })

  let running = false

  const resize = () => {
    const w = el.clientWidth
    const h = el.clientHeight
    if (!w || !h) return
    renderer.setSize(w, h, false)
    renderer.domElement.style.width = w + "px"
    renderer.domElement.style.height = h + "px"
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    // Mudar o tamanho apaga o canvas: com a animação parada, desenha de novo na hora.
    if (!running) renderer.render(scene, camera)
  }
  const posArr = geo.getAttribute("position").array as Float32Array

  function setProgress(p: number) {
    const layer = Math.min(LAYERS - 1, Math.floor(p))
    const info = data.layers[layer]
    const frac = p >= LAYERS ? 1 : p - layer
    const vertices = info.start + Math.floor(frac * info.count / 2) * 2
    geo.setDrawRange(0, p >= LAYERS ? posArr.length / 3 : vertices)
    const idx = Math.max(0, vertices - 1) * 3
    const x = posArr[idx], y = posArr[idx + 1], z = posArr[idx + 2]
    nozzle.position.set(x, y + 0.14, z)
    glowGeo.attributes.position.setXYZ(0, x, y, z)
    glowGeo.attributes.position.needsUpdate = true
    nozzle.visible = p < LAYERS
    glow.visible = p < LAYERS
  }

  let lastPainted = -1
  let start = performance.now()
  let raf = 0

  function frame(now: number) {
    const t = (now - start) / 1000
    const cycle = PRINT_SECONDS + HOLD_SECONDS + FADE_SECONDS
    const ct = t % cycle
    let p: number
    let opacity = 1
    if (ct < PRINT_SECONDS) {
      // Começa mais rápido nas camadas largas de baixo e desacelera um pouco no topo.
      const k = ct / PRINT_SECONDS
      p = (1 - Math.pow(1 - k, 1.35)) * LAYERS
    } else if (ct < PRINT_SECONDS + HOLD_SECONDS) {
      p = LAYERS
    } else {
      p = LAYERS
      opacity = 1 - (ct - PRINT_SECONDS - HOLD_SECONDS) / FADE_SECONDS
    }
    const layer = Math.floor(p)
    if (layer !== lastPainted) {
      paint(colors, p >= LAYERS ? LAYERS + 20 : layer, data.layers)
      lastPainted = layer
    }
    setProgress(p)
    mat.opacity = opacity

    piece.rotation.y = -0.32 + Math.sin(t * 0.18) * 0.32 + pointerX * 0.16
    piece.rotation.x += (pointerY * 0.06 - piece.rotation.x) * 0.05
    bed.rotation.y = piece.rotation.y

    renderer.render(scene, camera)
    raf = requestAnimationFrame(frame)
  }

  function play() {
    if (running || reduce) return
    running = true
    raf = requestAnimationFrame(frame)
  }
  function pause() {
    running = false
    cancelAnimationFrame(raf)
  }

  if (reduce) {
    // Sem animação: peça pronta, parada, num ângulo bonito.
    paint(colors, LAYERS + 20, data.layers)
    setProgress(LAYERS)
    piece.rotation.y = -0.32
  } else {
    paint(colors, LAYERS + 20, data.layers)
    setProgress(LAYERS)
    piece.rotation.y = -0.32
  }
  // Primeiro tamanho e primeiro quadro só depois de a peça estar no estado inicial.
  const ro = new ResizeObserver(resize)
  ro.observe(el)
  resize()

  // Só anima quando está na tela e a aba está visível.
  let visible = true
  const io = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting
    if (visible && !document.hidden) play()
    else pause()
  })
  io.observe(el)
  const onVis = () => (document.hidden || !visible ? pause() : play())
  document.addEventListener("visibilitychange", onVis)
  start = performance.now() - (PRINT_SECONDS + 0.2) * 1000

  return () => {
    pause()
    io.disconnect()
    ro.disconnect()
    document.removeEventListener("visibilitychange", onVis)
    window.removeEventListener("pointermove", onPointer)
    geo.dispose()
    mat.dispose()
    bedGeo.dispose()
    ;(bed.material as PointsMaterial).dispose()
    glowGeo.dispose()
    ;(glow.material as PointsMaterial).dispose()
    nozzle.geometry.dispose()
    ;(nozzle.material as MeshBasicMaterial).dispose()
    renderer.dispose()
    renderer.domElement.remove()
  }
}

export default function PrintScene({ className }: { className?: string }) {
  const host = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const controller = new AbortController()
    let dispose: (() => void) | undefined
    const el = host.current
    if (!el) return
    void fetch(import.meta.env.BASE_URL + "models/benchy-layers.json", { signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error("Prévia 3DBenchy indisponível")
        return response.json() as Promise<BoatLayers>
      })
      .then(data => {
        if (!controller.signal.aborted) dispose = mountScene(el, data)
      })
      .catch(error => {
        if (!controller.signal.aborted) console.warn("Não foi possível carregar a prévia 3D.", error)
      })
    return () => {
      controller.abort()
      dispose?.()
    }
  }, [])

  return <div ref={host} className={className} role="img" aria-label="Animação da impressão por camadas do barquinho 3DBenchy em roxo" />
}
