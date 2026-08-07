import { Icon } from "@/components/icon";
import { parseVideoUrl } from "@/lib/video";

/**
 * Dars videosi.
 *
 * YouTube/Vimeo uchun `<iframe>`, to'g'ridan-to'g'ri fayl uchun `<video>`,
 * havola yo'q (yoki tanib bo'lmadi) bo'lsa — o'rin egallovchi.
 *
 * Klient komponenti EMAS: hech qanday holat yo'q, shuning uchun server
 * tomonda render qilinadi va bundle'ga qo'shimcha JS tushmaydi.
 */
export function VideoPlayer({ url, title }: { url: string | null; title: string }) {
  const source = parseVideoUrl(url);

  return (
    <div
      style={{
        position: "relative",
        borderRadius: 22,
        overflow: "hidden",
        aspectRatio: "16/9",
        background: "linear-gradient(135deg,#16224a,#0B1220)",
        display: "grid",
        placeItems: "center",
        boxShadow: "var(--shadow)",
      }}
    >
      {source?.kind === "youtube" || source?.kind === "vimeo" ? (
        <iframe
          src={source.embedUrl}
          title={title}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          style={{ width: "100%", height: "100%", border: 0, display: "block" }}
        />
      ) : source?.kind === "file" ? (
        <video
          controls
          preload="metadata"
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        >
          <source src={source.embedUrl} />
          Brauzeringiz video formatini qo&apos;llab-quvvatlamaydi.
        </video>
      ) : (
        <div style={{ textAlign: "center", padding: 24 }}>
          <span
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: "rgba(255,255,255,.1)",
              display: "grid",
              placeItems: "center",
              margin: "0 auto 14px",
            }}
          >
            <Icon name="movie" size={34} color="#AEBBD4" />
          </span>
          <p style={{ color: "#AEBBD4", fontSize: 14.5, fontWeight: 600, margin: 0 }}>
            Video tayyorlanmoqda — quyidagi matnli darsdan foydalaning
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Kichik muqova — admin dars ro'yxatida va e'lon sahifasida.
 *
 * YouTube'da haqiqiy kadr ko'rsatiladi; qolgan hollarda kursning rangida
 * ijro belgisi.
 */
export function VideoThumb({
  url,
  color = "var(--primary)",
  soft = "var(--primary-soft)",
  width = 104,
}: {
  url: string | null;
  color?: string;
  soft?: string;
  width?: number;
}) {
  const source = parseVideoUrl(url);

  return (
    <div
      style={{
        position: "relative",
        width,
        aspectRatio: "16/9",
        flexShrink: 0,
        borderRadius: 11,
        overflow: "hidden",
        background: source?.thumbnailUrl ? "#0B1220" : soft,
        display: "grid",
        placeItems: "center",
        border: "1px solid var(--border)",
      }}
    >
      {source?.thumbnailUrl && (
        /* Tashqi CDN — `next/image` optimizatsiyasi bu yerda ortiqcha xarajat,
           rasm allaqachon kichik va keshlangan. */
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={source.thumbnailUrl}
          alt=""
          loading="lazy"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      )}

      <span
        style={{
          position: "relative",
          width: 28,
          height: 28,
          borderRadius: "50%",
          display: "grid",
          placeItems: "center",
          background: source ? "rgba(0,0,0,.55)" : "transparent",
          backdropFilter: source?.thumbnailUrl ? "blur(2px)" : undefined,
        }}
      >
        <Icon
          name={source ? "play_arrow" : "movie"}
          size={source ? 20 : 22}
          color={source ? "#fff" : color}
        />
      </span>
    </div>
  );
}
