import { useWalletConnection } from "@solana/react-hooks";
import { VaultCard } from "./VaultCard";
import { useState } from "react";

export default function App() {
  const { connectors, connect, disconnect, wallet, status } =
    useWalletConnection();

  const address = wallet?.account.address.toString();

  const [currentView, setCurrentView] = useState<"main" | "ia">("main");

  return (
    <div className="relative min-h-screen overflow-x-clip bg-bg1 text-foreground">
      <main className="relative z-10 mx-auto flex min-h-screen max-w-4xl flex-col gap-10 border-x border-border-low px-6 py-16">
        <header className="space-y-3">
          <p className="text-sm uppercase tracking-[0.18em] text-muted">
            WayLearn - Hackathon Solana
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Reciclaje Inteligente con Blockchain
          </h1>
          <p className="max-w-3xl text-base leading-relaxed text-muted">
            Escanea QR de botes, registra tus residuos con IA, y gana tokens WayLearn por limpiar la ciudad.
          </p>

          <div className="mt-4 flex justify-center">
            <img
              src="https://images.unsplash.com/photo-1553262978-5f4894a38f0f?auto=format&fit=crop&w=1200&q=80"
              alt="Reciclaje inteligente"
              className="h-44 w-full max-w-3xl rounded-2xl object-cover shadow-lg"
            />
          </div>

          <nav className="flex gap-4">
            <button
              onClick={() => setCurrentView("main")}
              className={`px-4 py-2 rounded-lg ${currentView === "main" ? "bg-primary text-background" : "bg-card"}`}
            >
              App Principal
            </button>
            <button
              onClick={() => setCurrentView("ia")}
              className={`px-4 py-2 rounded-lg ${currentView === "ia" ? "bg-primary text-background" : "bg-card"}`}
            >
              Dashboard IA
            </button>
          </nav>
        </header>

        {currentView === "main" ? (
          <>
            <section className="w-full max-w-3xl space-y-4 rounded-2xl border border-border-low bg-card p-6 shadow-[0_20px_80px_-50px_rgba(0,0,0,0.35)]">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-lg font-semibold">Conexión Wallet</p>
                  <p className="text-sm text-muted">
                    Conecta tu wallet para acceder a tu perfil y tokens WayLearn.
                  </p>
                </div>
                <span className="rounded-full bg-cream px-3 py-1 text-xs font-semibold uppercase tracking-wide text-foreground/80">
                  {status === "connected" ? "Conectado" : "No conectado"}
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {connectors.map((connector) => (
                  <button
                    key={connector.id}
                    onClick={() => connect(connector.id)}
                    disabled={status === "connecting"}
                    className="group flex items-center justify-between rounded-xl border border-border-low bg-card px-4 py-3 text-left text-sm font-medium transition hover:-translate-y-0.5 hover:shadow-sm cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className="flex flex-col">
                      <span className="text-base">{connector.name}</span>
                      <span className="text-xs text-muted">
                        {status === "connecting"
                          ? "Conectando…"
                          : status === "connected" &&
                              wallet?.connector.id === connector.id
                            ? "Activo"
                            : "Haz clic para conectar"}
                      </span>
                    </span>
                    <span
                      aria-hidden
                      className="h-2.5 w-2.5 rounded-full bg-border-low transition group-hover:bg-primary/80"
                    />
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-3 border-t border-border-low pt-4 text-sm">
                <span className="rounded-lg border border-border-low bg-cream px-3 py-2 font-mono text-xs">
                  {address ?? "No wallet connected"}
                </span>
                <button
                  onClick={() => disconnect()}
                  disabled={status !== "connected"}
                  className="inline-flex items-center gap-2 rounded-lg border border-border-low bg-card px-3 py-2 font-medium transition hover:-translate-y-0.5 hover:shadow-sm cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Desconectar
                </button>
              </div>
            </section>

            <VaultCard />
          </>
        ) : (
          <IaDashboard />
        )}
      </main>
    </div>
  );
}

function IaDashboard() {
  const [scannedQr, setScannedQr] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<string | null>(null);

  const simulateQrScan = () => {
    const qrId = `BOTE-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    setScannedQr(qrId);
  };

  const simulateIaValidation = () => {
    setValidationResult("Validado: Papel - 2.5kg detectado correctamente");
  };

  return (
    <section className="w-full max-w-3xl space-y-4 rounded-2xl border border-border-low bg-card p-6 shadow-[0_20px_80px_-50px_rgba(0,0,0,0.35)]">
      <div className="space-y-1">
        <p className="text-lg font-semibold">Dashboard IA - Validación de Residuos</p>
        <p className="text-sm text-muted">
          Simulación de interacción con IA para corroborar depósitos en botes.
        </p>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-border-low bg-cream/30 p-4">
          <p className="text-sm font-medium">Escanear QR de Bote</p>
          <p className="text-xs text-muted mb-2">Cada bote tiene QR único para acceso temporal.</p>
          <button
            onClick={simulateQrScan}
            className="w-full rounded-lg border border-border-low bg-card px-4 py-2 font-medium transition hover:-translate-y-0.5 hover:shadow-sm"
          >
            Simular Escaneo QR
          </button>
          {scannedQr && (
            <p className="mt-2 text-sm font-mono bg-background p-2 rounded">
              Token Temporal: {scannedQr}
            </p>
          )}
        </div>

        <div className="rounded-xl border border-border-low bg-cream/30 p-4">
          <p className="text-sm font-medium">Validación IA</p>
          <p className="text-xs text-muted mb-2">Cámaras del bote analizan el depósito.</p>
          <button
            onClick={simulateIaValidation}
            disabled={!scannedQr}
            className="w-full rounded-lg border border-border-low bg-card px-4 py-2 font-medium transition hover:-translate-y-0.5 hover:shadow-sm disabled:opacity-50"
          >
            Corroborar con IA
          </button>
          {validationResult && (
            <p className="mt-2 text-sm bg-green-100 p-2 rounded">
              {validationResult}
            </p>
          )}
        </div>

        <div className="rounded-xl border border-border-low bg-cream/30 p-4">
          <p className="text-sm font-medium">Datos de Cámaras</p>
          <p className="text-xs text-muted">Vista simulada de feed de cámaras.</p>
          <div className="bg-gray-200 h-32 flex items-center justify-center rounded">
            <span className="text-muted">Cámara 1: Activa</span>
          </div>
        </div>

        <div className="rounded-xl border border-border-low bg-cream/30 p-4">
          <p className="text-sm font-medium">Vista IA</p>
          <img
            src="https://images.unsplash.com/photo-1542838687-bd26c39360b2?auto=format&fit=crop&w=1200&q=80"
            alt="Simulacion IA"
            className="h-48 w-full rounded-xl object-cover"
          />
        </div>
      </div>
    </section>
  );
}
