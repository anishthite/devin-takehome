import { exportJWK, generateKeyPair, type JWK } from "jose";

export const SIGNING_ALG = "RS256";
export const SIGNING_KID = "ledger-demo-1";

interface SigningKey {
  privateKey: CryptoKey;
  publicKey: CryptoKey;
  publicJwk: JWK;
}

const cache = globalThis as typeof globalThis & { ledgerDemoSigningKey?: Promise<SigningKey> };

/** Ephemeral per-process RSA key; cached on globalThis so dev HMR keeps it stable. */
export function signingKey(): Promise<SigningKey> {
  cache.ledgerDemoSigningKey ??= (async () => {
    const { privateKey, publicKey } = await generateKeyPair(SIGNING_ALG);
    const publicJwk: JWK = { ...(await exportJWK(publicKey)), kid: SIGNING_KID, alg: SIGNING_ALG, use: "sig" };
    return { privateKey, publicKey, publicJwk };
  })();
  return cache.ledgerDemoSigningKey;
}
