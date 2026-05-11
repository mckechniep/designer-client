export function AssetPreview({
  fileName,
  src,
}: {
  fileName?: string | null;
  src?: string | null;
}) {
  return (
    <div className="overflow-hidden rounded-md border border-zinc-800 bg-zinc-900/45">
      {src ? (
        <div className="h-80 overflow-hidden bg-zinc-950">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt="Latest generated asset preview"
            className="h-full w-full object-cover"
          />
        </div>
      ) : (
        <div className="flex h-80 items-center justify-center px-4 text-center text-sm text-zinc-500">
          No generated assets yet
        </div>
      )}
      <div className="border-t border-zinc-800 px-4 py-3">
        <p className="truncate text-sm font-medium text-zinc-200">
          {fileName ?? "Latest preview"}
        </p>
      </div>
    </div>
  );
}
