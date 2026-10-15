"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Loader, SegmentedControl, TextInput } from "@mantine/core";
import type { ProductDraft } from "@/lib/catalog/edit";
import type { MediaRole, ProductMedia } from "@/lib/catalog/types";
import { ProductImage } from "@/app/site/ProductImage";
import { ArrowLeft, ArrowRight, Grip, Trash, Upload } from "@/app/site/icons";
import type { Update } from "./ProductEditor";
import { ACCEPT, uploadPhoto } from "./uploads";

type Pending = { id: string; name: string; url: string };

const code = (publicId: string) => publicId.replace(/^products\//, "");

/**
 * The product's photographs and size diagrams, in the order the shop shows
 * them. Drop, paste or pick files; they are resized here and uploaded at
 * once, but only become the product's when it is saved.
 */
export function PhotosTab({
  draft,
  update,
  onUploading,
}: {
  draft: ProductDraft;
  update: Update;
  onUploading: (delta: number) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Pending[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [dragging, setDragging] = useState<number | null>(null);
  const [over, setOver] = useState(false);

  const media = draft.media;
  const mainIndex = media.findIndex((m) => m.role === "photo");

  const setMedia = (next: ProductMedia[]) => update({ media: next });

  const add = (files: File[]) => {
    const images = files.filter((f) => f.type.startsWith("image/"));
    if (!images.length) return;
    setErrors([]);
    for (const file of images) {
      const job = { id: crypto.randomUUID(), name: file.name, url: URL.createObjectURL(file) };
      setPending((p) => [...p, job]);
      onUploading(1);
      uploadPhoto(file, draft.code, draft.name.trim())
        .then((m) => update((d) => ({ media: [...d.media, m] })))
        .catch((e: Error) => setErrors((list) => [...list, e.message]))
        .finally(() => {
          URL.revokeObjectURL(job.url);
          setPending((p) => p.filter((x) => x.id !== job.id));
          onUploading(-1);
        });
    }
  };

  // A screenshot or a copied image can be pasted straight in.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = [...(e.clipboardData?.files ?? [])];
      if (files.length) {
        e.preventDefault();
        add(files);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  });

  const move = (from: number, to: number) => {
    if (to < 0 || to >= media.length || from === to) return;
    const next = [...media];
    const [m] = next.splice(from, 1);
    next.splice(to, 0, m);
    setMedia(next);
  };

  const patch = (i: number, p: Partial<ProductMedia>) => setMedia(media.map((m, j) => (j === i ? { ...m, ...p } : m)));

  return (
    <div className="panel">
      <div
        id="photos-add"
        className={over ? "drop drop--over" : "drop"}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("Files")) {
            e.preventDefault();
            setOver(true);
          }
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          if (!e.dataTransfer.files.length) return;
          e.preventDefault();
          setOver(false);
          add([...e.dataTransfer.files]);
        }}
      >
        <Upload size={28} />
        <div>
          <p className="drop__title">Drag photos here, paste them, or</p>
          <p className="hint">JPG, PNG or WebP.</p>
        </div>
        <Button variant="light" onClick={() => input.current?.click()} disabled={!draft.code}>
          Choose photos
        </Button>
        <input
          ref={input}
          type="file"
          accept={ACCEPT.join(",")}
          multiple
          hidden
          onChange={(e) => {
            add([...(e.currentTarget.files ?? [])]);
            e.currentTarget.value = "";
          }}
        />
      </div>

      {!draft.code ? <p className="hint hint--warn">Add the shop code under Details first.</p> : null}

      <div role="alert">
        {errors.map((e) => (
          <p key={e} className="admin-error">
            {e}
          </p>
        ))}
      </div>

      {media.length === 0 && pending.length === 0 ? (
        <p className="empty__lede">
          No photos yet. The first product photo becomes the main one on the card.
        </p>
      ) : (
        <ol id="photos-list" className="photos" aria-label="Photos, in the order the shop shows them">
          {media.map((m, i) => (
            <li
              key={m.publicId}
              className={dragging === i ? "photo photo--dragging" : "photo"}
              draggable
              onDragStart={(e) => {
                setDragging(i);
                e.dataTransfer.effectAllowed = "move";
              }}
              onDragEnd={() => setDragging(null)}
              onDragOver={(e) => {
                if (dragging !== null) e.preventDefault();
              }}
              onDrop={(e) => {
                if (dragging === null) return;
                e.preventDefault();
                e.stopPropagation();
                move(dragging, i);
                setDragging(null);
              }}
            >
              <div className="photo__image">
                <ProductImage code={code(m.publicId)} alt="" width={400} height={400} sizes="240px" />
                {i === mainIndex ? <span className="photo__main">Main photo</span> : null}
                <span className="photo__grip" aria-hidden="true">
                  <Grip size={20} />
                </span>
              </div>
              <div className="photo__fields">
                <SegmentedControl
                  size="sm"
                  fullWidth
                  aria-label="What this image is"
                  value={m.role}
                  onChange={(v) => patch(i, { role: v as MediaRole })}
                  data={[
                    { value: "photo", label: "Product photo" },
                    { value: "dimension", label: "Size diagram" },
                  ]}
                />
                <TextInput
                  size="sm"
                  label="Describe it"
                  description="For people who can’t see it."
                  value={m.alt}
                  onChange={(e) => patch(i, { alt: e.currentTarget.value })}
                  error={!m.alt.trim() ? "Describe it before saving" : undefined}
                />
                <div className="photo__actions">
                  <Button variant="subtle" size="sm" px={10} aria-label={`Move photo ${i + 1} earlier`} onClick={() => move(i, i - 1)} disabled={i === 0}>
                    <ArrowLeft size={18} />
                  </Button>
                  <Button variant="subtle" size="sm" px={10} aria-label={`Move photo ${i + 1} later`} onClick={() => move(i, i + 1)} disabled={i === media.length - 1}>
                    <ArrowRight size={18} />
                  </Button>
                  <Button
                    variant="subtle"
                    color="red"
                    size="sm"
                    leftSection={<Trash size={18} />}
                    aria-label={`Remove photo ${i + 1}`}
                    onClick={() => setMedia(media.filter((_, j) => j !== i))}
                    className="photo__remove"
                  >
                    Remove
                  </Button>
                </div>
              </div>
            </li>
          ))}
          {pending.map((p) => (
            <li key={p.id} className="photo photo--pending" aria-label={`Uploading ${p.name}`}>
              <div className="photo__image">
                {/* eslint-disable-next-line @next/next/no-img-element -- a local preview of a file not yet uploaded */}
                <img src={p.url} alt="" />
                <span className="photo__loading">
                  <Loader size="sm" color="white" />
                  Uploading
                </span>
              </div>
            </li>
          ))}
        </ol>
      )}

      {media.length > 0 ? (
        <p className="hint">Size diagrams show only on the product page.</p>
      ) : null}
    </div>
  );
}
