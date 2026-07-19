"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { searchContent, type SearchHit } from "@/lib/actions/search";

const KIND_LABEL: Record<SearchHit["kind"], string> = {
  course: "Kurs",
  lesson: "Dars",
};

export function GlobalSearch() {
  const router = useRouter();
  const listId = useId();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce (~300ms) — har bir harfda serverga so'rov ketmasin.
  // Qisqa so'rov holatini `onChange` tozalaydi, shuning uchun bu yerda
  // effect ichida sinxron setState chaqirilmaydi.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      const res = await searchContent(q);
      if (cancelled) return;
      setLoading(false);
      if (res.ok) {
        setHits(res.data);
        setError(null);
      } else {
        setHits([]);
        setError(res.error);
      }
      setActive(-1);
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  // Tashqariga bosilganda yopamiz.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent | TouchEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [open]);

  function go(hit: SearchHit) {
    setOpen(false);
    setQuery("");
    setHits([]);
    router.push(hit.href);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
      return;
    }
    if (!open || hits.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % hits.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? hits.length - 1 : i - 1));
    } else if (e.key === "Enter") {
      const hit = hits[active] ?? hits[0];
      if (hit) {
        e.preventDefault();
        go(hit);
      }
    }
  }

  const showPanel = open && query.trim().length >= 2;

  return (
    <div
      ref={wrapRef}
      className="app-header-search"
      style={{ position: "relative", flex: 1, maxWidth: 440 }}
    >
      <span
        className="ms"
        aria-hidden
        style={{
          position: "absolute",
          left: 15,
          top: "50%",
          transform: "translateY(-50%)",
          fontSize: 21,
          color: "var(--text-3)",
        }}
      >
        search
      </span>
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(e) => {
          const next = e.target.value;
          setQuery(next);
          setOpen(true);
          // 2 belgidan qisqa — natijalarni darhol tozalaymiz; aks holda
          // debounce ishga tushgunicha "Qidirilmoqda…" ko'rsatamiz.
          if (next.trim().length < 2) {
            setHits([]);
            setError(null);
            setLoading(false);
          } else {
            setLoading(true);
          }
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Kurs, dars yoki loyiha qidiring…"
        role="combobox"
        aria-expanded={showPanel}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-label="Kurs va darslar bo'yicha qidiruv"
        aria-activedescendant={active >= 0 && hits[active] ? `${listId}-${active}` : undefined}
        style={{
          width: "100%",
          padding: "12px 16px 12px 46px",
          borderRadius: 13,
          border: "1px solid var(--border)",
          background: "var(--surface)",
          color: "var(--text)",
          fontSize: 14.5,
          outline: "none",
        }}
      />

      {showPanel && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            left: 0,
            right: 0,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            boxShadow: "var(--shadow-lg)",
            zIndex: 60,
            overflow: "hidden",
          }}
        >
          <ul
            id={listId}
            role="listbox"
            aria-label="Qidiruv natijalari"
            style={{ listStyle: "none", margin: 0, padding: 0, maxHeight: 360, overflowY: "auto" }}
          >
            {hits.map((hit, i) => (
              <li key={`${hit.kind}-${hit.id}`} role="presentation">
                <button
                  id={`${listId}-${i}`}
                  type="button"
                  role="option"
                  aria-selected={i === active}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(hit)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 11,
                    width: "100%",
                    textAlign: "left",
                    padding: "10px 14px",
                    border: "none",
                    borderBottom: "1px solid var(--border)",
                    background: i === active ? "var(--primary-soft)" : "transparent",
                    color: "var(--text)",
                    cursor: "pointer",
                  }}
                >
                  <Icon
                    name={hit.icon}
                    size={20}
                    style={{ color: "var(--primary)", flexShrink: 0 }}
                  />
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <span
                      style={{
                        display: "block",
                        fontSize: 13.8,
                        fontWeight: 700,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {hit.title}
                    </span>
                    <span style={{ display: "block", fontSize: 12, color: "var(--text-3)" }}>
                      {KIND_LABEL[hit.kind]} · {hit.subtitle}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {hits.length === 0 && (
            <p
              role="status"
              aria-live="polite"
              style={{
                margin: 0,
                padding: "22px 14px",
                textAlign: "center",
                fontSize: 13.5,
                color: error ? "var(--danger, #e5484d)" : "var(--text-3)",
              }}
            >
              {loading ? "Qidirilmoqda…" : (error ?? "Hech narsa topilmadi")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
