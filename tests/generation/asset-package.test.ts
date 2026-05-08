import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import sharp from "sharp";
import {
  createAssetPackage,
  createButtonSheetSvg,
} from "@/lib/generation/derivatives";
import { MockImageProvider } from "@/lib/generation/mock-provider";
import { buildPaletteSystem, paletteModeToAssetPalette } from "@/lib/palette/spec";

describe("asset package generation", () => {
  it("varies mock master assets when prompts change", async () => {
    const provider = new MockImageProvider();
    const calmMaster = await provider.generateMasterAsset({
      prompt: "Create a calm premium master asset package.",
      aspect: "portrait",
      quality: "final",
    });
    const brightMaster = await provider.generateMasterAsset({
      prompt: "Create a bright futuristic master asset package.",
      aspect: "portrait",
      quality: "final",
    });

    expect(calmMaster.bytes.equals(brightMaster.bytes)).toBe(false);
  });

  it("varies package derivative sheets when the master asset changes", async () => {
    const provider = new MockImageProvider();
    const calmMaster = await provider.generateMasterAsset({
      prompt: "Create a calm premium master asset package.",
      aspect: "portrait",
      quality: "final",
    });
    const brightMaster = await provider.generateMasterAsset({
      prompt: "Create a bright futuristic master asset package.",
      aspect: "portrait",
      quality: "final",
    });
    const calmPackage = await createAssetPackage(calmMaster);
    const brightPackage = await createAssetPackage(brightMaster);

    expect(
      findFile(calmPackage, "palette_light").bytes.equals(
        findFile(brightPackage, "palette_light").bytes,
      ),
    ).toBe(false);
    expect(
      findFile(calmPackage, "buttons_dark").bytes.equals(
        findFile(brightPackage, "buttons_dark").bytes,
      ),
    ).toBe(false);
    expect(
      findFile(calmPackage, "screen_plain_dark").bytes.equals(
        findFile(brightPackage, "screen_plain_dark").bytes,
      ),
    ).toBe(false);
  });

  it("returns the focused v0.1 asset sheets and screens needed for client handoff", async () => {
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
      "master_background",
      "palette_dark",
      "palette_light",
      "screen_plain_dark",
      "screen_plain_light",
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
      "light-screen.png",
    );
    expect(filesByKind.get("screen_plain_dark")?.fileName).toBe(
      "dark-screen.png",
    );
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
    const lightScreen = assetPackage.files.find(
      (file) => file.kind === "screen_plain_light",
    );
    const buttons = assetPackage.files.find(
      (file) => file.kind === "buttons_dark",
    );

    expect(lightScreen).toMatchObject({
      width: 1440,
      height: 2560,
      mimeType: "image/png",
    });
    expect(buttons).toMatchObject({
      width: 2400,
      height: 1600,
      mimeType: "image/png",
    });
    await expect(sharp(lightScreen?.bytes).metadata()).resolves.toMatchObject({
      width: 1440,
      height: 2560,
      format: "png",
    });
  });

  it("includes controlled model-generated dark screen and canonical icon assets when provided", async () => {
    const provider = new MockImageProvider();
    const master = await provider.generateMasterAsset({
      prompt: "Create a static master asset package.",
      aspect: "portrait",
      quality: "final",
    });
    const darkScreen = await provider.generateAsset({
      aspect: "portrait",
      fileName: "dark-screen-v3.png",
      kind: "screen_plain_dark",
      prompt: "Create a dark screen from the source screen.",
      quality: "final",
      targetLabel: "dark screen",
    });
    const icons = await provider.generateAsset({
      aspect: "portrait",
      fileName: "app-icon-set-v3.png",
      kind: "icon_set_showcase",
      prompt: "Create a canonical app icon set.",
      quality: "final",
      targetLabel: "app icon set",
    });
    const assetPackage = await createAssetPackage(master, {
      appSlug: "laitly",
      generatedAssets: [darkScreen, icons],
      version: "v3",
    });

    expect(findFile(assetPackage, "screen_plain_dark")).toMatchObject({
      fileName: "dark-screen-v3.png",
    });
    expect(findFile(assetPackage, "icon_set_showcase")).toMatchObject({
      fileName: "app-icon-set-v3.png",
    });
    expect(
      assetPackage.manifest.files.find(
        (file) => file.kind === "icon_set_showcase",
      )?.path,
    ).toBe("mobile-assets/app-icon-set-v3.png");
  });

  it("renders button sheets from approved palette states and selected fonts", async () => {
    const palette = buildPaletteSystem({
      appName: "Laitly",
      dislikedColors: [],
      likedColors: ["Primary anchor #e8c86a", "Accent anchor #b97862"],
    });
    const runtimePalette = paletteModeToAssetPalette(palette.light);
    const svg = createButtonSheetSvg("light", {
      fontPreferences:
        "Display / Voice font: Instrument Serif. Body / Workhorse font: Inter. Utility / Accent font: JetBrains Mono.",
      palette: runtimePalette,
      version: "v7",
    });

    expect(svg).toContain("Inter");
    expect(svg).toContain("Instrument Serif");
    expect(svg).toContain(runtimePalette.primary);
    expect(svg).toContain(runtimePalette.primaryHover);
    expect(svg).toContain(runtimePalette.primaryPressed);
    expect(svg).not.toContain("font-family=\"Arial\"");
    expect(svg).not.toContain("#075965");
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
    expect(zip.file("mobile-assets/master-background.webp")).not.toBeNull();
    expect(zip.file("mobile-assets/buttons-dark-all-v1.png")).not.toBeNull();
    expect(zip.file("mobile-assets/dark-screen.png")).not.toBeNull();
    expect(zip.file("mobile-assets/splash-v1.png")).toBeNull();
    expect(zip.file("mobile-assets/light-screen-examples-v1.png")).toBeNull();
    expect(zip.file("mobile-assets/controls-showcase-v1.png")).toBeNull();

    const webpBytes = await zip
      .file("mobile-assets/master-background.webp")
      ?.async("nodebuffer");

    expect(webpBytes).toBeDefined();
    await expect(sharp(webpBytes as Buffer).metadata()).resolves.toMatchObject({
      format: "webp",
    });
  });

  it("uses the requested package version in generated package filenames", async () => {
    const provider = new MockImageProvider();
    const master = await provider.generateMasterAsset({
      prompt: "Create a static master asset package.",
      aspect: "portrait",
      quality: "final",
    });
    const assetPackage = await createAssetPackage(master, {
      appSlug: "laitly",
      version: "v2",
    });

    expect(
      assetPackage.files.find((file) => file.kind === "buttons_dark"),
    ).toMatchObject({
      fileName: "buttons-dark-all-v2.png",
    });
    expect(assetPackage.downloadPackage.fileName).toBe(
      "laitly-asset-package-v2.zip",
    );
  });
});

function findFile(
  assetPackage: Awaited<ReturnType<typeof createAssetPackage>>,
  kind: string,
) {
  const file = assetPackage.files.find((candidate) => candidate.kind === kind);

  if (!file) {
    throw new Error(`Expected ${kind} to exist`);
  }

  return file;
}
