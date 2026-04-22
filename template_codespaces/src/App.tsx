import { useWalletConnection } from "@solana/react-hooks";
import { useEffect, useRef, useState } from "react";
import { GeraeroLandingFrame } from "./components/GeraeroLandingFrame";
import { VaultCard } from "./VaultCard";
import {
  buildAllowedBinQr,
  clearTemporarySession,
  createTemporarySession,
  formatRemainingTime,
  getSessionRemainingMs,
  isSessionActive,
  loadTemporarySession,
  parseAllowedBinQr,
  saveTemporarySession,
  type TemporaryQrSession,
  type ValidatedRecyclingDrop,
} from "./lib/qr";

const MATERIAL_OPTIONS = [
  { id: "plastic", label: "Plastico", multiplier: 5 },
  { id: "paper", label: "Papel", multiplier: 10 },
  { id: "metal", label: "Metal", multiplier: 15 },
  { id: "glass", label: "Vidrio", multiplier: 20 },
] as const;

type MaterialOptionId = (typeof MATERIAL_OPTIONS)[number]["id"];

export default function App() {
  const { connectors, connect, disconnect, wallet, status } =
    useWalletConnection();

  const qrSectionRef = useRef<HTMLElement | null>(null);
  const address = wallet?.account.address.toString();

  const [qrInput, setQrInput] = useState("");
  const [qrError, setQrError] = useState<string | null>(null);
  const [session, setSession] = useState<TemporaryQrSession | null>(null);
  const [remainingMs, setRemainingMs] = useState(0);
  const [material, setMaterial] = useState<MaterialOptionId>("plastic");
  const [weightKg, setWeightKg] = useState("1.5");
  const [validatedDrop, setValidatedDrop] =
    useState<ValidatedRecyclingDrop | null>(null);

  const exampleCodes = ["CENTRO-01", "PARQUE-07", "MERCADO-03"].map((binId) =>
    buildAllowedBinQr(binId).normalizedCode,
  );

  useEffect(() => {
    const storedSession = loadTemporarySession();

    if (storedSession) {
      setSession(storedSession);
      setQrInput(storedSession.code);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const rawQr = params.get("qr") ?? params.get("bin");

    if (!rawQr || session) {
      return;
    }

    const parsedQr = parseAllowedBinQr(rawQr);

    if (!parsedQr) {
      setQrInput(rawQr);
      setQrError(
        "Ese QR no pertenece a un bote GerAero valido o su terminacion no coincide.",
      );
      return;
    }

    const nextSession = createTemporarySession(parsedQr);
    setSession(nextSession);
    saveTemporarySession(nextSession);
    setQrInput(parsedQr.normalizedCode);
    setQrError(null);
  }, [session]);

  useEffect(() => {
    if (!session) {
      setRemainingMs(0);
      return;
    }

    setRemainingMs(getSessionRemainingMs(session));

    const intervalId = window.setInterval(() => {
      if (!isSessionActive(session)) {
        closeSession();
        return;
      }

      setRemainingMs(getSessionRemainingMs(session));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [session]);

  function scrollToQrSection() {
    qrSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function syncQrQueryParam(code: string | null) {
    const url = new URL(window.location.href);

    if (code) {
      url.searchParams.set("qr", code);
    } else {
      url.searchParams.delete("qr");
      url.searchParams.delete("bin");
    }

    window.history.replaceState({}, "", url);
  }

  function activateQrSession(rawValue: string) {
    const parsedQr = parseAllowedBinQr(rawValue);

    if (!parsedQr) {
      setQrError(
        "El QR no es valido. Usa un codigo con formato GERAERO-BIN-{ID}-{FIRMA}.",
      );
      setValidatedDrop(null);
      return;
    }

    const nextSession = createTemporarySession(parsedQr);
    setSession(nextSession);
    saveTemporarySession(nextSession);
    setValidatedDrop(null);
    setQrInput(parsedQr.normalizedCode);
    setQrError(null);
    syncQrQueryParam(parsedQr.normalizedCode);
  }

  function closeSession() {
    setSession(null);
    setValidatedDrop(null);
    setQrError(null);
    clearTemporarySession();
    syncQrQueryParam(null);
  }

  function handleValidateReading() {
    if (!session) {
      setQrError("Primero activa un QR valido del bote.");
      return;
    }

    const parsedWeight = Number.parseFloat(weightKg.replace(",", "."));

    if (!Number.isFinite(parsedWeight) || parsedWeight <= 0) {
      setQrError("Ingresa un peso valido mayor a 0.");
      return;
    }

    const selectedMaterial = MATERIAL_OPTIONS.find(
      (option) => option.id === material,
    );

    if (!selectedMaterial) {
      setQrError("Selecciona un material valido.");
      return;
    }

    const weightUnits = BigInt(Math.round(parsedWeight * 10));
    const estimatedPoints = Number(weightUnits) * selectedMaterial.multiplier;

    setValidatedDrop({
      awardMultiplier: BigInt(selectedMaterial.multiplier),
      binId: session.binId,
      estimatedPoints,
      residueLabel: selectedMaterial.label,
      sessionToken: session.token,
      weightKg: Number(parsedWeight.toFixed(1)),
      weightUnits,
    });
    setQrError(null);
  }

  function handleDropRecorded() {
    closeSession();
    setWeightKg("1.5");
  }

  return (
    <div className="min-h-screen bg-bg1 text-foreground">
      <GeraeroLandingFrame onOpenQr={scrollToQrSection} />

      <section className="border-y border-border-low bg-card">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-8 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.18em] text-muted">
              Flujo QR temporal
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">
              App principal con acceso desde QR de botes GerAero
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-muted">
              El QR abre esta misma app, activa un token temporal para un solo
              bote, espera la lectura de IA y bascula, y despues registra los
              puntos del usuario.
            </p>
          </div>

          <button
            type="button"
            onClick={scrollToQrSection}
            className="inline-flex items-center justify-center rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition hover:opacity-90"
          >
            Ir a escanear QR
          </button>
        </div>
      </section>

      <main className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10 sm:px-6">
        <section
          id="qr-flow"
          ref={qrSectionRef}
          className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]"
        >
          <div className="space-y-5 rounded-3xl border border-border-low bg-card p-6 shadow-[0_20px_80px_-50px_rgba(0,0,0,0.35)]">
            <div className="space-y-2">
              <p className="text-sm uppercase tracking-[0.18em] text-muted">
                Paso 1
              </p>
              <h2 className="text-2xl font-semibold">Escanear QR del bote</h2>
              <p className="text-sm leading-6 text-muted">
                No hace falta guardar una lista completa de QRs. Cada bote se
                valida por prefijo y por una terminacion unica calculada sobre
                su ID.
              </p>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium">
                URL o codigo del QR permitido
              </label>
              <input
                type="text"
                value={qrInput}
                onChange={(event) => setQrInput(event.target.value)}
                placeholder="GERAERO-BIN-CENTRO-01-ABC123"
                className="w-full rounded-2xl border border-border-low bg-background px-4 py-3 text-sm outline-none transition focus:border-foreground/30"
              />
              <button
                type="button"
                onClick={() => activateQrSession(qrInput)}
                className="w-full rounded-2xl bg-foreground px-4 py-3 text-sm font-medium text-background transition hover:opacity-90"
              >
                Activar token temporal
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.18em] text-muted">
                QRs de prueba
              </p>
              <div className="grid gap-2">
                {exampleCodes.map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => activateQrSession(code)}
                    className="rounded-2xl border border-border-low bg-cream px-4 py-3 text-left font-mono text-xs transition hover:-translate-y-0.5 hover:shadow-sm"
                  >
                    {code}
                  </button>
                ))}
              </div>
            </div>

            {qrError && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {qrError}
              </div>
            )}
          </div>

          <div className="space-y-5 rounded-3xl border border-border-low bg-card p-6 shadow-[0_20px_80px_-50px_rgba(0,0,0,0.35)]">
            <div className="space-y-2">
              <p className="text-sm uppercase tracking-[0.18em] text-muted">
                Paso 2
              </p>
              <h2 className="text-2xl font-semibold">
                Token temporal y lectura del bote
              </h2>
              <p className="text-sm leading-6 text-muted">
                La sesion queda activa solo para ese bote. Cuando se registran
                los puntos, el token se elimina y la siguiente persona empieza
                desde cero.
              </p>
            </div>

            {session ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <InfoCard label="Bote activo" value={session.binId} />
                  <InfoCard
                    label="Vence en"
                    value={formatRemainingTime(remainingMs)}
                  />
                  <InfoCard label="Firma QR" value={session.signature} />
                  <InfoCard label="Token temporal" value={session.token} mono />
                </div>

                <div className="space-y-3 rounded-2xl border border-border-low bg-cream/40 p-4">
                  <p className="text-sm font-medium">
                    Lectura de IA y bascula
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="space-y-2 text-sm">
                      <span className="block font-medium">Residuo detectado</span>
                      <select
                        value={material}
                        onChange={(event) =>
                          setMaterial(event.target.value as MaterialOptionId)
                        }
                        className="w-full rounded-xl border border-border-low bg-card px-3 py-2 text-sm"
                      >
                        {MATERIAL_OPTIONS.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label} ({option.multiplier}x)
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-2 text-sm">
                      <span className="block font-medium">Peso detectado (kg)</span>
                      <input
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={weightKg}
                        onChange={(event) => setWeightKg(event.target.value)}
                        className="w-full rounded-xl border border-border-low bg-card px-3 py-2 text-sm"
                      />
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={handleValidateReading}
                    className="w-full rounded-2xl border border-border-low bg-card px-4 py-3 text-sm font-medium transition hover:-translate-y-0.5 hover:shadow-sm"
                  >
                    Confirmar lectura del bote
                  </button>
                </div>

                {validatedDrop && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-900">
                    IA lista: {validatedDrop.residueLabel} por{" "}
                    {validatedDrop.weightKg.toFixed(1)} kg. Estimado:{" "}
                    {validatedDrop.estimatedPoints} puntos.
                  </div>
                )}

                <button
                  type="button"
                  onClick={closeSession}
                  className="w-full rounded-2xl border border-border-low bg-card px-4 py-3 text-sm font-medium transition hover:-translate-y-0.5 hover:shadow-sm"
                >
                  Cerrar token temporal
                </button>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-border-low bg-cream/30 px-4 py-6 text-sm leading-6 text-muted">
                Aun no hay un bote activo. Escanea un QR permitido y se crea la
                sesion temporal para continuar con la lectura de IA.
              </div>
            )}
          </div>
        </section>

        <section className="w-full space-y-4 rounded-3xl border border-border-low bg-card p-6 shadow-[0_20px_80px_-50px_rgba(0,0,0,0.35)]">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-lg font-semibold">Conexion wallet</p>
              <p className="text-sm text-muted">
                Conecta tu wallet para inicializar perfil y registrar los puntos
                del reciclaje validado.
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
                type="button"
                onClick={() => connect(connector.id)}
                disabled={status === "connecting"}
                className="group flex items-center justify-between rounded-xl border border-border-low bg-card px-4 py-3 text-left text-sm font-medium transition hover:-translate-y-0.5 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="flex flex-col">
                  <span className="text-base">{connector.name}</span>
                  <span className="text-xs text-muted">
                    {status === "connecting"
                      ? "Conectando..."
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
              type="button"
              onClick={() => disconnect()}
              disabled={status !== "connected"}
              className="inline-flex items-center gap-2 rounded-lg border border-border-low bg-card px-3 py-2 font-medium transition hover:-translate-y-0.5 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              Desconectar
            </button>
          </div>
        </section>

        <VaultCard
          recyclingDraft={validatedDrop}
          onDropRecorded={handleDropRecorded}
        />
      </main>
    </div>
  );
}

function InfoCard({
  label,
  mono = false,
  value,
}: {
  label: string;
  mono?: boolean;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border-low bg-background px-4 py-3">
      <p className="text-xs uppercase tracking-[0.18em] text-muted">{label}</p>
      <p
        className={`mt-2 text-sm font-medium ${
          mono ? "break-all font-mono text-xs" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}
