import * as THREE from 'three'

// Har bir scroll bosqichi (data-scroll-stage bo'limlari tartibida) uchun kamera va
// model holatlari. scale: 0 — model ko'rinmaydi (SceneController visible'ni o'chiradi).
// Yashirin model pozitsiyalari ham beriladi — model qayerdan "kirib kelishi"ni
// belgilaydi (masalan pastdan ko'tarilish).
//
// MUHIM tamoyil: kamera deyarli doim MARKAZGA qaraydi (look x≈0) — modellar esa
// yon tomonlarda (x=±2.2..3) joylashadi. Aks holda lookAt modelni ekran markaziga
// tortib, HTML kontent bilan to'qnashtiradi.
//
// Bosqichlar: 0 Hero · 1 About · 2 Benefits (elektronika) · 3 Roadmap (robot qo'l)
//             4 Pricing (hologramma) · 5 Achievements (kubok) · 6 Testimonials/FAQ
//             7 Final CTA (robot qaytadi, qo'l silkitadi)
export const MODEL_KEYS = ['robot', 'board', 'arm', 'holo', 'trophy']

export const KEYFRAMES = [
  // 0 — Hero: robot o'ng tomonda (matn chapda), salomlashib turadi
  {
    cam: [0, 0.35, 6.2], look: [0, 0.25, 0],
    models: {
      robot: { pos: [2.3, -0.1, 0], rotY: -0.3, scale: 0.95 },
      board: { pos: [2.7, 3.2, -1.6], rotY: -0.2, scale: 0 },
      arm: { pos: [-2.9, -3, -0.8], rotY: 0.5, scale: 0 },
      holo: { pos: [0, -2, -2.5], rotY: 0, scale: 0 },
      trophy: { pos: [3.1, -3.2, -0.6], rotY: -0.25, scale: 0 },
    },
  },
  // 1 — About: kamera biroz yaqinlashadi, robot chap tomonga o'tadi (matn o'ngda)
  {
    cam: [0, 0.3, 5.7], look: [0, 0.3, 0],
    models: {
      robot: { pos: [-2.4, -0.2, 0.2], rotY: 0.5, scale: 0.9 },
      board: { pos: [2.7, 3.2, -1.6], rotY: -0.2, scale: 0 },
      arm: { pos: [-2.9, -3, -0.8], rotY: 0.5, scale: 0 },
      holo: { pos: [0, -2, -2.5], rotY: 0, scale: 0 },
      trophy: { pos: [3.1, -3.2, -0.6], rotY: -0.25, scale: 0 },
    },
  },
  // 2 — Benefits: Arduino platasi yuqori-o'ngda (sarlavha yonida), robot pastga singadi
  {
    cam: [0, 0.4, 6], look: [0, 0.35, 0],
    models: {
      robot: { pos: [-2.4, -2.4, 0.2], rotY: 0.5, scale: 0 },
      board: { pos: [2.7, 1.9, -1.6], rotY: -0.2, scale: 0.7 },
      arm: { pos: [-2.9, -3, -0.8], rotY: 0.5, scale: 0 },
      holo: { pos: [0, -2, -2.5], rotY: 0, scale: 0 },
      trophy: { pos: [3.1, -3.2, -0.6], rotY: -0.25, scale: 0 },
    },
  },
  // 3 — Roadmap: RoboticArm pastki-chap burchakda yig'ilib harakatlanadi
  {
    cam: [0, 0.4, 6], look: [0, 0.3, 0],
    models: {
      robot: { pos: [-2.4, -2.4, 0.2], rotY: 0.5, scale: 0 },
      board: { pos: [2.7, 3.4, -1.6], rotY: 0.3, scale: 0 },
      arm: { pos: [-3.0, -1.25, -0.8], rotY: 0.5, scale: 0.75 },
      holo: { pos: [0, -2, -2.5], rotY: 0, scale: 0 },
      trophy: { pos: [3.1, -3.2, -0.6], rotY: -0.25, scale: 0 },
    },
  },
  // 4 — Pricing: HologramRing markazda, narx kartasi orqasida chuqurlikda
  {
    cam: [0, 0.45, 6.6], look: [0, 0.4, -0.5],
    models: {
      robot: { pos: [-2.4, -2.4, 0.2], rotY: 0.5, scale: 0 },
      board: { pos: [2.7, 3.4, -1.6], rotY: 0.3, scale: 0 },
      arm: { pos: [-2.9, -3.2, -0.8], rotY: 0.5, scale: 0 },
      holo: { pos: [0, 0.35, -2.5], rotY: 0, scale: 1.05 },
      trophy: { pos: [3.1, -3.2, -0.6], rotY: -0.25, scale: 0 },
    },
  },
  // 5 — Achievements: TrophyPodium pastki-o'ngdan ko'tariladi
  {
    cam: [0, 0.5, 6.2], look: [0, 0.4, 0],
    models: {
      robot: { pos: [-2.4, -2.4, 0.2], rotY: 0.5, scale: 0 },
      board: { pos: [2.7, 3.4, -1.6], rotY: 0.3, scale: 0 },
      arm: { pos: [-2.9, -3.2, -0.8], rotY: 0.5, scale: 0 },
      holo: { pos: [0, 2.2, -2.8], rotY: 0, scale: 0 },
      trophy: { pos: [3.2, -1.6, -0.6], rotY: -0.25, scale: 0.65 },
    },
  },
  // 6 — Testimonials/FAQ: tinch fon, modellar chekinadi (faqat sparkles muhiti)
  {
    cam: [0, 0.5, 7.6], look: [0, 0.25, 0],
    models: {
      robot: { pos: [0, -2.6, 0.3], rotY: 0, scale: 0 },
      board: { pos: [2.7, 3.4, -1.6], rotY: 0.3, scale: 0 },
      arm: { pos: [-2.9, -3.2, -0.8], rotY: 0.5, scale: 0 },
      holo: { pos: [0, 2.2, -2.8], rotY: 0, scale: 0 },
      trophy: { pos: [3.2, -3.4, -0.6], rotY: -0.25, scale: 0 },
    },
  },
  // 7 — Final CTA: robot yuqori-markazda qo'l silkitadi (matn pastda)
  {
    cam: [0, 0.5, 6], look: [0, 0.55, 0],
    models: {
      robot: { pos: [0, 1.15, 0], rotY: 0, scale: 0.65 },
      board: { pos: [2.7, 3.4, -1.6], rotY: 0.3, scale: 0 },
      arm: { pos: [-2.9, -3.2, -0.8], rotY: 0.5, scale: 0 },
      holo: { pos: [0, 2.2, -2.8], rotY: 0, scale: 0 },
      trophy: { pos: [3.2, -3.4, -0.6], rotY: -0.25, scale: 0 },
    },
  },
]

// Final CTA bosqichiga yaqinlashganda robot qo'l silkita boshlaydi
export const WAVE_THRESHOLD = 6.4

const smoothstep = (f) => f * f * (3 - 2 * f)
const _scratch = new THREE.Vector3()

// Interpolatsiya natijasi uchun qayta ishlatiladigan struktura — har frame'da
// yangi obyekt yaratilmaydi (GC bosimi yo'q).
export function createSample() {
  const models = {}
  for (const key of MODEL_KEYS) {
    models[key] = { pos: new THREE.Vector3(), rotY: 0, scale: 0 }
  }
  return { cam: new THREE.Vector3(), look: new THREE.Vector3(), models }
}

// stageFloat (masalan 2.4) bo'yicha ikki qo'shni keyframe orasida silliq
// interpolatsiya qilib, natijani `out` ga yozadi.
export function sampleStage(stageFloat, out) {
  const last = KEYFRAMES.length - 1
  const clamped = Math.min(Math.max(stageFloat, 0), last)
  const i = Math.min(Math.floor(clamped), last - 1)
  const f = smoothstep(clamped - i)
  const a = KEYFRAMES[i]
  const b = KEYFRAMES[i + 1]

  out.cam.fromArray(a.cam).lerp(_scratch.fromArray(b.cam), f)
  out.look.fromArray(a.look)
  out.look.x += (b.look[0] - a.look[0]) * f
  out.look.y += (b.look[1] - a.look[1]) * f
  out.look.z += (b.look[2] - a.look[2]) * f

  for (const key of MODEL_KEYS) {
    const ma = a.models[key]
    const mb = b.models[key]
    const m = out.models[key]
    m.pos.fromArray(ma.pos)
    m.pos.x += (mb.pos[0] - ma.pos[0]) * f
    m.pos.y += (mb.pos[1] - ma.pos[1]) * f
    m.pos.z += (mb.pos[2] - ma.pos[2]) * f
    m.rotY = ma.rotY + (mb.rotY - ma.rotY) * f
    m.scale = ma.scale + (mb.scale - ma.scale) * f
  }
}
