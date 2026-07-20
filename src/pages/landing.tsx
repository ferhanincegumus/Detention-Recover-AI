import { MarketingHeader } from "@/features/marketing/components/marketing-header";
import { MarketingFooter } from "@/features/marketing/components/marketing-footer";
import { HeroSection } from "@/features/marketing/components/hero-section";
import { StatsSection } from "@/features/marketing/components/stats-section";
import { HowItWorksSection } from "@/features/marketing/components/how-it-works-section";
import { TestimonialsSection } from "@/features/marketing/components/testimonials-section";
import { FounderSection } from "@/features/marketing/components/founder-section";
import { PricingSection } from "@/features/marketing/components/pricing-section";
import { FaqSection } from "@/features/marketing/components/faq-section";
import { BrokerLookupSection } from "@/features/marketing/components/broker-lookup-section";
import { CaseFormSection } from "@/features/marketing/components/case-form-section";
import { FloatingCta } from "@/features/marketing/components/floating-cta";
import { useDocumentMeta } from "@/hooks/use-document-meta";
import { useSectionTheme } from "@/hooks/use-section-theme";

export default function LandingPage() {
  useSectionTheme("dark"); // landing keeps the dark brand identity
  useDocumentMeta({
    title: "Detention Recover AI — No Recovery, No Fee",
    description:
      "We recover unpaid detention, layover, and TONU charges from freight brokers using AI-assisted negotiation. No recovery, no fee.",
  });

  return (
    <div className="min-h-screen bg-background">
      <a
        href="#case-form"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to case form
      </a>

      <MarketingHeader />

      <main>
        <HeroSection />
        <StatsSection />
        <HowItWorksSection />
        <TestimonialsSection />
        <FounderSection />
        <PricingSection />
        <BrokerLookupSection />
        <FaqSection />
        <CaseFormSection />
      </main>

      <MarketingFooter />
      <FloatingCta />
    </div>
  );
}
