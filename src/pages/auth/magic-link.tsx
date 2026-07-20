import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AuthLayout } from "@/features/auth/components/auth-layout";
import { auth } from "@/features/auth/auth-adapter";
import { toast } from "@/hooks/use-toast";
import { useDocumentMeta } from "@/hooks/use-document-meta";
import { routes } from "@/config/routes";

const schema = z.object({ email: z.string().trim().email("Enter a valid email") });
type FormValues = z.infer<typeof schema>;

export default function MagicLinkPage() {
  useDocumentMeta({ title: "Magic link · Detention Recover AI" });
  const [sentTo, setSentTo] = useState<string | null>(null);
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: "" } });

  const onSubmit = async (values: FormValues) => {
    try {
      await auth.sendMagicLink(values.email);
      setSentTo(values.email);
    } catch (error) {
      toast.error("Could not send link", error instanceof Error ? error.message : undefined);
    }
  };

  return (
    <AuthLayout
      title={sentTo ? "Check your email" : "Sign in with a magic link"}
      subtitle={
        sentTo
          ? undefined
          : "We'll email you a secure link — no password required."
      }
      footer={
        <>
          Back to{" "}
          <Link to={routes.login} className="font-medium text-primary hover:underline">
            password sign in
          </Link>
        </>
      }
    >
      {sentTo ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-card p-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success/15">
            <MailCheck className="h-7 w-7 text-success" />
          </div>
          <p className="text-sm text-muted-foreground">
            We sent a sign-in link to <span className="font-medium text-foreground">{sentTo}</span>.
            It expires in 15 minutes.
          </p>
          <Button variant="outline" className="w-full" onClick={() => setSentTo(null)}>
            Use a different email
          </Button>
        </div>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" autoComplete="email" placeholder="you@company.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" loading={form.formState.isSubmitting}>
              Email me a link
            </Button>
          </form>
        </Form>
      )}
    </AuthLayout>
  );
}
