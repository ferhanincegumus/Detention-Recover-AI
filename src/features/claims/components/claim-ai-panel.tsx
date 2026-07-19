import { useState } from "react";
import { Bot, Copy, FileSignature, MessageSquareReply, ShieldCheck, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { aiApi } from "@/services/api/ai";
import { useUpdateClaim } from "@/services/hooks/use-claims";
import type { Claim } from "@/types/claim";
import type { Load } from "@/types/load";

interface ClaimAiPanelProps {
  claim: Claim;
  load?: Load;
  latestInbound?: string;
}

type Tool = "claim" | "reply" | "defense";

export function ClaimAiPanel({ claim, load, latestInbound }: ClaimAiPanelProps) {
  const [output, setOutput] = useState("");
  const [busy, setBusy] = useState<Tool | null>(null);
  const updateClaim = useUpdateClaim();

  const run = async (tool: Tool) => {
    setBusy(tool);
    setOutput("");
    try {
      if (tool === "claim") {
        const result = await aiApi.writeClaimLetter(claim, load);
        setOutput(`Subject: ${result.subject}\n\n${result.body}`);
      } else if (tool === "reply") {
        setOutput(await aiApi.generateReply(claim, latestInbound ?? "", undefined));
      } else {
        setOutput(await aiApi.defenseReport(claim, load));
      }
    } catch {
      toast.error("AI generation failed", "Please try again.");
    } finally {
      setBusy(null);
    }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(output);
    toast.success("Copied to clipboard");
  };

  const saveAsLetter = async () => {
    try {
      await updateClaim.mutateAsync({ id: claim.id, patch: { claimLetter: output } });
      toast.success("Saved to claim");
    } catch {
      toast.error("Could not save");
    }
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" /> AI assistant
        </CardTitle>
        <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
          <Sparkles className="h-3.5 w-3.5" /> Drafts, you approve
        </span>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="claim">
          <TabsList className="w-full">
            <TabsTrigger value="claim" className="flex-1"><FileSignature className="h-4 w-4" /> Claim</TabsTrigger>
            <TabsTrigger value="reply" className="flex-1"><MessageSquareReply className="h-4 w-4" /> Reply</TabsTrigger>
            <TabsTrigger value="defense" className="flex-1"><ShieldCheck className="h-4 w-4" /> Defense</TabsTrigger>
          </TabsList>

          <TabsContent value="claim" className="space-y-3">
            <p className="text-sm text-muted-foreground">Draft a formal detention demand letter from this claim's evidence.</p>
            <Button onClick={() => run("claim")} loading={busy === "claim"}><Sparkles className="h-4 w-4" /> Write claim letter</Button>
          </TabsContent>
          <TabsContent value="reply" className="space-y-3">
            <p className="text-sm text-muted-foreground">Generate a reply tuned to the broker's latest message.</p>
            <Button onClick={() => run("reply")} loading={busy === "reply"}><Sparkles className="h-4 w-4" /> Generate reply</Button>
          </TabsContent>
          <TabsContent value="defense" className="space-y-3">
            <p className="text-sm text-muted-foreground">Assess defensibility, strengths, and evidence gaps.</p>
            <Button onClick={() => run("defense")} loading={busy === "defense"}><Sparkles className="h-4 w-4" /> Build defense report</Button>
          </TabsContent>
        </Tabs>

        {output && (
          <div className="mt-4 space-y-3">
            <Textarea value={output} onChange={(e) => setOutput(e.target.value)} rows={12} className="font-mono text-xs" />
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={copy}><Copy className="h-4 w-4" /> Copy</Button>
              <Button variant="outline" size="sm" onClick={saveAsLetter}><FileSignature className="h-4 w-4" /> Save to claim</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
