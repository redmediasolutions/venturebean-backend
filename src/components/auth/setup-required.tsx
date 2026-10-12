import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** Shown when the .env.local file is missing — guides the user through setup. */
export function SetupRequired() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 p-6">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-xl">Connect Firebase to get started</CardTitle>
          <CardDescription>The admin panel needs your Firebase keys before it can run.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <ol className="list-decimal space-y-2 pl-5 text-muted-foreground">
            <li>
              Copy the file <code className="rounded bg-muted px-1 font-mono text-foreground">.env.example</code> and
              rename the copy to <code className="rounded bg-muted px-1 font-mono text-foreground">.env.local</code>
            </li>
            <li>
              Open Firebase Console → Project settings → Your apps → Web app, and paste the config values into it.
            </li>
            <li>Stop the server and run <code className="rounded bg-muted px-1 font-mono text-foreground">npm run dev</code> again.</li>
          </ol>
          <p className="text-muted-foreground">Full step-by-step instructions are in README.md.</p>
        </CardContent>
      </Card>
    </div>
  );
}
