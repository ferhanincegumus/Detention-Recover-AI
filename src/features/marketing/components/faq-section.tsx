import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Section } from "@/features/marketing/components/section";
import { FAQ_ITEMS } from "@/features/marketing/constants";

export function FaqSection() {
  return (
    <Section id="faq" eyebrow="FAQ" title="Questions carriers ask us">
      <div className="mx-auto max-w-2xl">
        <Accordion type="single" collapsible className="w-full">
          {FAQ_ITEMS.map((item, index) => (
            <AccordionItem key={item.q} value={`faq-${index}`}>
              <AccordionTrigger>{item.q}</AccordionTrigger>
              <AccordionContent>{item.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </Section>
  );
}
