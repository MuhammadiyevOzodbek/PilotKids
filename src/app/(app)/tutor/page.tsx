import { Robot3D } from "@/components/robot-3d";
import { requireUser } from "@/lib/auth/session";
import { getChatMessages } from "@/lib/queries";
import { TutorChat } from "./tutor-chat";

export default async function TutorPage() {
  const user = await requireUser();
  const messages = await getChatMessages(user.id);

  return (
    <div
      style={{
        maxWidth: 1080,
        margin: "0 auto",
        height: "calc(100vh - 168px)",
        minHeight: 560,
        animation: "fadeUp .5s ease both",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(220px,280px) 1fr",
          gap: 22,
          height: "100%",
        }}
      >
        {/* Robo panel */}
        <div
          style={{
            background: "linear-gradient(180deg,#16224a,#0B1220)",
            borderRadius: 24,
            padding: 26,
            color: "#EAF0FB",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              width: 220,
              height: 220,
              borderRadius: "50%",
              background: "radial-gradient(circle,rgba(47,107,243,.4),transparent 70%)",
              top: -40,
              filter: "blur(14px)",
            }}
          />
          <Robot3D kind="robo" style={{ position: "relative", width: "100%", height: 220 }} />
          <h2
            style={{
              position: "relative",
              fontFamily: "'Sora'",
              fontWeight: 800,
              fontSize: 24,
              margin: "6px 0 6px",
            }}
          >
            Robo
          </h2>
          <div
            style={{
              position: "relative",
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              padding: "6px 13px",
              borderRadius: 99,
              background: "rgba(47,208,141,.16)",
              color: "#38d39a",
              fontWeight: 700,
              fontSize: 12.5,
              marginBottom: 18,
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#38d39a" }} />
            Online · doim o&apos;rganmoqda
          </div>
          <p
            style={{
              position: "relative",
              color: "#AEBBD4",
              fontSize: 13.5,
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            Robototexnika, kod va STEM bo&apos;yicha do&apos;stona yordamchingiz. Xatolardan
            qo&apos;rqmang — birga hal qilamiz!
          </p>
        </div>

        {/* chat */}
        <TutorChat initial={messages.map((m) => ({ id: m.id, role: m.role, text: m.text }))} />
      </div>
    </div>
  );
}
