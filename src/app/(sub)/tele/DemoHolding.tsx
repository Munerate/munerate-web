import { Wordmark } from "@/components/Wordmark";

/**
 * What whitelisted visitors see until the real telemetry demo ships —
 * the demo application will replace this component, nothing else.
 */
export function DemoHolding({ ip }: { ip: string }) {
  return (
    <div className="tele__panel">
      <Wordmark prefix="tele" as="span" />
      <h1 className="tele__title">Access granted</h1>
      <p className="tele__lede">
        Your address{ip ? ` (${ip})` : ""} is whitelisted. The robotic
        telemetry demo connects here — it is being fitted at the moment and
        will appear on this page shortly. No action needed on your side.
      </p>
    </div>
  );
}
