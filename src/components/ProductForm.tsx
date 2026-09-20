"use client";

import { useState } from "react";
import { Plus, Loader2, Save, X } from "lucide-react";
import { ImageUpload } from "./ImageUpload";
import { createProduct, updateProduct } from "@/lib/api";
import type { Product } from "@/lib/types";
import { toast } from "sonner";

interface ProductFormProps {
  /** When given, the form edits this product instead of creating one. */
  product?: Product;
  onSaved: (product: Product) => void;
  onCancel?: () => void;
}

export function ProductForm({ product, onSaved, onCancel }: ProductFormProps) {
  const editing = Boolean(product);

  const [name, setName] = useState(product?.name ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [priceSats, setPriceSats] = useState(
    product ? String(product.priceSats) : ""
  );
  const [stock, setStock] = useState(
    product?.stock === null || product?.stock === undefined
      ? ""
      : String(product.stock)
  );
  const [image, setImage] = useState(product?.image ?? "");
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

    const trimmedStock = stock.trim();
    let parsedStock: number | null = null;
    if (trimmedStock !== "") {
      parsedStock = Number.parseInt(trimmedStock, 10);
      if (!Number.isInteger(parsedStock) || parsedStock < 0) {
        toast.error("Stock must be a whole number, or blank for unlimited");
        return;
      }
    }

    setBusy(true);
    try {
      // The server validates all of this again — these checks only save a
      // round trip, they are never the thing keeping bad data out.
      const draft = {
        name: name.trim(),
        description: description.trim(),
        priceSats: price,
        image,
        stock: parsedStock,
      };

      const saved = product
        ? await updateProduct(product.id, draft)
        : await createProduct(draft);

      if (!editing) {
        setName("");
        setDescription("");
        setPriceSats("");
        setStock("");
        setImage("");
      }

      onSaved(saved);
      toast.success(editing ? "Product updated" : "Product added!");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save the product"
      );
    } finally {
      setBusy(false);
    }
  }

  const fieldId = (base: string) =>
    product ? `${base}-${product.id}` : `${base}-new`;

  return (
    <form onSubmit={handleSubmit} className="card space-y-5 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[var(--text-primary)]">
            {editing ? `Edit ${product?.name}` : "Add Product"}
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Upload an image and set the price in satoshis.
          </p>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancel editing"
            className="btn btn-ghost shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <ImageUpload value={image} onChange={setImage} />

      <div>
        <label className="label" htmlFor={fieldId("name")}>
          Name
        </label>
        <input
          id={fieldId("name")}
          className="input"
          maxLength={80}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Lightning Hoodie"
        />
      </div>

      <div>
        <label className="label" htmlFor={fieldId("description")}>
          Description
        </label>
        <textarea
          id={fieldId("description")}
          className="input min-h-[88px] resize-y"
          maxLength={500}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="A cozy hoodie for bitcoiners…"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor={fieldId("price")}>
            Price (sats)
          </label>
          <input
            id={fieldId("price")}
            type="number"
            min={1}
            step={1}
            className="input font-mono"
            value={priceSats}
            onChange={(e) => setPriceSats(e.target.value)}
            placeholder="1000"
          />
        </div>

        <div>
          <label className="label" htmlFor={fieldId("stock")}>
            Stock
          </label>
          <input
            id={fieldId("stock")}
            type="number"
            min={0}
            step={1}
            className="input font-mono"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            placeholder="Unlimited"
          />
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Leave blank for unlimited
          </p>
        </div>
      </div>

      <button type="submit" disabled={busy} className="btn btn-primary w-full">
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : editing ? (
          <Save className="h-4 w-4" />
        ) : (
          <Plus className="h-4 w-4" />
        )}
        {editing ? "Save Changes" : "Add to Store"}
      </button>
    </form>
  );
}
