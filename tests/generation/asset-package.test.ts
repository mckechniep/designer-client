import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import sharp from "sharp";
import { createAssetPackage } from "@/lib/generation/derivatives";
import { MockImageProvider } from "@/lib/generation/mock-provider";

describe("asset package generation", () => {
  it("returns the static asset sheets and mobile screens needed for client handoff", async () => {
    const provider = new MockImageProvider();
    const master = await provider.generateMasterAsset({
      prompt: "Create a static master asset package.",
      aspect: "portrait",
      quality: "final",
    });

    const assetPackage = await createAssetPackage(master, {
      appSlug: "laitly",
      version: "v1",
    });
    const filesByKind = new Map(
      assetPackage.files.map((file) => [file.kind, file]),
    );

    expect([...filesByKind.keys()].sort()).toEqual([
      "buttons_dark",
      "buttons_light",
      "icon_mark_dark",
      "icon_mark_light",
      "master_background",
      "palette_dark",
      "palette_light",
      "screen_plain_dark",
      "screen_plain_light",
      "splash",
      "thumbnail",
    ]);
    expect(filesByKind.get("palette_light")?.fileName).toBe(
      "laitly-light-palette.png",
    );
    expect(filesByKind.get("palette_dark")?.fileName).toBe(
      "laitly-dark-palette.png",
    );
    expect(filesByKind.get("buttons_light")?.fileName).toBe(
      "buttons-light-all-v1.png",
    );
    expect(filesByKind.get("buttons_dark")?.fileName).toBe(
      "buttons-dark-all-v1.png",
    );
    expect(filesByKind.get("screen_plain_light")?.fileName).toBe(
      "light-screen-plain.png",
    );
    expect(filesByKind.get("screen_plain_dark")?.fileName).toBe(
      "dark-screen-plain.png",
    );
    expect(filesByKind.get("splash")?.fileName).toBe("splash-v1.png");
    expect(assetPackage.downloadPackage).toMatchObject({
      kind: "download_package",
      fileName: "laitly-asset-package-v1.zip",
      mimeType: "application/zip",
    });
    expect(
      assetPackage.manifest.files.find((file) => file.kind === "buttons_dark")
        ?.path,
    ).toBe("mobile-assets/buttons-dark-all-v1.png");

    expect(assetPackage.manifest.files).toHaveLength(assetPackage.files.length);
    expect(
      assetPackage.manifest.files.every((file) => file.byteSize > 0),
    ).toBe(true);
  });

  it("creates dimensionally correct generated images", async () => {
    const provider = new MockImageProvider();
    const master = await provider.generateMasterAsset({
      prompt: "Create a static master asset package.",
      aspect: "portrait",
      quality: "final",
    });
    const assetPackage = await createAssetPackage(master);
    const splash = assetPackage.files.find((file) => file.kind === "splash");
    const buttons = assetPackage.files.find(
      (file) => file.kind === "buttons_dark",
    );

    expect(splash).toMatchObject({
      width: 1290,
      height: 2796,
      mimeType: "image/png",
    });
    expect(buttons).toMatchObject({
      width: 2400,
      height: 1600,
      mimeType: "image/png",
    });
    await expect(sharp(splash?.bytes).metadata()).resolves.toMatchObject({
      width: 1290,
      height: 2796,
      format: "png",
    });
  });

  it("creates a downloadable zip with manifest and static image assets", async () => {
    const provider = new MockImageProvider();
    const master = await provider.generateMasterAsset({
      prompt: "Create a static master asset package.",
      aspect: "portrait",
      quality: "final",
    });
    const assetPackage = await createAssetPackage(master, {
      appSlug: "laitly",
      version: "v1",
    });
    const zip = await JSZip.loadAsync(assetPackage.downloadPackage.bytes);

    expect(zip.file("manifest.json")).not.toBeNull();
    expect(zip.file("README.md")).not.toBeNull();
    expect(zip.file("laitly-dark-palette.png")).not.toBeNull();
    expect(zip.file("mobile-assets/buttons-dark-all-v1.png")).not.toBeNull();
    expect(zip.file("mobile-assets/dark-screen-plain.png")).not.toBeNull();
  });
});
