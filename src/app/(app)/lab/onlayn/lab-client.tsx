"use client";

import "@xyflow/react/dist/style.css";
import "@/components/virtual-lab/virtual-lab.css";
import { Workbench } from "@/components/virtual-lab/workbench";

/**
 * Onlayn laboratoriya — klient qobig'i.
 *
 * React Flow va Monaco uslublari shu yerda import qilinadi: ular faqat shu
 * sahifada kerak, boshqa sahifalar ularni yuklamaydi.
 */
export function VirtualLabClient({ lessonSlug }: { lessonSlug?: string }) {
  return (
    <div className="vlab-page">
      <Workbench lessonSlug={lessonSlug} />
    </div>
  );
}
