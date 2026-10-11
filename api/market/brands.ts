import { createClient } from "@supabase/supabase-js";
import { DEFAULT_MARKET_BRANDS } from "../../src/services/marketCatalog";
import fs from "fs";
import path from "path";

function getSupabaseServerClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://ptpnvrgzdnawvvxrkkid.supabase.co";
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0cG52cmd6ZG5hd3Z2eHJra2lkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3Mzg3ODcsImV4cCI6MjA5ODMxNDc4N30.MUUTitnP27N5Alvyq3W_ntVc8P0NhjhaVWllfU9u_IM";
  return createClient(supabaseUrl, supabaseKey);
}

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

export default async function handler(req: any, res: any) {
  if (req.method === "GET") {
    const brandMap = new Map<string, any>();

    // 1. Fetch from Supabase database if available
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

    // 2. Merge local server storage (real registered brands only)
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
            contact_phone: brand.contactPhone || "",
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
