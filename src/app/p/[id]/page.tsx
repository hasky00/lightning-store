import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getListing } from "@/server/products";
import { getSettings } from "@/server/settings";
import { ProductDetail } from "@/components/ProductDetail";

export const dynamic = "force-dynamic";

/**
 * A shareable page per product.
 *
 * Rendered on the server so the title, description and price are in the HTML
 * itself — a link pasted into a chat or a search result shows what is for
 * sale, which a client-only storefront cannot do.
 */
export async function generateMetadata(
  props: PageProps<"/p/[id]">
): Promise<Metadata> {
  const { id } = await props.params;
  const [product, settings] = await Promise.all([getListing(id), getSettings()]);

  if (!product) {
    return { title: `Not found — ${settings.storeName}` };
  }

  const title = `${product.name} — ${settings.storeName}`;
  const description =
    product.description || `${product.name}, priced in satoshis.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: product.image ? [{ url: product.image }] : undefined,
    },
    twitter: {
      card: product.image ? "summary_large_image" : "summary",
      title,
      description,
    },
  };
}

export default async function ProductPage(props: PageProps<"/p/[id]">) {
  const { id } = await props.params;
  const [product, settings] = await Promise.all([getListing(id), getSettings()]);

  if (!product) notFound();

  return <ProductDetail product={product} storeName={settings.storeName} />;
}
