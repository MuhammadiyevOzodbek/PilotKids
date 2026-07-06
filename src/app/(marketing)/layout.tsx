import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col">
      {/* Global fon teksturasi */}
      <div className="bg-circuit pointer-events-none fixed inset-0 -z-10" aria-hidden />

      <Navbar />
      <main className="relative z-10 flex-1">{children}</main>
      <div className="relative z-10">
        <Footer />
      </div>
    </div>
  );
}
