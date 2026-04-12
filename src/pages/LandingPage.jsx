import HeroSection from '@/components/landing/HeroSection';
import HowItWorksSection from '@/components/landing/HowItWorksSection';
import FeaturesSection from '@/components/landing/FeaturesSection';
import IndustriesSection from '@/components/landing/IndustriesSection';
import TestimonialsSection from '@/components/landing/TestimonialsSection';
import PricingPreviewSection from '@/components/landing/PricingPreviewSection';
import CTASection from '@/components/landing/CTASection';
import FooterSection from '@/components/landing/FooterSection';

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <HeroSection />
      <HowItWorksSection />
      <FeaturesSection />
      <IndustriesSection />
      <TestimonialsSection />
      <PricingPreviewSection />
      <CTASection />
      <FooterSection />
    </div>
  );
}