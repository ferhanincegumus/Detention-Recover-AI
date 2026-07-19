import { Link } from "react-router-dom";
import { Compass, MoveLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { routes } from "@/config/routes";

export default function NotFoundPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-6 text-center">
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-40" aria-hidden />
      <div className="relative z-10 flex flex-col items-center gap-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15">
          <Compass className="h-8 w-8 text-primary" />
        </div>
        <p className="font-mono text-sm uppercase tracking-[0.3em] text-muted-foreground">
          Error 404
        </p>
        <h1 className="max-w-xl text-balance font-display text-4xl font-bold sm:text-5xl">
          This load never made it to the dock.
        </h1>
        <p className="max-w-md text-muted-foreground">
          The page you're looking for doesn't exist or has been moved. Let's get you back on route.
        </p>
        <Button asChild size="lg">
          <Link to={routes.home}>
            <MoveLeft className="h-4 w-4" />
            Back to home
          </Link>
        </Button>
      </div>
    </div>
  );
}
