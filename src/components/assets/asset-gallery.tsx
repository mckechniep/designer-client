"use client";

import { useEffect, useState } from "react";

interface AssetGalleryItem {
  byteSize: number | null;
  fileName: string;
  height: number | null;
  kind: string;
  mimeType: string;
  src: string;
  width: number | null;
}

export function AssetGallery({ assets }: { assets: AssetGalleryItem[] }) {
  const [selectedAsset, setSelectedAsset] = useState<AssetGalleryItem | null>(
    null,
  );
  const [openBuckets, setOpenBuckets] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!selectedAsset) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelectedAsset(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedAsset]);

  if (assets.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-zinc-700 bg-zinc-900/35 px-5 py-8 text-center text-sm text-zinc-500">
        No package assets generated yet.
      </div>
    );
  }

  const buckets = bucketAssets(assets);

  return (
    <>
      <div className="space-y-4">
        {buckets.map((bucket) => {
          const isOpen = openBuckets[bucket.id] ?? bucket.defaultOpen;

          return (
            <details
              key={bucket.id}
              className="group overflow-hidden rounded-md border border-zinc-800 bg-zinc-900/35"
              onToggle={(event) => {
                const nextOpen = event.currentTarget.open;

                setOpenBuckets((current) =>
                  current[bucket.id] === nextOpen
                    ? current
                    : { ...current, [bucket.id]: nextOpen },
                );
              }}
              open={isOpen}
            >
              <summary
                className="grid cursor-pointer list-none gap-4 px-4 py-4 transition hover:bg-zinc-900/70 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-zinc-500 sm:grid-cols-[132px_minmax(0,1fr)_auto]"
                tabIndex={0}
              >
                <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-md border border-zinc-800 bg-zinc-950">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={bucket.lead.src}
                    alt={bucket.lead.fileName}
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="min-w-0 self-center">
                  <h3 className="text-sm font-semibold text-zinc-100">
                    {bucket.title}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-zinc-400">
                    {bucket.description}
                  </p>
                  <p className="mt-2 truncate text-xs text-zinc-500">
                    Preview: {bucket.lead.fileName}
                  </p>
                </div>
                <div className="flex items-center gap-3 self-center text-sm text-zinc-400">
                  <span>{bucket.assets.length} files</span>
                  <span className="text-zinc-600 transition group-open:rotate-90">
                    &rsaquo;
                  </span>
                </div>
              </summary>
              <div className="border-t border-zinc-800 p-4">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {bucket.assets.map((asset) => (
                    <AssetFigure
                      asset={asset}
                      key={`${asset.kind}-${asset.fileName}`}
                      onSelect={() => setSelectedAsset(asset)}
                    />
                  ))}
                </div>
              </div>
            </details>
          );
        })}
      </div>

      {selectedAsset ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/90 p-4"
          role="dialog"
        >
          <div className="flex max-h-full w-full max-w-6xl flex-col rounded-md border border-zinc-700 bg-zinc-950 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-zinc-800 px-4 py-3">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-semibold text-zinc-100">
                  {selectedAsset.fileName}
                </h3>
                <p className="mt-1 text-xs text-zinc-500">
                  {formatKind(selectedAsset.kind)} ·{" "}
                  {formatDimensions(selectedAsset)}
                </p>
              </div>
              <button
                type="button"
                className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm font-semibold text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-500"
                onClick={() => setSelectedAsset(null)}
              >
                Close
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto bg-zinc-950 p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedAsset.src}
                alt={selectedAsset.fileName}
                className="mx-auto max-h-[78vh] max-w-full object-contain"
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function AssetFigure({
  asset,
  onSelect,
}: {
  asset: AssetGalleryItem;
  onSelect: () => void;
}) {
  return (
    <figure className="overflow-hidden rounded-md border border-zinc-800 bg-zinc-900/45">
      <button
        type="button"
        className="flex aspect-[4/3] w-full items-center justify-center bg-zinc-950 transition hover:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-500"
        onClick={onSelect}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={asset.src}
          alt={asset.fileName}
          className="h-full w-full object-contain"
        />
      </button>
      <figcaption className="border-t border-zinc-800 px-4 py-3">
        <p className="truncate text-sm font-semibold text-zinc-100">
          {asset.fileName}
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          {formatKind(asset.kind)} · {formatDimensions(asset)}
        </p>
      </figcaption>
    </figure>
  );
}

function bucketAssets(assets: AssetGalleryItem[]) {
  const assigned = new Set<string>();
  const buckets = bucketDefinitions
    .map((definition) => {
      const bucketItems = assets.filter((asset) =>
        definition.kinds.includes(asset.kind),
      );

      for (const asset of bucketItems) {
        assigned.add(assetKey(asset));
      }

      return {
        ...definition,
        assets: bucketItems,
        lead: bucketItems[0],
      };
    })
    .filter((bucket): bucket is AssetBucket => Boolean(bucket.lead));
  const otherAssets = assets.filter((asset) => !assigned.has(assetKey(asset)));

  if (otherAssets.length > 0) {
    buckets.push({
      assets: otherAssets,
      defaultOpen: false,
      description: "Additional generated package files.",
      id: "other",
      kinds: otherAssets.map((asset) => asset.kind),
      lead: otherAssets[0],
      title: "Other Assets",
    });
  }

  return buckets;
}

interface AssetBucket {
  assets: AssetGalleryItem[];
  defaultOpen: boolean;
  description: string;
  id: string;
  kinds: string[];
  lead: AssetGalleryItem;
  title: string;
}

const bucketDefinitions = [
  {
    defaultOpen: true,
    description:
      "Primary light/source screen, dark screen, and reusable master exports.",
    id: "screens",
    kinds: [
      "screen_plain_light",
      "screen_plain_dark",
      "master_background",
      "thumbnail",
    ],
    title: "Screens",
  },
  {
    defaultOpen: false,
    description: "Approved light and dark palette sheets for implementation.",
    id: "palettes",
    kinds: ["palette_light", "palette_dark"],
    title: "Palettes",
  },
  {
    defaultOpen: false,
    description:
      "Deterministic light and dark button state sheets from the approved palette and font system.",
    id: "buttons-controls",
    kinds: ["buttons_light", "buttons_dark"],
    title: "Buttons",
  },
  {
    defaultOpen: false,
    description:
      "Canonical generated utility icon concept sheet.",
    id: "icon-sets",
    kinds: ["icon_set_showcase", "icon_mark_light", "icon_mark_dark"],
    title: "Icon Sets",
  },
];

function assetKey(asset: AssetGalleryItem) {
  return `${asset.kind}:${asset.fileName}`;
}

function formatKind(kind: string) {
  return kind.replaceAll("_", " ");
}

function formatDimensions({
  byteSize,
  height,
  width,
}: Pick<AssetGalleryItem, "byteSize" | "height" | "width">) {
  const dimensions = width && height ? `${width}x${height}` : "file";
  const size = byteSize ? `${Math.ceil(byteSize / 1024)} KB` : "";

  return [dimensions, size].filter(Boolean).join(" · ");
}
