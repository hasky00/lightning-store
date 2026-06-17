"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { ImageUpload } from "./ImageUpload";
import { useProductStore } from "@/store/productStore";
import { toast } from "sonner";

export function ProductForm() {
  const addProduct = useProductStore((s) => s.addProduct);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priceSats, setPriceSats] = useState("");
  const [image, setImage] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const price = parseInt(priceSats, 10);
    if (!name.trim()) {
      toast.error("Product name is required");
      return;
    }
    if (!price || price < 1) {
      toast.error("Enter a valid price in sats");
      return;
    }

    addProduct({
      name: name.trim(),
      description: description.trim(),
      priceSats: price,
      image,
    });

    setName("");
    setDescription("");
    setPriceSats("");
    setImage("");
    toast.success("Product added!");
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-5 p-6">
      <div>
        <h2 className="text-lg font-bold text-[var(--text-primary)]">Add Product</h2>
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
          className="input font-mono"
          value={priceSats}
          onChange={(e) => setPriceSats(e.target.value)}
          placeholder="1000"
        />
      </div>

      <button type="submit" className="btn btn-primary w-full">
        <Plus className="h-4 w-4" />
        Add to Store
      </button>
    </form>
  );
}