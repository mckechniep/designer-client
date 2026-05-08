import JSZip from "jszip";
import type {
  AssetPackageOptions,
  GeneratedAssetFile,
  GeneratedAssetPackage,
  GeneratedImage,
} from "./provider";

interface DownloadPackageInput {
  files: GeneratedImage[];
  manifest: GeneratedAssetPackage["manifest"];
}

export async function createDownloadPackage(
  input: DownloadPackageInput,
  options: AssetPackageOptions = {},
): Promise<GeneratedAssetFile> {
  const zip = new JSZip();

  for (const item of input.manifest.files) {
    const file = input.files.find(
      (candidate) =>
        candidate.kind === item.kind && candidate.fileName === item.fileName,
    );

    if (file) {
      zip.file(item.path, file.bytes);
    }
  }

  zip.file("manifest.json", JSON.stringify(input.manifest, null, 2));
  zip.file("README.md", createReadme(input.manifest, options));

  const bytes = await zip.generateAsync({ type: "nodebuffer" });

  return {
    kind: "download_package",
    fileName: `${assetPrefix(options)}asset-package-${assetVersion(options)}.zip`,
    mimeType: "application/zip",
    bytes,
  };
}

function createReadme(
  manifest: GeneratedAssetPackage["manifest"],
  options: AssetPackageOptions,
) {
  const title = options.appSlug
    ? `${titleCase(options.appSlug)} mobile asset package`
    : "Mobile asset package";
  const files = manifest.files
    .map(
      (file) =>
        `- ${file.path} (${file.kind}, ${file.width}x${file.height}, ${file.mimeType})`,
    )
    .join("\n");

  return [
    `# ${title}`,
    "",
    "Generated static assets for mobile app implementation.",
    "",
    "## Files",
    "",
    files,
    "",
    "Use the master/light source screen and dark screen as the screen visual sources. Use the light/dark button sheets and palette sheets as implementation handoff references. Icon sheets are canonical concept references unless a later package includes structured SVG exports.",
  ].join("\n");
}

function assetPrefix(options: AssetPackageOptions) {
  return options.appSlug ? `${options.appSlug}-` : "";
}

function assetVersion(options: AssetPackageOptions) {
  return options.version ?? "v1";
}

function titleCase(value: string) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
