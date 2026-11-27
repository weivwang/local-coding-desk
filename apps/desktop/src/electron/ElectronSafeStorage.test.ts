import * as Effect from "effect/Effect";
import * as HostProcess from "@t3tools/shared/HostProcess";
import { expect, vi } from "vite-plus/test";
import { it } from "@effect/vitest";

const keychainUnreachable = () => {
  throw new Error("a synchronous keychain read blocks the main process");
};
const safeStorage = vi.hoisted(() => ({
  isEncryptionAvailable: vi.fn(),
  encryptString: vi.fn(),
  decryptString: vi.fn(),
  isAsyncEncryptionAvailable: vi.fn(async () => true),
  encryptStringAsync: vi.fn(async (value: string) => Buffer.from(`v10${value}`)),
  decryptStringAsync: vi.fn(async (value: Buffer) => ({
    shouldReEncrypt: false,
    result: value.toString().slice(3),
  })),
  getSelectedStorageBackend: vi.fn(),
}));
vi.mock("electron", () => ({ safeStorage }));

import { ElectronSafeStorage, make } from "./ElectronSafeStorage.ts";

it.effect("reads and writes secrets without a synchronous keychain call", () =>
  Effect.gen(function* () {
    safeStorage.isEncryptionAvailable.mockImplementation(keychainUnreachable);
    safeStorage.encryptString.mockImplementation(keychainUnreachable);
    safeStorage.decryptString.mockImplementation(keychainUnreachable);
    const storage = yield* ElectronSafeStorage;

    expect(yield* storage.isEncryptionAvailable).toBe(true);
    const encrypted = yield* storage.encryptString("token");
    expect(yield* storage.decryptString(encrypted)).toBe("token");
  }).pipe(
    Effect.provideServiceEffect(ElectronSafeStorage, make),
    Effect.provideService(HostProcess.Platform, "darwin"),
  ),
);

it.effect("reports a keychain refusal as a decrypt failure", () =>
  Effect.gen(function* () {
    safeStorage.decryptStringAsync.mockRejectedValueOnce(new Error("user denied keychain access"));
    const storage = yield* ElectronSafeStorage;

    const error = yield* Effect.flip(storage.decryptString(Buffer.from("v10token")));
    expect(error._tag).toBe("ElectronSafeStorageDecryptError");
  }).pipe(
    Effect.provideServiceEffect(ElectronSafeStorage, make),
    Effect.provideService(HostProcess.Platform, "darwin"),
  ),
);
