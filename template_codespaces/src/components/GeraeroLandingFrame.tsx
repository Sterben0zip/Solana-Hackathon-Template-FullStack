import { useEffect, useState } from "react";

type LandingFrameProps = {
  onOpenQr: () => void;
};

export function GeraeroLandingFrame({ onOpenQr }: LandingFrameProps) {
  const [height, setHeight] = useState(3600);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) {
        return;
      }

      if (
        event.data?.type === "geraero-landing-height" &&
        typeof event.data.height === "number"
      ) {
        setHeight(Math.max(1200, Math.ceil(event.data.height)));
      }

      if (event.data?.type === "geraero-open-qr") {
        onOpenQr();
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onOpenQr]);

  return (
    <section aria-label="Landing GerAero" className="w-full bg-white">
      <iframe
        title="Landing GerAero"
        src="/geraero-landing/index.html"
        className="block w-full border-0"
        style={{ height }}
      />
    </section>
  );
}
