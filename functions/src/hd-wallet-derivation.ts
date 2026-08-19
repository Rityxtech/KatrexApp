/**
 * Server-side HD wallet address derivation.
 *
 * This replicates the logic from the client-side hd_wallet_service.dart,
 * but runs entirely server-side so the mnemonic never leaves the server.
 */
import * as bip39 from "bip39";
import {BIP32Factory} from "bip32";
import * as ecc from "tiny-secp256k1";
import bs58check from "bs58check";
import * as ed25519HdKey from "ed25519-hd-key";
import * as ed25519 from "@noble/ed25519";
import {keccak_256} from "@noble/hashes/sha3.js";
import {ripemd160} from "@noble/hashes/legacy.js";
import {sha256} from "@noble/hashes/sha2.js";
import {blake2b} from "@noble/hashes/blake2.js";

const bip32 = BIP32Factory(ecc);

// ─── Types ────────────────────────────────────────────────────────────────

enum CoinFamily {
  Bitcoin,
  Ethereum,
  Tron,
  Ed25519,
  Ripple,
}

interface CryptoAssetInfo {
  family: CoinFamily;
  network: string;
  coinType: number;
}

const ASSET_MAP: Record<string, CryptoAssetInfo> = {
  // Bitcoin family
  btc: {family: CoinFamily.Bitcoin, network: "Bitcoin", coinType: 0},
  doge: {family: CoinFamily.Bitcoin, network: "Dogecoin", coinType: 3},
  // Ethereum family (EVM-compatible)
  eth: {family: CoinFamily.Ethereum, network: "ERC20", coinType: 60},
  usdt: {family: CoinFamily.Ethereum, network: "ERC20", coinType: 60},
  usdtbsc: {family: CoinFamily.Ethereum, network: "BEP20", coinType: 60},
  bnb: {family: CoinFamily.Ethereum, network: "BEP20", coinType: 60},
  matic: {family: CoinFamily.Ethereum, network: "Polygon", coinType: 60},
  // Tron family
  usdttrc20: {family: CoinFamily.Tron, network: "TRC20", coinType: 195},
  trx: {family: CoinFamily.Tron, network: "TRC20", coinType: 195},
  // Ed25519 family
  sol: {family: CoinFamily.Ed25519, network: "Solana", coinType: 501},
  ada: {family: CoinFamily.Ed25519, network: "Cardano", coinType: 1815},
  ton: {family: CoinFamily.Ed25519, network: "TON", coinType: 607},
  // Ripple family
  xrp: {family: CoinFamily.Ripple, network: "XRPL", coinType: 144},
};

// ─── Hash helpers ─────────────────────────────────────────────────────────

/** RIPEMD-160(SHA-256(data)) — Bitcoin standard hash160. */
function hash160(data: Uint8Array): Buffer {
  const sha = sha256(data);
  return Buffer.from(ripemd160(sha));
}

/** Blake2b-224 hash (used by Cardano). */
function blake2b224(data: Uint8Array): Buffer {
  return Buffer.from(blake2b(data, {dkLen: 28}));
}

/** Blake2b-256 hash (used by TON). */
function blake2b256(data: Uint8Array): Buffer {
  return Buffer.from(blake2b(data, {dkLen: 32}));
}

// ─── Base58 helpers ───────────────────────────────────────────────────────

const BTC_BASE58_ALPHABET =
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const RIPPLE_BASE58_ALPHABET =
  "rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz";

/** Base58-encode data with the given alphabet (no checksum). */
function base58Encode(data: Buffer, alphabet: string): string {
  if (data.length === 0) return "";
  const bytes = Array.from(data);
  let zeros = 0;
  while (zeros < bytes.length && bytes[zeros] === 0) zeros++;

  const result: number[] = [];
  let startAt = zeros;
  while (startAt < bytes.length) {
    let remainder = 0;
    for (let i = startAt; i < bytes.length; i++) {
      const temp = (remainder << 8) | bytes[i];
      bytes[i] = Math.floor(temp / 58);
      remainder = temp % 58;
    }
    result.push(remainder);
    while (startAt < bytes.length && bytes[startAt] === 0) startAt++;
  }

  let str = "";
  for (let i = 0; i < zeros; i++) str += alphabet[0];
  for (let i = result.length - 1; i >= 0; i--) str += alphabet[result[i]];
  return str;
}

/** Base58Check-encode: data + first 4 bytes of SHA256(SHA256(data)). */
function base58CheckEncode(payload: Buffer, alphabet: string): string {
  const hash1 = sha256(payload);
  const hash2 = sha256(hash1);
  const checksum = Buffer.from(hash2).subarray(0, 4);
  const combined = Buffer.concat([payload, checksum]);
  return base58Encode(combined, alphabet);
}

// ─── Bech32 helper (for Cardano) ──────────────────────────────────────────

const BECH32_CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";

function bech32Polymod(values: number[]): number {
  const generator = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
  let chk = 1;
  for (const v of values) {
    const top = chk >> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ v;
    for (let i = 0; i < 5; i++) {
      if ((top >> i) & 1) chk ^= generator[i];
    }
  }
  return chk;
}

function bech32HrpExpand(hrp: string): number[] {
  const result: number[] = [];
  for (const c of hrp) result.push(c.charCodeAt(0) >> 5);
  result.push(0);
  for (const c of hrp) result.push(c.charCodeAt(0) & 31);
  return result;
}

function convertBits(data: number[], fromBits: number, toBits: number, pad: boolean): number[] {
  let acc = 0;
  let bits = 0;
  const result: number[] = [];
  const maxv = (1 << toBits) - 1;
  for (const value of data) {
    if (value < 0 || value >> fromBits !== 0) throw new Error("Invalid value");
    acc = (acc << fromBits) | value;
    bits += fromBits;
    while (bits >= toBits) {
      bits -= toBits;
      result.push((acc >> bits) & maxv);
    }
  }
  if (pad) {
    if (bits > 0) result.push((acc << (toBits - bits)) & maxv);
  } else if (bits >= fromBits || ((acc << (toBits - bits)) & maxv) !== 0) {
    throw new Error("Invalid padding");
  }
  return result;
}

function bech32Encode(hrp: string, data: Buffer): string {
  const data5 = convertBits(Array.from(data), 8, 5, true);
  const values = [...bech32HrpExpand(hrp), ...data5];
  const checksum = bech32Polymod(values);
  let str = hrp + "1";
  for (const v of data5) str += BECH32_CHARSET[v];
  for (let i = 0; i < 6; i++) {
    str += BECH32_CHARSET[(checksum >> (5 * (5 - i))) & 31];
  }
  return str;
}

// ─── Derivation index ─────────────────────────────────────────────────────
// NOTE: indexes are allocated from a global monotonic counter in Firestore
// (see allocateWalletIndex in secure-functions.ts) — NOT derived from the
// uid. A hash-based index collides across millions of users; the counter
// guarantees every user's addresses are unique on every chain.

// ─── Address derivation — secp256k1 family ────────────────────────────────

function deriveBtcAddress(root: ReturnType<typeof bip32.fromSeed>, idx: number): string {
  const path = `m/44'/0'/0'/0/${idx}`;
  const child = root.derivePath(path);
  const pubKey = Buffer.from(child.publicKey);
  const hash = hash160(pubKey);
  const payload = Buffer.alloc(21);
  payload[0] = 0x00; // Mainnet P2PKH
  hash.copy(payload, 1);
  return bs58check.encode(payload);
}

function deriveDogeAddress(root: ReturnType<typeof bip32.fromSeed>, idx: number): string {
  const path = `m/44'/3'/0'/0/${idx}`;
  const child = root.derivePath(path);
  const pubKey = Buffer.from(child.publicKey);
  const hash = hash160(pubKey);
  const payload = Buffer.alloc(21);
  payload[0] = 0x1e; // Dogecoin mainnet P2PKH
  hash.copy(payload, 1);
  return base58CheckEncode(payload, BTC_BASE58_ALPHABET);
}

function deriveEthAddress(root: ReturnType<typeof bip32.fromSeed>, idx: number): string {
  const path = `m/44'/60'/0'/0/${idx}`;
  const child = root.derivePath(path);
  const pubKey = Buffer.from(child.publicKey);
  // Ethereum address = last 20 bytes of Keccak256(publicKey)
  const hash = keccak_256(pubKey);
  const address = Buffer.from(hash).subarray(12, 32);
  return "0x" + address.toString("hex");
}

function deriveTronAddress(root: ReturnType<typeof bip32.fromSeed>, idx: number): string {
  const path = `m/44'/195'/0'/0/${idx}`;
  const child = root.derivePath(path);
  const pubKey = Buffer.from(child.publicKey);
  const hash = keccak_256(pubKey);
  const addressBytes = Buffer.from(hash).subarray(12, 32);
  const payload = Buffer.alloc(21);
  payload[0] = 0x41; // Tron mainnet prefix
  addressBytes.copy(payload, 1);
  return bs58check.encode(payload);
}

function deriveRippleAddress(root: ReturnType<typeof bip32.fromSeed>, idx: number): string {
  const path = `m/44'/144'/0'/0/${idx}`;
  const child = root.derivePath(path);
  const pubKey = Buffer.from(child.publicKey);
  const hash = hash160(pubKey);
  const payload = Buffer.alloc(21);
  payload[0] = 0x00; // Ripple mainnet version byte
  hash.copy(payload, 1);
  return base58CheckEncode(payload, RIPPLE_BASE58_ALPHABET);
}

// ─── Address derivation — Ed25519 family (SLIP-0010) ──────────────────────

/**
 * Derive an Ed25519 keypair using SLIP-0010 derivation.
 * Uses the ed25519-hd-key library which implements SLIP-0010.
 * Returns (privateKey, publicKey) as 32-byte Buffers.
 */
async function deriveEd25519Key(
  seed: Buffer,
  coinType: number,
  idx: number,
): Promise<{privateKey: Buffer; publicKey: Buffer}> {
  // SLIP-0010 derivation path: m/44'/coinType'/0'/0'/index'
  // All components are hardened (required for Ed25519)
  const path = `m/44'/${coinType}'/0'/0'/${idx}'`;
  const {key} = ed25519HdKey.derivePath(path, seed.toString("hex"));
  const privateKey = Buffer.from(key);
  // Derive public key from private key seed using @noble/ed25519
  const publicKey = await ed25519.getPublicKey(privateKey);
  return {privateKey, publicKey: Buffer.from(publicKey)};
}

function deriveSolanaAddress(publicKey: Buffer): string {
  return base58Encode(publicKey, BTC_BASE58_ALPHABET);
}

function deriveCardanoAddress(publicKey: Buffer): string {
  // Cardano enterprise address: header (0x60) + Blake2b224(pubKeyHash)
  const pubKeyHash = blake2b224(publicKey);
  const addressBytes = Buffer.alloc(29);
  addressBytes[0] = 0x60; // Mainnet enterprise address
  pubKeyHash.copy(addressBytes, 1);
  return bech32Encode("addr", addressBytes);
}

function deriveTonAddress(publicKey: Buffer): string {
  // TON wallet v3r2 — address derived from StateInit hash
  const dataCell = Buffer.alloc(40);
  // seqno = 0 (4 bytes, big-endian)
  dataCell.writeUInt32BE(0, 0);
  // subwallet_id = 698983191 (4 bytes, big-endian)
  dataCell.writeUInt32BE(698983191, 4);
  // public_key (32 bytes)
  publicKey.copy(dataCell, 8);
  const stateInitHash = blake2b256(dataCell);
  return "0:" + stateInitHash.toString("hex");
}

// ─── Main derivation function ─────────────────────────────────────────────

/**
 * Derive a deposit address for a given currency code and derivation index.
 *
 * @param mnemonic - The HD wallet mnemonic (server-side only)
 * @param currencyCode - App currency code: 'btc', 'eth', 'sol', etc.
 * @param index - Globally-unique derivation index allocated to this user
 * @returns The deposit address string
 */
export async function deriveAddress(
  mnemonic: string,
  currencyCode: string,
  index: number,
): Promise<string> {
  const info = ASSET_MAP[currencyCode.toLowerCase()];
  if (!info) {
    throw new Error(`Unsupported currency: ${currencyCode}`);
  }

  const idx = index;
  const seed = Buffer.from(bip39.mnemonicToSeedSync(mnemonic));

  switch (info.family) {
    case CoinFamily.Bitcoin: {
      const root = bip32.fromSeed(seed);
      if (currencyCode.toLowerCase() === "doge") {
        return deriveDogeAddress(root, idx);
      }
      return deriveBtcAddress(root, idx);
    }

    case CoinFamily.Ethereum: {
      const root = bip32.fromSeed(seed);
      return deriveEthAddress(root, idx);
    }

    case CoinFamily.Tron: {
      const root = bip32.fromSeed(seed);
      return deriveTronAddress(root, idx);
    }

    case CoinFamily.Ripple: {
      const root = bip32.fromSeed(seed);
      return deriveRippleAddress(root, idx);
    }

    case CoinFamily.Ed25519: {
      const {publicKey} = await deriveEd25519Key(seed, info.coinType, idx);
      switch (currencyCode.toLowerCase()) {
        case "sol":
          return deriveSolanaAddress(publicKey);
        case "ada":
          return deriveCardanoAddress(publicKey);
        case "ton":
          return deriveTonAddress(publicKey);
        default:
          throw new Error(`Unsupported Ed25519 currency: ${currencyCode}`);
      }
    }
  }
}
