import type { Metadata } from "next";
import { Hero } from "@/components/landing/hero";
import { About } from "@/components/landing/about";
import { Benefits } from "@/components/landing/benefits";
import { Roadmap } from "@/components/landing/roadmap";
import { FeaturedCourses } from "@/components/landing/featured-courses";
import { Pricing } from "@/components/landing/pricing";
import { Achievements } from "@/components/landing/achievements";
import { Testimonials } from "@/components/landing/testimonials";
import { Faq } from "@/components/landing/faq";
import { FinalCta } from "@/components/landing/final-cta";

export const metadata: Metadata = {
  title: "PilotKids — Robototexnika Akademiyasi",
  description:
    "8–18 yoshli bolalar uchun onlayn robototexnika akademiyasi. Amaliy loyihalar, mentor qo'llab-quvvatlashi, Arduino, Python va sun'iy intellekt. Kelajak muhandislari shu yerda boshlanadi.",
  alternates: { canonical: "/" },
};

export default function LandingPage() {
  return (
    <>
      <Hero />
      <About />
      <Benefits />
      <Roadmap />
      <FeaturedCourses />
      <Pricing />
      <Achievements />
      <Testimonials />
      <Faq />
      <FinalCta />
    </>
  );
}
