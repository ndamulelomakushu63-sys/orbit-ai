import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

function getValidUrl(url: any, fallback: string): string {
  if (typeof url === 'string' && url.trim() !== '') {
    const trimmed = url.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
  }
  return fallback;
}

function getSupabaseServerClient() {
  const supabaseUrl = getValidUrl(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, "https://ptpnvrgzdnawvvxrkkid.supabase.co");
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0cG52cmd6ZG5hd3Z2eHJra2lkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3Mzg3ODcsImV4cCI6MjA5ODMxNDc4N30.MUUTitnP27N5Alvyq3W_ntVc8P0NhjhaVWllfU9u_IM";
  return createClient(supabaseUrl, supabaseKey);
}

// --- Product Helpers ---
function isMockProduct(id?: string, name?: string, brandName?: string): boolean {
  const n = (name || "").toLowerCase().trim();
  const b = (brandName || "").toLowerCase().trim();
  const i = (id || "").toLowerCase().trim();
  return i.startsWith("prod-orb-") || i === "prod-orbit-tshirt" || i.startsWith("prod-auth-") || i.startsWith("prod-kasi-") || i === "prod-beat-collection-tee" ||
    b === "orbit collection" || b === "orbit" || b === "authentic" || b === "kasi crafted" || b === "beach collection" || b === "beat collection" ||
    b.includes("beach collection") || b.includes("beat collection") || b.includes("orbit collection") ||
    n.includes("orbit t-shirt") || n.includes("authentic classic") || n.includes("kasi crafted") || n.includes("beach collection") || n.includes("beat collection");
}

function getStoredProducts(): any[] {
  try {
    const dataDir = path.join(process.cwd(), "data");
    const prodsFile = path.join(dataDir, "market_products.json");
    if (fs.existsSync(prodsFile)) {
      const content = fs.readFileSync(prodsFile, "utf-8");
      const list = JSON.parse(content);
      if (Array.isArray(list)) {
        return list.filter((p: any) => p && p.id && p.name && !isMockProduct(p.id, p.name, p.brandName || p.brand_name));
      }
    }
  } catch (e) {}
  return [];
}

function saveStoredProduct(product: any) {
  try {
    if (isMockProduct(product.id, product.name, product.brandName || product.brand_name)) return;
    const dataDir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    const prodsFile = path.join(dataDir, "market_products.json");
    let list = getStoredProducts();
    const idx = list.findIndex((p: any) => p.id === product.id);
    if (idx >= 0) list[idx] = product;
    else list.push(product);
    fs.writeFileSync(prodsFile, JSON.stringify(list, null, 2));
  } catch (e) {}
}

// --- Brand Helpers ---
function isMockBrand(id?: string, name?: string): boolean {
  const n = (name || "").toLowerCase().trim();
  const i = (id || "").toLowerCase().trim();
  return i === "brand-orbit-official" || i === "brand-orbit" || i === "brand-authentic" || i === "brand-kasi-crafted" || i === "brand-beach-collection" || i === "brand-beat-collection" ||
    n === "orbit collection" || n === "orbit" || n === "authentic" || n === "kasi crafted" || n === "beach collection" || n === "beat collection" || n.includes("beach collection") || n.includes("beat collection") || n.includes("orbit collection") || n.includes("nike") || n.includes("adidas");
}

function getStoredBrands(): any[] {
  try {
    const dataDir = path.join(process.cwd(), "data");
    const brandsFile = path.join(dataDir, "market_brands.json");
    if (fs.existsSync(brandsFile)) {
      const content = fs.readFileSync(brandsFile, "utf-8");
      const list = JSON.parse(content);
      if (Array.isArray(list)) {
        return list.filter((b: any) => b && b.id && b.name && !isMockBrand(b.id, b.name));
      }
    }
  } catch (e) {}
  return [];
}

function saveStoredBrand(brand: any) {
  try {
    if (isMockBrand(brand.id, brand.name)) return;
    const dataDir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    const brandsFile = path.join(dataDir, "market_brands.json");
    let list = getStoredBrands();
    const idx = list.findIndex((b: any) => b.id === brand.id);
    if (idx >= 0) list[idx] = brand;
    else list.push(brand);
    fs.writeFileSync(brandsFile, JSON.stringify(list, null, 2));
  } catch (e) {}
}

// --- Consolidated Handler ---
export default async function handler(req: any, res: any) {
  const url = req.url || '';
  const queryResource = req.query?.resource;
  const isBrands = queryResource === 'brands' || (url.includes('brand') && !url.includes('product'));

  // 1. BRANDS ENDPOINT
  if (isBrands) {
    if (req.method === "GET") {
      const brandMap = new Map<string, any>();

      // Fetch from Supabase database if available
      try {
        const supabase = getSupabaseServerClient();
        const { data: dbBrands, error } = await supabase
          .from("market_brands")
          .select("*")
          .order("created_at", { ascending: true });

        if (!error && Array.isArray(dbBrands) && dbBrands.length > 0) {
          dbBrands.forEach((b: any) => {
            if (b && b.id && b.name && !isMockBrand(b.id, b.name)) {
              brandMap.set(b.id, {
                id: b.id,
                userId: b.user_id,
                name: b.name,
                slug: b.slug,
                description: b.description || "",
                location: b.location || "",
                contactEmail: b.contact_email || "",
                contactPhone: b.contact_phone || "",
                isVerified: b.is_verified ?? false,
                isOrbitCollection: false,
                createdAt: b.created_at
              });
            }
          });
        }
      } catch (err) {
        console.warn("[Vercel /api/market/brands GET notice]:", err);
      }

      // Merge local server storage (real registered brands only)
      const stored = getStoredBrands();
      stored.forEach(b => {
        if (b && b.id && b.name && !isMockBrand(b.id, b.name)) {
          brandMap.set(b.id, { ...b });
        }
      });

      return res.status(200).json({
        success: true,
        brands: Array.from(brandMap.values())
      });
    }

    if (req.method === "POST") {
      try {
        const brand = req.body;
        if (!brand || !brand.id || !brand.name) {
          return res.status(400).json({ error: "Brand id and name are required." });
        }

        // Save to server storage
        saveStoredBrand(brand);

        // Try saving to Supabase
        try {
          const supabase = getSupabaseServerClient();
          await supabase
            .from("market_brands")
            .upsert({
              id: brand.id,
              user_id: brand.userId || null,
              name: brand.name.trim(),
              slug: brand.slug || brand.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
              description: brand.description || "",
              location: brand.location || "",
              contact_email: brand.contactEmail || "",
              contactPhone: brand.contactPhone || "",
              is_verified: brand.isVerified ?? false,
              is_orbit_collection: brand.isOrbitCollection ?? (brand.name.toLowerCase().includes("orbit")),
              created_at: brand.createdAt || new Date().toISOString()
            });
        } catch (dbErr) {
          console.warn("[Vercel /api/market/brands POST DB fallback]:", dbErr);
        }

        return res.status(200).json({ success: true, brand });
      } catch (error: any) {
        return res.status(500).json({ error: error.message || "Failed to persist brand" });
      }
    }

    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  // 2. PRODUCTS ENDPOINT (Default)
  if (req.method === "GET") {
    const prodMap = new Map<string, any>();

    // Fetch from Supabase database if available
    try {
      const supabase = getSupabaseServerClient();
      const { data: dbProds, error } = await supabase
        .from("market_products")
        .select("*")
        .order("created_at", { ascending: true });

      if (!error && Array.isArray(dbProds) && dbProds.length > 0) {
        const { data: variants } = await supabase.from("market_product_variants").select("*");
        dbProds.forEach((p: any) => {
          if (p && p.id && p.name && !isMockProduct(p.id, p.name, p.brand_name)) {
            const pVariants = (variants || [])
              .filter((v: any) => v.product_id === p.id)
              .map((v: any) => ({
                id: v.id,
                productId: v.product_id,
                sizeName: v.size_name,
                stockQuantity: Number(v.stock_quantity || 0),
                priceOverride: v.price_override ? Number(v.price_override) : undefined
              }));

            let imgList: string[] = [];
            if (Array.isArray(p.images) && p.images.length > 0) imgList = p.images;
            else if (p.image_url) imgList = [p.image_url];

            prodMap.set(p.id, {
              id: p.id,
              brandId: p.brand_id,
              brandName: p.brand_name || "",
              name: p.name,
              description: p.description || "",
              price: Number(p.price || 0),
              category: p.category || p.brand_name || "Marketplace",
              imageUrl: p.image_url || imgList[0] || "",
              images: imgList,
              isPublished: p.is_published ?? true,
              inStock: p.in_stock ?? true,
              stockQuantity: Number(p.stock_quantity || 0),
              variants: pVariants.length > 0 ? pVariants : (prodMap.get(p.id)?.variants || []),
              createdAt: p.created_at
            });
          }
        });
      }
    } catch (err) {
      console.warn("[Vercel /api/market/products GET notice]:", err);
    }

    // Merge local server storage (real registered products only)
    const stored = getStoredProducts();
    stored.forEach(p => {
      if (p && p.id && p.name && !isMockProduct(p.id, p.name, p.brandName || p.brand_name)) {
        prodMap.set(p.id, { ...p });
      }
    });

    return res.status(200).json({
      success: true,
      products: Array.from(prodMap.values())
    });
  }

  if (req.method === "POST") {
    try {
      const product = req.body;
      if (!product || !product.id || !product.name) {
        return res.status(400).json({ error: "Product id and name are required." });
      }

      // Save to server storage
      saveStoredProduct(product);

      // Try saving to Supabase
      try {
        const supabase = getSupabaseServerClient();
        const mainImg = product.imageUrl || (product.images && product.images.length > 0 ? product.images[0] : null);
        await supabase
          .from("market_products")
          .upsert({
            id: product.id,
            brand_id: product.brandId,
            brand_name: product.brandName,
            name: product.name,
            description: product.description,
            price: product.price,
            category: product.category,
            image_url: mainImg,
            images: product.images || (mainImg ? [mainImg] : []),
            is_published: product.isPublished ?? true,
            in_stock: product.inStock,
            stock_quantity: product.stockQuantity,
            created_at: product.createdAt || new Date().toISOString()
          });

        if (product.variants && product.variants.length > 0) {
          for (const v of product.variants) {
            await supabase
              .from("market_product_variants")
              .upsert({
                id: v.id,
                product_id: product.id,
                size_name: v.sizeName,
                stock_quantity: v.stockQuantity,
                price_override: v.priceOverride || null
              });
          }
        }
      } catch (dbErr) {
        console.warn("[Vercel /api/market/products POST DB fallback]:", dbErr);
      }

      return res.status(200).json({ success: true, product });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || "Failed to persist product" });
    }
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ error: `Method ${req.method} not allowed` });
}
