import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText, Info, Mail, Shield, Tv } from "lucide-react";
import { Page } from "@/components/app-chrome";
import {
  APP_NAME,
  APP_PACKAGE_ID,
  SUPPORT_EMAIL,
  versionLabel,
} from "@/lib/app-info";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Football Live TV — Version, Privacy & Terms" },
      {
        name: "description",
        content:
          "App version, package details, support contact and links to the Football Live TV privacy policy and terms of use.",
      },
      { property: "og:title", content: "About Football Live TV" },
      {
        property: "og:description",
        content: "Version info, support contact, privacy policy and terms for Football Live TV.",
      },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <Page title="About" subtitle="App info, privacy and terms">
      <section className="rounded-2xl bg-card p-5 text-center ring-1 ring-border">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow">
          <Tv className="h-8 w-8" strokeWidth={2.5} />
        </span>
        <h2 className="mt-3 font-display text-xl font-bold uppercase tracking-wide">{APP_NAME}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{versionLabel()}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{APP_PACKAGE_ID}</p>
      </section>

      <section className="overflow-hidden rounded-2xl bg-card ring-1 ring-border">
        <LinkRow to="/privacy" icon={Shield} title="Privacy Policy" desc="What we store and why" />
        <LinkRow to="/terms" icon={FileText} title="Terms of Use" desc="Rules for using the app" />
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="flex items-center gap-3 border-b border-border p-4 last:border-b-0"
        >
          <Mail className="h-5 w-5 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Contact support</p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{SUPPORT_EMAIL}</p>
          </div>
        </a>
      </section>

      <section className="rounded-2xl bg-card p-4 ring-1 ring-border">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
          <p className="text-xs leading-relaxed text-muted-foreground">
            {APP_NAME} is a scores, fixtures and TV-listing guide. It does not host or rebroadcast
            any match footage — streaming links point to the official rights holders in your
            region. Club names and crests belong to their respective owners.
          </p>
        </div>
      </section>
    </Page>
  );
}

function LinkRow({
  to,
  icon: Icon,
  title,
  desc,
}: {
  to: "/privacy" | "/terms";
  icon: typeof Shield;
  title: string;
  desc: string;
}) {
  return (
    <Link to={to} className="flex items-center gap-3 border-b border-border p-4 last:border-b-0">
      <Icon className="h-5 w-5 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
      </div>
    </Link>
  );
}
