import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AuthLayout } from "@/features/auth/components/auth-layout";
import { GoogleButton } from "@/features/auth/components/google-button";
import { useAuth } from "@/features/auth/auth-context";
import { authService } from "@/features/auth/auth-service";
import { toast } from "@/hooks/use-toast";
import { useDocumentMeta } from "@/hooks/use-document-meta";
import { env, isMockBackend } from "@/config/env";
import { routes } from "@/config/routes";

const schema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});
type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  useDocumentMeta({ title: "Sign in · Detention Recover AI" });
  const { loginWithPassword, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [googleLoading, setGoogleLoading] = useState(false);
  const from = (location.state as { from?: string } | null)?.from ?? routes.dashboard;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await loginWithPassword(values.email, values.password);
      navigate(from, { replace: true });
    } catch (error) {
      toast.error("Sign in failed", error instanceof Error ? error.message : undefined);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
      navigate(from, { replace: true });
    } catch {
      toast.error("Google sign in failed");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your recovery command center."
      footer={
        env.features.publicRegistration ? (
          <>
            New here?{" "}
            <Link to={routes.register} className="font-medium text-primary hover:underline">
              Create an account
            </Link>
          </>
        ) : null
      }
    >
      {isMockBackend && (
        <div className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/10 p-3 text-xs">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div>
            <p className="font-medium text-foreground">Demo access</p>
            <p className="text-muted-foreground">
              {authService.demoCredentials.email} · {authService.demoCredentials.password}
            </p>
          </div>
        </div>
      )}

      {env.features.googleAuth && (
        <>
          <GoogleButton onClick={handleGoogle} loading={googleLoading} />
          <div className="relative">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-xs text-muted-foreground">
              or
            </span>
          </div>
        </>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" autoComplete="email" placeholder="admin@detentionrecover.ai" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>Password</FormLabel>
                  <Link to={routes.forgotPassword} className="text-xs text-primary hover:underline">
                    Forgot?
                  </Link>
                </div>
                <FormControl>
                  <Input type="password" autoComplete="current-password" placeholder="••••••••" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" loading={form.formState.isSubmitting}>
            Sign in
          </Button>
        </form>
      </Form>

      {env.features.magicLink && (
        <p className="text-center text-sm text-muted-foreground">
          Prefer no password?{" "}
          <Link to={routes.magicLink} className="font-medium text-primary hover:underline">
            Email me a magic link
          </Link>
        </p>
      )}
    </AuthLayout>
  );
}
