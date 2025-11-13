import Link from "next/link";

interface AuthFooterProps {
  type: "signup" | "login";
  linkText: string;
  linkHref: string;
  linkLabel: string;
}

export function AuthFooter({ type, linkText, linkHref, linkLabel }: AuthFooterProps) {
  return (
    <div className="text-center">
      <p className="text-sm text-muted-foreground">
        {linkText}{" "}
        <Link
          href={linkHref}
          className="font-medium text-primary hover:text-primary/80 transition-colors"
        >
          {linkLabel}
        </Link>
      </p>
      
      <div className="mt-6 pt-6 border-t border-border/40">
        <p className="text-xs text-muted-foreground">
          By {type === "signup" ? "creating an account" : "signing in"}, you agree to our{" "}
          <Link href="/terms" className="underline hover:text-foreground transition-colors">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline hover:text-foreground transition-colors">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}
