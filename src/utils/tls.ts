import selfsigned from "selfsigned";
import fs from "fs/promises";
import path from "path";
import { X509Certificate } from "crypto";
import { logger } from "./logger";

const REQUIRED_DNS_NAMES = [
  "growtopia1.com",
  "www.growtopia1.com",
  "growtopia2.com",
  "www.growtopia2.com",
];

function certNeedsRegeneration(certPem: string) {
  try {
    const cert = new X509Certificate(certPem);
    const san = String(cert.subjectAltName || "");
    for (const name of REQUIRED_DNS_NAMES) {
      if (!san.includes(`DNS:${name}`)) {
        return true;
      }
    }
    return false;
  } catch {
    return true;
  }
}

export async function ensureTlsCertificate(certPath: string, keyPath: string) {
  const certResolved = path.resolve(certPath);
  const keyResolved = path.resolve(keyPath);

  let exists = false;
  try {
    await fs.access(certResolved);
    await fs.access(keyResolved);
    exists = true;
  } catch {}

  if (exists) {
    const certPem = await fs.readFile(certResolved, "utf8");
    if (!certNeedsRegeneration(certPem)) {
      return;
    }
    console.warn(
      "Existing TLS cert is incompatible with Growtopia hostnames. Regenerating...",
    );
  }

  await fs.mkdir(path.dirname(certResolved), { recursive: true });
  await fs.mkdir(path.dirname(keyResolved), { recursive: true });

  const attrs = [{ name: "commonName", value: "growtopia1.com" }];
  const pems = await selfsigned.generate(attrs, {
    algorithm: "sha256",
    keySize: 2048,
    notAfterDate: new Date(Date.now() + 3650 * 24 * 60 * 60 * 1000),
    extensions: [
      {
        name: "subjectAltName",
        altNames: REQUIRED_DNS_NAMES.map((value) => ({ type: 2, value })),
      },
    ],
  });

  await fs.writeFile(certResolved, pems.cert, "utf8");
  await fs.writeFile(keyResolved, pems.private, "utf8");
  logger.info(
    { certPath: certResolved, keyPath: keyResolved },
    `generated Growtopia compatible selfsigned`,
  );
}
