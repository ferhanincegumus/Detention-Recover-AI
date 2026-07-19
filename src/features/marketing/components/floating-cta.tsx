import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Mobile-only floating CTA that appears after the hero scrolls away. */
export function FloatingCta() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const past = window.scrollY > 640;
      const nearForm = () => {
        const form = document.getElementById("case-form");
        if (!form) return false;
        const rect = form.getBoundingClientRect();
        return rect.top < window.innerHeight && rect.bottom > 0;
      };
      setVisible(past && !nearForm());
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/90 p-3 backdrop-blur-xl transition-transform duration-300 md:hidden",
        visible ? "translate-y-0" : "translate-y-full",
      )}
    >
      <Button asChild size="lg" className="w-full">
        <a href="#case-form">
          Recover my money
          <ArrowRight className="h-4 w-4" />
        </a>
      </Button>
    </div>
  );
}
