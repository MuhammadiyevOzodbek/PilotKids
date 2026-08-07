import { Icon } from "@/components/icon";
import { ThemeToggle } from "@/components/theme-toggle";

/**
 * Kirish sahifasining sarlavhasi.
 *
 * Alohida turadi, chunki `LoginClient` `useSearchParams` ishlatadi va shu bois
 * `<Suspense>` ichida bo'lishi shart. Fallback bo'sh qolsa: (1) sahifa HTML'da
 * sarlavhasiz — ya'ni `<h1>`siz — chiqadi, (2) JS yuklanmaguncha ekran bo'sh
 * turadi. Shu bois ayni sarlavha fallback sifatida ham ishlatiladi.
 */
export function LoginHeader({ children }: { children?: React.ReactNode }) {
  return (
    <div style={{ width: "100%", maxWidth: 420 }}>
      <ThemeToggle style={{ float: "right" }} />
      <h1
        className="font-display"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
          fontWeight: 800,
          fontSize: "clamp(28px,5vw,34px)",
          letterSpacing: "-.02em",
          margin: "6px 0 8px",
          color: "var(--text)",
        }}
      >
        Xush kelibsiz!
        <Icon name="waving_hand" size={30} color="var(--fun-amber)" />
      </h1>
      <p style={{ color: "var(--text-2)", margin: "0 0 24px", fontSize: 16 }}>
        Qurishda davom etish uchun kiring
      </p>
      {children}
    </div>
  );
}
