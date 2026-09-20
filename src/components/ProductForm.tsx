"use client";

import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { ImageUpload } from "./ImageUpload";
import { createProduct } from "@/lib/api";
import type { Product } from "@/lib/types";
import { toast } from "sonner";

interface ProductFormProps {
  onCreated: (product: Product) => void;
}

export function ProductForm({ onCreated }: ProductFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priceSats, setPriceSats] = useState("");
  const [image, setImage] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const price = Number.parseInt(priceSats, 10);
    if (!name.trim()) {
      toast.error("Product name is required");
      return;
    }
    if (!Number.isInteger(price) || price < 1) {
      toast.error("Enter a valid price in sats");
      return;
    }

    setBusy(true);
    try {
      // The server validates all of this again — this check is only here to
      // save a round trip, never as the thing that keeps bad data out.
      const product = await createProduct({
        name: name.trim(),
        description: description.trim(),
        priceSats: price,
        image,
      });

      setName("");
      setDescription("");
      setPriceSats("");
      setImage("");
      onCreated(product);
      toast.success("Product added!");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not add the product"
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-5 p-6">
      <div>
        <h2 className="text-lg font-bold text-[var(--text-primary)]">
          Add Product
        </h2>
        <p className="text-sm text-[var(--text-secondary)]">
          Upload an image and set the price in satoshis.
        </p>
      </div>

      <ImageUpload value={image} onChange={setImage} />

      <div>
        <label className="label" htmlFor="name">
          Name
        </label>
        <input
          id="name"
          className="input"
          maxLength={80}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Lightning Hoodie"
        />
      </div>

      <div>
        <label className="label" htmlFor="description">
          Description
        </label>
        <textarea
          id="description"
          className="input min-h-[88px] resize-y"
          maxLength={500}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="A cozy hoodie for bitcoiners…"
        />
      </div>

      <div>
        <label className="label" htmlFor="price">
          Price (sats)
        </label>
        <input
          id="price"
          type="number"
          min={1}
          step={1}
          className="input font-mono"
          value={priceSats}
          onChange={(e) => setPriceSats(e.target.value)}
          placeholder="1000"
        />
      </div>

      <button type="submit" disabled={busy} className="btn btn-primary w-full">
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Plus className="h-4 w-4" />
        )}
        Add to Store
      </button>
    </form>
  );
}
