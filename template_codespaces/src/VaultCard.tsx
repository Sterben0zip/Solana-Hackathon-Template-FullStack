import { useState, useEffect, useCallback } from "react";
import {
  useWalletConnection,
  useSendTransaction,
  useBalance,
  useAccount,
} from "@solana/react-hooks";
import {
  getProgramDerivedAddress,
  getAddressEncoder,
  getBytesEncoder,
  type Address,
} from "@solana/kit";
import {
  getDepositInstructionDataEncoder,
  getWithdrawInstructionDataEncoder,
  VAULT_PROGRAM_ADDRESS,
} from "./generated/vault";

const LAMPORTS_PER_SOL = 1_000_000_000n;
const ASSOCIATED_TOKEN_PROGRAM_ADDRESS =
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL" as Address;
const TOKEN_PROGRAM_ADDRESS =
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" as Address;
const SYSTEM_PROGRAM_ADDRESS = "11111111111111111111111111111111" as Address;

async function getAnchorDiscriminator(name: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`global:${name}`),
  );
  return Array.from(new Uint8Array(digest).slice(0, 8));
}

function u64ToUint8Array(value: bigint) {
  const buf = new ArrayBuffer(8);
  new DataView(buf).setBigUint64(0, value, true);
  return new Uint8Array(buf);
}

export function VaultCard() {
  const { wallet, status } = useWalletConnection();
  const { send, isSending } = useSendTransaction();

  const [amount, setAmount] = useState("");
  const [vaultAddress, setVaultAddress] = useState<Address | null>(null);
  const [profileAddress, setProfileAddress] = useState<Address | null>(null);
  const [mintAddress, setMintAddress] = useState<Address | null>(null);
  const [tokenAccountAddress, setTokenAccountAddress] = useState<Address | null>(null);
  const [weight, setWeight] = useState("");
  const [multiplier, setMultiplier] = useState("10");
  const [points, setPoints] = useState<number>(0);
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [txStatus, setTxStatus] = useState<string | null>(null);

  const walletAddress = wallet?.account.address;

  // Derive vault PDA when wallet connects
  useEffect(() => {
    async function deriveVault() {
      if (!walletAddress) {
        setVaultAddress(null);
        setProfileAddress(null);
        setMintAddress(null);
        setTokenAccountAddress(null);
        return;
      }

      const [vaultPda] = await getProgramDerivedAddress({
        programAddress: VAULT_PROGRAM_ADDRESS,
        seeds: [
          getBytesEncoder().encode(new Uint8Array([118, 97, 117, 108, 116])), // "vault"
          getAddressEncoder().encode(walletAddress),
        ],
      });

      const [profilePda] = await getProgramDerivedAddress({
        programAddress: VAULT_PROGRAM_ADDRESS,
        seeds: [
          getBytesEncoder().encode(new Uint8Array([117, 115, 101, 114])), // "user"
          getAddressEncoder().encode(walletAddress),
        ],
      });

      const [mintPda] = await getProgramDerivedAddress({
        programAddress: VAULT_PROGRAM_ADDRESS,
        seeds: [
          getBytesEncoder().encode(new Uint8Array([109, 105, 110, 116])), // "mint"
        ],
      });

      const [tokenAccount] = await getProgramDerivedAddress({
        programAddress: ASSOCIATED_TOKEN_PROGRAM_ADDRESS,
        seeds: [
          getAddressEncoder().encode(walletAddress),
          getAddressEncoder().encode(TOKEN_PROGRAM_ADDRESS),
          getAddressEncoder().encode(mintPda),
        ],
      });

      setVaultAddress(vaultPda);
      setProfileAddress(profilePda);
      setMintAddress(mintPda);
      setTokenAccountAddress(tokenAccount);
    }

    deriveVault();
  }, [walletAddress]);

  // Get vault balance
  const vaultBalance = useBalance(vaultAddress ?? undefined);
  const vaultLamports = vaultBalance?.lamports ?? 0n;
  const vaultSol = Number(vaultLamports) / Number(LAMPORTS_PER_SOL);

  // User profile data
  const profileAccount = useAccount(profileAddress ?? undefined);

  useEffect(() => {
    const raw = profileAccount?.data as Uint8Array | undefined;
    if (!raw || raw.length < 8 + 32 + 8) {
      setPoints(0);
      return;
    }

    const pointsValue = new DataView(raw.buffer, raw.byteOffset + 8 + 32, 8).getBigUint64(0, true);
    setPoints(Number(pointsValue));
  }, [profileAccount?.data]);

  // Token account balance
  const tokenAccount = useAccount(tokenAccountAddress ?? undefined);

  useEffect(() => {
    const raw = tokenAccount?.data as Uint8Array | undefined;
    if (!raw || raw.length < 72) {
      setTokenBalance(0);
      return;
    }

    const balanceValue = new DataView(raw.buffer, raw.byteOffset + 64, 8).getBigUint64(0, true);
    setTokenBalance(Number(balanceValue));
  }, [tokenAccount?.data]);

  const handleInitializeMint = useCallback(async () => {
    if (!walletAddress || !mintAddress) return;

    try {
      setTxStatus("Building transaction...");
      const discriminator = await getAnchorDiscriminator("initialize_mint");
      const instruction = {
        programAddress: VAULT_PROGRAM_ADDRESS,
        accounts: [
          { address: mintAddress, role: 1 },
          { address: walletAddress, role: 3 },
          { address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" as Address, role: 0 },
          { address: SYSTEM_PROGRAM_ADDRESS, role: 0 },
          { address: "SysvarRent111111111111111111111111111111111" as Address, role: 0 },
        ],
        data: new Uint8Array(discriminator),
      };

      setTxStatus("Awaiting signature...");
      const signature = await send({ instructions: [instruction] });
      setTxStatus(`Mint initialized (${signature?.slice(0, 20)}...)`);
    } catch (err) {
      console.error("Initialize mint failed:", err);
      setTxStatus(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }, [walletAddress, mintAddress, send]);

  const handleInitializeUser = useCallback(async () => {
    if (!walletAddress || !profileAddress) return;

    try {
      setTxStatus("Building transaction...");
      const discriminator = await getAnchorDiscriminator("initialize_user");
      const instruction = {
        programAddress: VAULT_PROGRAM_ADDRESS,
        accounts: [
          { address: profileAddress, role: 1 },
          { address: walletAddress, role: 3 },
          { address: SYSTEM_PROGRAM_ADDRESS, role: 0 },
        ],
        data: new Uint8Array(discriminator),
      };

      setTxStatus("Awaiting signature...");
      const signature = await send({ instructions: [instruction] });
      setTxStatus(`User profile initialized (${signature?.slice(0, 20)}...)`);
    } catch (err) {
      console.error("Initialize user failed:", err);
      setTxStatus(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }, [walletAddress, profileAddress, send]);

  const handleRecordDrop = useCallback(async () => {
    if (!walletAddress || !profileAddress || !mintAddress || !tokenAccountAddress) return;

    const weightValue = BigInt(Math.max(parseFloat(weight) || 0, 0));
    const multiplierValue = BigInt(Math.max(parseInt(multiplier, 10) || 1, 1));

    if (weightValue <= 0n) {
      setTxStatus("Weight must be greater than 0");
      return;
    }

    try {
      setTxStatus("Building transaction...");
      const discriminator = await getAnchorDiscriminator("record_drop");
      const data = new Uint8Array(8 + 8 + 8);
      data.set(discriminator, 0);
      data.set(u64ToUint8Array(weightValue), 8);
      data.set(u64ToUint8Array(multiplierValue), 16);

      const instruction = {
        programAddress: VAULT_PROGRAM_ADDRESS,
        accounts: [
          { address: profileAddress, role: 1 },
          { address: mintAddress, role: 1 },
          { address: tokenAccountAddress, role: 1 },
          { address: walletAddress, role: 3 },
          { address: walletAddress, role: 3 },
          { address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" as Address, role: 0 },
          { address: "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL" as Address, role: 0 },
          { address: SYSTEM_PROGRAM_ADDRESS, role: 0 },
          { address: "SysvarRent111111111111111111111111111111111" as Address, role: 0 },
        ],
        data,
      };

      setTxStatus("Awaiting signature...");
      const signature = await send({ instructions: [instruction] });
      setTxStatus(`Drop recorded: +${Number(weightValue * multiplierValue)} points & tokens (${signature?.slice(0, 20)}...)`);
      setWeight("");
    } catch (err) {
      console.error("Record drop failed:", err);
      setTxStatus(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }, [walletAddress, profileAddress, mintAddress, tokenAccountAddress, weight, multiplier, send]);

  const handleDeposit = useCallback(async () => {
    if (!walletAddress || !vaultAddress || !amount) return;

    try {
      setTxStatus("Building transaction...");

      const depositAmount = BigInt(
        Math.floor(parseFloat(amount) * Number(LAMPORTS_PER_SOL))
      );

      // Manually construct the instruction
      const instruction = {
        programAddress: VAULT_PROGRAM_ADDRESS,
        accounts: [
          { address: walletAddress, role: 3 }, // WritableSigner (3 = writable + signer)
          { address: vaultAddress, role: 1 }, // Writable (1 = writable)
          { address: SYSTEM_PROGRAM_ADDRESS, role: 0 }, // Readonly (0 = readonly)
        ],
        data: getDepositInstructionDataEncoder().encode({
          amount: depositAmount,
        }),
      };

      setTxStatus("Awaiting signature...");

      const signature = await send({
        instructions: [instruction],
      });

      setTxStatus(`Deposited! Signature: ${signature?.slice(0, 20)}...`);
      setAmount("");
    } catch (err) {
      console.error("Deposit failed:", err);
      setTxStatus(
        `Error: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    }
  }, [walletAddress, vaultAddress, amount, send]);

  const handleWithdraw = useCallback(async () => {
    if (!walletAddress || !vaultAddress) return;

    try {
      setTxStatus("Building transaction...");

      // Manually construct the instruction
      const instruction = {
        programAddress: VAULT_PROGRAM_ADDRESS,
        accounts: [
          { address: walletAddress, role: 3 }, // WritableSigner
          { address: vaultAddress, role: 1 }, // Writable
          { address: SYSTEM_PROGRAM_ADDRESS, role: 0 }, // Readonly
        ],
        data: getWithdrawInstructionDataEncoder().encode({}),
      };

      setTxStatus("Awaiting signature...");

      const signature = await send({
        instructions: [instruction],
      });

      setTxStatus(`Withdrawn! Signature: ${signature?.slice(0, 20)}...`);
    } catch (err) {
      console.error("Withdraw failed:", err);
      setTxStatus(
        `Error: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    }
  }, [walletAddress, vaultAddress, send]);

  if (status !== "connected") {
    return (
      <section className="w-full max-w-3xl space-y-4 rounded-2xl border border-border-low bg-card p-6 shadow-[0_20px_80px_-50px_rgba(0,0,0,0.35)]">
        <div className="space-y-1">
          <p className="text-lg font-semibold">SOL Vault</p>
          <p className="text-sm text-muted">
            Connect your wallet to interact with the vault program.
          </p>
        </div>
        <div className="rounded-lg bg-cream/50 p-4 text-center text-sm text-muted">
          Wallet not connected
        </div>
      </section>
    );
  }

  return (
    <section className="w-full max-w-3xl space-y-4 rounded-2xl border border-border-low bg-card p-6 shadow-[0_20px_80px_-50px_rgba(0,0,0,0.35)]">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-lg font-semibold">SOL Vault</p>
          <p className="text-sm text-muted">
            Deposit SOL into your personal vault PDA and withdraw anytime.
          </p>
        </div>
        <span className="rounded-full bg-cream px-3 py-1 text-xs font-semibold uppercase tracking-wide text-foreground/80">
          {vaultLamports > 0n ? "Has funds" : "Empty"}
        </span>
      </div>

      {/* Vault Balance */}
      <div className="rounded-xl border border-border-low bg-cream/30 p-4">
        <p className="text-xs uppercase tracking-wide text-muted">
          Vault Balance
        </p>
        <p className="mt-1 text-3xl font-bold tabular-nums">
          {vaultSol.toFixed(4)}{" "}
          <span className="text-lg font-normal text-muted">SOL</span>
        </p>
        {vaultAddress && (
          <p className="mt-2 truncate font-mono text-xs text-muted">
            {vaultAddress}
          </p>
        )}
      </div>

      {/* User points profile */}
      <div className="rounded-xl border border-border-low bg-cream/30 p-4">
        <p className="text-xs uppercase tracking-wide text-muted">Profile points</p>
        <p className="mt-1 text-3xl font-bold tabular-nums">{points}</p>
        {profileAddress ? (
          <p className="mt-2 truncate font-mono text-xs text-muted">{profileAddress}</p>
        ) : (
          <p className="mt-2 text-xs text-muted">No profile PDA yet</p>
        )}
      </div>

      {/* Token balance */}
      <div className="rounded-xl border border-border-low bg-cream/30 p-4">
        <p className="text-xs uppercase tracking-wide text-muted">WayLearn Tokens</p>
        <p className="mt-1 text-3xl font-bold tabular-nums">{tokenBalance}</p>
      </div>

      {/* Initialize buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleInitializeMint}
          disabled={isSending}
          className="flex-1 rounded-lg border border-border-low bg-card px-4 py-2 font-medium transition hover:-translate-y-0.5 hover:shadow-sm cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
        >
          Initialize Mint
        </button>
        <button
          onClick={handleInitializeUser}
          disabled={isSending}
          className="flex-1 rounded-lg border border-border-low bg-card px-4 py-2 font-medium transition hover:-translate-y-0.5 hover:shadow-sm cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
        >
          Initialize Profile
        </button>
      </div>

      {/* Record drop */}
      <div className="space-y-3 rounded-xl border border-border-low bg-cream/30 p-4">
        <p className="text-sm font-medium">Record Recycling Drop</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs uppercase tracking-wide text-muted">
              Weight (kg)
            </label>
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="2.5"
              className="mt-1 w-full rounded border border-border-low bg-card px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-muted">
              Multiplier
            </label>
            <select
              value={multiplier}
              onChange={(e) => setMultiplier(e.target.value)}
              className="mt-1 w-full rounded border border-border-low bg-card px-3 py-2 text-sm"
            >
              <option value="5">Plastic (5x)</option>
              <option value="10">Paper (10x)</option>
              <option value="15">Metal (15x)</option>
              <option value="20">Glass (20x)</option>
            </select>
          </div>
        </div>
        <button
          onClick={handleRecordDrop}
          disabled={isSending || !weight}
          className="w-full rounded-lg border border-border-low bg-card px-4 py-2 font-medium transition hover:-translate-y-0.5 hover:shadow-sm cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
        >
          Record Drop
        </button>
      </div>

      {/* Deposit Form */}
      <div className="space-y-3">
        <div className="flex gap-3">
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="Amount in SOL"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={isSending}
            className="flex-1 rounded-lg border border-border-low bg-card px-4 py-2.5 text-sm outline-none transition placeholder:text-muted focus:border-foreground/30 disabled:cursor-not-allowed disabled:opacity-60"
          />
          <button
            onClick={handleDeposit}
            disabled={
              isSending ||
              !amount ||
              parseFloat(amount) <= 0 ||
              vaultLamports > 0n
            }
            className="rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSending ? "Confirming..." : "Deposit"}
          </button>
        </div>
        {vaultLamports > 0n && (
          <p className="text-xs text-muted">
            Vault already has funds. Withdraw first before depositing again.
          </p>
        )}
      </div>

      {/* Withdraw Button */}
      <button
        onClick={handleWithdraw}
        disabled={isSending || vaultLamports === 0n}
        className="w-full rounded-lg border border-border-low bg-card px-4 py-2.5 text-sm font-medium transition hover:-translate-y-0.5 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isSending ? "Confirming..." : "Withdraw All"}
      </button>

      {/* Status */}
      {txStatus && (
        <div className="rounded-lg border border-border-low bg-cream/50 px-4 py-3 text-sm">
          {txStatus}
        </div>
      )}

      {/* Educational Footer */}
      <div className="border-t border-border-low pt-4 text-xs text-muted">
        <p className="mb-2">
          This vault is an{" "}
          <a
            href="https://www.anchor-lang.com/docs"
            target="_blank"
            rel="noreferrer"
            className="font-medium underline underline-offset-2"
          >
            Anchor program
          </a>{" "}
          deployed on devnet. Want to deploy your own?
        </p>
        <div className="flex flex-wrap gap-3">
          <a
            href="https://www.anchor-lang.com/docs/quickstart"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-md bg-cream px-2 py-1 font-medium transition hover:bg-cream/70"
          >
            Anchor Quickstart
          </a>
          <a
            href="https://solana.com/docs/programs/deploying"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-md bg-cream px-2 py-1 font-medium transition hover:bg-cream/70"
          >
            Deploy Programs
          </a>
          <a
            href="https://github.com/ZYJLiu/anchor-vault-template"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-md bg-cream px-2 py-1 font-medium transition hover:bg-cream/70"
          >
            Reference Repo
          </a>
        </div>
      </div>
    </section>
  );
}
