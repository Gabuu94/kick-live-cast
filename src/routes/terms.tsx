import { createFileRoute } from "@tanstack/react-router";
import { Page } from "@/components/app-chrome";
import { APP_NAME, LAST_UPDATED, SUPPORT_EMAIL } from "@/lib/app-info";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Use — Football Live TV" },
      {
        name: "description",
        content:
          "The terms that apply when you use the Football Live TV scores, fixtures and TV listings app.",
      },
      { property: "og:title", content: "Terms of Use — Football Live TV" },
      {
        property: "og:description",
        content: "Acceptable use, third-party content, odds display and liability terms.",
      },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <Page title="Terms of Use" subtitle={`Last updated ${LAST_UPDATED}`}>
      <section className="rounded-2xl bg-card p-5 ring-1 ring-border">
        <H>Using the app</H>
        <P>
          By installing or using {APP_NAME} you agree to these terms. If you do not agree, please
          uninstall the app.
        </P>

        <H>What the app is</H>
        <P>
          {APP_NAME} is an information service: live scores, fixtures, league tables, match details,
          news and a guide to which broadcaster is showing a match. We do not host, stream or
          rebroadcast match footage, and we are not affiliated with any league, club or broadcaster.
        </P>

        <H>Accuracy</H>
        <P>
          Scores, timings, TV listings and odds are provided by third parties and may be delayed or
          incorrect. Always check the official source before relying on them.
        </P>

        <H>Odds information</H>
        <P>
          Any odds shown are for information only. We do not accept bets or take payment for
          betting. Betting is for adults aged 18 or over — please gamble responsibly.
        </P>

        <H>Acceptable use</H>
        <P>
          You may not copy, scrape, resell or redistribute data from the app, interfere with ads or
          notifications, or use the app for unlawful purposes.
        </P>

        <H>Advertising</H>
        <P>
          The app is free and supported by advertising. Some features may ask you to watch a
          rewarded ad to continue.
        </P>

        <H>Liability</H>
        <P>
          The app is provided &quot;as is&quot; without warranties. To the extent permitted by law we
          are not liable for losses arising from use of, or inability to use, the app.
        </P>

        <H>Changes</H>
        <P>
          We may update these terms; continued use after an update means you accept the revised
          terms. Questions: {SUPPORT_EMAIL}
        </P>
      </section>
    </Page>
  );
}

function H({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-5 text-sm font-semibold first:mt-0">{children}</h2>;
}
function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{children}</p>;
}
