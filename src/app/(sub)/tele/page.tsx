import type { Metadata } from "next";
import { headers } from "next/headers";
import { GuillocheField } from "@/components/GuillocheField";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MailingList } from "@/components/MailingList";
import { isAllowed } from "@/lib/tele/ipAllow";
import { AccessForm } from "./AccessForm";
import { DemoHolding } from "./DemoHolding";

export const metadata: Metadata = {
  title: "tele · munerate — telemetry demo access",
  description: "Kinetic Telemetry : Quantified Risk. Whitelisted access only.",
};

// The gate depends on the visitor's IP — never prerender.
export const dynamic = "force-dynamic";

async function clientIp(): Promise<string> {
  const h = await headers();
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return h.get("x-real-ip") ?? "";
}

export default async function TeleGate() {
  const ip = await clientIp();
  const allowed = isAllowed(ip, process.env.TELE_WHITELIST ?? "");

  return (
    <>
      <GuillocheField
        config={{
          lattice: { opacity: 0.12 },
          band: { opacity: 0.3, strands: 56 },
          clearing: { radius: [1.35, 1.0], thin: 0.9 },
          intro: { duration: 1.6 },
        }}
      />
      <main className="landing tele">
        <header className="landing__top">
          <span>tele · munerate</span>
          <span className="landing__hide-sm">Kinetic Telemetry : Quantified Risk</span>
        </header>

        <section className="tele__body">
          {allowed ? <DemoHolding ip={ip} /> : <AccessForm currentIp={ip} />}
        </section>

        <footer className="landing__bottom">
          <span className="landing__hide-sm">© {new Date().getFullYear()} munerate</span>
          <ThemeToggle />
          <MailingList />
        </footer>
      </main>
    </>
  );
}
