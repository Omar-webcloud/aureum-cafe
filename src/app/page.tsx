import { CartDrawer } from "@/components/cart-drawer";
import { FeaturedMenu, FullMenu } from "@/components/menu-board";
import { Hero, OriginMarquee, Ritual, SiteFooter, Story, Testimonials, Visit, WhatsAppFab } from "@/components/landing-sections";
import { MobileDock } from "@/components/mobile-dock";
import { SiteHeader } from "@/components/site-header";
import { getMenu } from "@/lib/menu";
import { getWhatsAppNumber } from "@/lib/shop";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const items = await getMenu();
  const whatsappNumber = getWhatsAppNumber();

  return (
    <main>
      <SiteHeader />
      <Hero />
      <OriginMarquee />
      <FeaturedMenu items={items} />
      <Story />
      <FullMenu items={items} />
      <Ritual />
      <Testimonials />
      <Visit whatsappNumber={whatsappNumber} />
      <SiteFooter />
      <CartDrawer />
      <MobileDock />
      <WhatsAppFab whatsappNumber={whatsappNumber} />
    </main>
  );
}
