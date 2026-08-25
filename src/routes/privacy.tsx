import { createFileRoute } from "@tanstack/react-router";
import { Page } from "@/components/app-chrome";
import { APP_NAME, LAST_UPDATED, SUPPORT_EMAIL } from "@/lib/app-info";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Football Live TV" },
      {
        name: "description",
        content:
          "How Football Live TV handles device data, notification tokens, followed clubs and advertising identifiers.",
      },
      { property: "og:title", content: "Privacy Policy — Football Live TV" },
      {
        property: "og:description",
        content: "Data we collect, how notifications and ads work, and how to contact us.",
      },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <Page title="Privacy Policy" subtitle={`Last updated ${LAST_UPDATED}`}>
      <Prose>
        <P>
          {APP_NAME} is provided by the app publisher listed on our Google Play listing. This policy
          explains what the app stores and shares. You do not need an account to use it.
        </P>

        <H>What is stored on your device</H>
        <P>
          Your followed clubs, notification preferences and a random device identifier are saved in
          local storage on your device. Clearing app data removes them.
        </P>

        <H>What is sent to our servers</H>
        <P>
          If you enable push alerts, the app sends the notification token issued by your device,
          the random device identifier, your followed clubs and your alert preferences so we know
          which match events to send you. We do not collect your name, email address or contacts.
          Turning alerts off, or muting everything, deletes that registration.
        </P>

        <H>Advertising</H>
        <P>
          The app shows ads supplied by Google AdMob. AdMob may use your advertising ID to serve and
          measure ads. You can reset or delete that ID in your device settings, and where required
          we ask for your consent before personalised ads are shown. See Google&apos;s advertising
          privacy information for details.
        </P>

        <H>Third-party content</H>
        <P>
          Scores, fixtures, tables, odds and news are supplied by third-party data providers. Links
          to watch matches open the official rights holder&apos;s app or website; their own privacy
          terms apply once you leave {APP_NAME}.
        </P>

        <H>Children</H>
        <P>
          The app is not directed at children under 13, and we do not knowingly collect data from
          them.
        </P>

        <H>Your choices</H>
        <P>
          You can withdraw notification permission at any time in your device settings, clear stored
          preferences by clearing app data, or email us to request deletion of any device
          registration linked to your device identifier.
        </P>

        <H>Contact</H>
        <P>Questions about this policy: {SUPPORT_EMAIL}</P>
      </Prose>
    </Page>
  );
}

function Prose({ children }: { children: React.ReactNode }) {
  return <section className="rounded-2xl bg-card p-5 ring-1 ring-border">{children}</section>;
}
function H({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-5 text-sm font-semibold first:mt-0">{children}</h2>;
}
function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{children}</p>;
}
