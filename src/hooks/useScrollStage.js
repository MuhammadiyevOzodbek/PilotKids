import { useEffect } from 'react'
import { useScrollStore } from '../store/useScrollStore'

// Bo'lim-asosli scroll progress: global foiz o'rniga har bir [data-scroll-stage]
// bo'limning DOM pozitsiyasiga bog'lanadi. Bo'lim balandliklari har xil bo'lsa ham
// 3D holat ↔ kontent doim aniq sinxron bo'ladi (brifdagi "scroll balandligi
// noto'g'ri" xatosining oldini oladi).
//
// stage = i + frac: viewport markazi i-bo'lim markazidan i+1-bo'lim markazigacha
// qancha yo'l bosgan bo'lsa, shuncha frac. Har bo'lim markazida keyframe aniq
// "o'tiradi", oraliqda esa silliq o'tish bo'ladi.
export function useScrollStage(enabled = true) {
  useEffect(() => {
    if (!enabled) return

    const setStage = useScrollStore.getState().setStage
    let centers = []

    const measure = () => {
      const sections = document.querySelectorAll('[data-scroll-stage]')
      centers = Array.from(sections, (el) => {
        const rect = el.getBoundingClientRect()
        return rect.top + window.scrollY + rect.height / 2
      })
    }

    const update = () => {
      if (centers.length < 2) return
      const c = window.scrollY + window.innerHeight / 2
      if (c <= centers[0]) return setStage(0)
      const last = centers.length - 1
      if (c >= centers[last]) return setStage(last)
      // c qaysi ikki markaz orasida ekanini topamiz (8 ta element — arzon)
      let i = 0
      while (i < last && c > centers[i + 1]) i++
      setStage(i + (c - centers[i]) / (centers[i + 1] - centers[i]))
    }

    const onScroll = () => update()
    const onResize = () => { measure(); update() }

    measure()
    update()

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    // Kontent balandligi o'zgarsa (lazy chunk, AOS, rasm) markazlarni qayta o'lchaymiz
    const ro = new ResizeObserver(onResize)
    ro.observe(document.body)

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      ro.disconnect()
      setStage(0)
    }
  }, [enabled])
}
