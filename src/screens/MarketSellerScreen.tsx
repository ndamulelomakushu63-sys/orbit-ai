import React, { useState, useRef } from 'react';
import { 
  ArrowLeft, 
  Store, 
  Plus, 
  Package, 
  CheckCircle2, 
  AlertCircle, 
  Tag, 
  Truck,
  RefreshCw,
  UploadCloud,
  Image as ImageIcon,
  Trash2,
  Eye,
  EyeOff
} from '../components/Icons';
import { useMarket } from '../services/marketState';
import { useAppState } from '../services/state';
import { MarketBrand, MarketProduct, MarketProductVariant, MarketOrderStatus } from '../types';
import { dbUploadMarketProductImage, dbCheckBrandNameExists, generateBrandSlug } from '../services/supabase';

interface MarketSellerScreenProps {
  onBack: () => void;
}

export const MarketSellerScreen: React.FC<MarketSellerScreenProps> = ({
  onBack
}) => {
  const { currentUser } = useAppState();
  const { 
    brands, 
    products, 
    orders, 
    createBrand, 
    createProduct, 
    updateOrderStatus,
    settings,
    refreshMarketData 
  } = useMarket();

  // Active view tab: 'orders' | 'products' | 'new-product' | 'brand-profile'
  const [activeTab, setActiveTab] = useState<'orders' | 'products' | 'new-product' | 'brand-profile'>('products');

  // Check if current user is an authorized official Orbit administrator
  const isOfficialAdmin = Boolean(
    currentUser?.email && (
      currentUser.email.trim().toLowerCase() === 'ndamulelo@orbitai.co.za' ||
      currentUser.email.trim().toLowerCase() === 'admin@orbitai.co.za' ||
      currentUser.email.trim().toLowerCase() === 'ndamulelomakushu63@gmail.com' ||
      currentUser.email.trim().toLowerCase().endsWith('@orbitai.co.za')
    )
  );

  // Check if current user has an existing registered brand
  const userOwnedBrand = brands.find(b => b.userId === currentUser?.uid && !b.isOrbitCollection);
  const userBrand = userOwnedBrand || (isOfficialAdmin ? brands.find(b => b.isOrbitCollection) : undefined) || userOwnedBrand;

  // Brand Creation / Edit State (Tab 4)
  const [brandName, setBrandName] = useState<string>(userOwnedBrand?.name || '');
  const [brandDesc, setBrandDesc] = useState<string>(userOwnedBrand?.description || '');
  const [brandLocation, setBrandLocation] = useState<string>(userOwnedBrand?.location || 'Johannesburg, South Africa');
  const [brandContact, setBrandContact] = useState<string>(userOwnedBrand?.contactPhone || '');
  const [brandSavedToast, setBrandSavedToast] = useState<string | null>(null);
  const [brandProfileError, setBrandProfileError] = useState<string | null>(null);

  // New Product State (Tab 2)
  // Editable Brand / Storefront name - DO NOT force Orbit Collection for every seller
  const [prodBrandName, setProdBrandName] = useState<string>(
    userOwnedBrand?.name || (isOfficialAdmin ? 'Orbit Collection' : '')
  );
  const [brandError, setBrandError] = useState<string | null>(null);
  const [prodName, setProdName] = useState<string>('');
  const [prodDesc, setProdDesc] = useState<string>('');
  const [prodPrice, setProdPrice] = useState<string>('');
  const [prodCategory, setProdCategory] = useState<string>(
    userOwnedBrand?.name || (isOfficialAdmin ? 'Orbit Collection' : '')
  );
  const [prodHasSizes, setProdHasSizes] = useState<boolean>(true);
  const [stockS, setStockS] = useState<number>(10);
  const [stockM, setStockM] = useState<number>(15);
  const [stockL, setStockL] = useState<number>(10);
  const [stockXL, setStockXL] = useState<number>(5);
  const [singleStock, setSingleStock] = useState<number>(20);
  const [isPublished, setIsPublished] = useState<boolean>(true);

  // Product Images State
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isSubmittingProd, setIsSubmittingProd] = useState<boolean>(false);
  const [prodSuccessToast, setProdSuccessToast] = useState<string | null>(null);

  // Find incoming orders for this brand
  const sellerOrders = orders.filter(o => 
    o.items.some(it => it.brandId === userBrand?.id || it.brandName === userBrand?.name)
  );

  // Handle Image File Upload (Supabase storage with base64 persistence fallback)
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setImageError(null);
    setIsUploadingImage(true);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) {
          setImageError("Please upload valid image files (JPG, PNG, WebP).");
          continue;
        }

        const uploadedUrl = await dbUploadMarketProductImage(file, userBrand?.id || 'orbit');
        if (uploadedUrl) {
          setUploadedImages(prev => [...prev, uploadedUrl]);
        }
      }
    } catch (err: any) {
      console.error("Image upload failed:", err);
      setImageError("Failed to upload image. Please try again.");
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeUploadedImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  // Handle Brand blur uniqueness check
  const handleBrandBlur = async () => {
    const trimmed = prodBrandName.trim();
    if (!trimmed) {
      setBrandError(null);
      return;
    }

    const normalized = trimmed.toLowerCase();
    if (normalized === 'orbit collection') {
      if (!isOfficialAdmin) {
        setBrandError("Sorry, that brand/storefront name already exists. Please choose another name.");
        return;
      }
    }

    const check = await dbCheckBrandNameExists(trimmed, userOwnedBrand?.id);
    if (check.exists) {
      setBrandError("Sorry, that brand/storefront name already exists. Please choose another name.");
    } else {
      setBrandError(null);
    }
  };

  const handleCreateBrand = async () => {
    const trimmed = brandName.trim();
    if (!trimmed) return;
    setBrandProfileError(null);

    const normalized = trimmed.toLowerCase();
    if (normalized === 'orbit collection') {
      if (!isOfficialAdmin) {
        setBrandProfileError("Sorry, that brand/storefront name already exists. Please choose another name.");
        return;
      }
    }

    const check = await dbCheckBrandNameExists(trimmed, userOwnedBrand?.id);
    if (check.exists) {
      setBrandProfileError("Sorry, that brand/storefront name already exists. Please choose another name.");
      return;
    }

    const newBrand: MarketBrand = {
      id: userOwnedBrand && userOwnedBrand.name !== 'Orbit Collection' ? userOwnedBrand.id : `brand-${Date.now()}`,
      userId: currentUser?.uid,
      name: trimmed,
      slug: generateBrandSlug(trimmed),
      description: brandDesc.trim(),
      location: brandLocation.trim() || 'South Africa',
      contactEmail: currentUser?.email || '',
      contactPhone: brandContact.trim(),
      isVerified: true,
      isOrbitCollection: false,
      status: 'Active',
      createdAt: userOwnedBrand?.createdAt || new Date().toISOString()
    };

    const res = await createBrand(newBrand);
    if (typeof res === 'object' && !res.success) {
      setBrandProfileError(res.error || "Sorry, that brand/storefront name already exists. Please choose another name.");
      return;
    }

    setProdBrandName(trimmed);
    setBrandSavedToast("Brand storefront successfully registered!");
    setTimeout(() => setBrandSavedToast(null), 3000);
    setActiveTab('products');
  };

  const handleCreateProduct = async () => {
    const cleanBrand = prodBrandName.trim();
    if (!cleanBrand) {
      setBrandError("Brand / storefront name is required.");
      return;
    }

    setIsSubmittingProd(true);
    setBrandError(null);

    const normalized = cleanBrand.toLowerCase();
    // 1. Reserved brand check: official Orbit Collection
    if (normalized === 'orbit collection') {
      if (!isOfficialAdmin) {
        setBrandError("Sorry, that brand/storefront name already exists. Please choose another name.");
        setIsSubmittingProd(false);
        return;
      }
    }

    // 2. Uniqueness check against existing Supabase database data
    const check = await dbCheckBrandNameExists(cleanBrand, userOwnedBrand?.id);
    if (check.exists) {
      setBrandError("Sorry, that brand/storefront name already exists. Please choose another name.");
      setIsSubmittingProd(false);
      return;
    }

    if (!prodName.trim() || !prodPrice.trim()) {
      setIsSubmittingProd(false);
      return;
    }

    // Determine target brand id & registration
    let targetBrandId = '';
    let targetBrandName = cleanBrand;

    if (normalized === 'orbit collection' && isOfficialAdmin) {
      const orbBrand = brands.find(b => b.isOrbitCollection) || brands[0];
      targetBrandId = orbBrand?.id || 'brand-orbit';
      targetBrandName = 'Orbit Collection';
    } else if (userOwnedBrand && userOwnedBrand.name.trim().toLowerCase() === normalized) {
      targetBrandId = userOwnedBrand.id;
      targetBrandName = userOwnedBrand.name;
    } else {
      // Register new unique brand in the database
      const newBrandId = userOwnedBrand?.id || `brand-${Date.now()}`;
      const newBrand: MarketBrand = {
        id: newBrandId,
        userId: currentUser?.uid,
        name: cleanBrand,
        slug: generateBrandSlug(cleanBrand),
        description: brandDesc.trim() || `Official storefront for ${cleanBrand}`,
        location: brandLocation.trim() || 'South Africa',
        contactEmail: currentUser?.email || '',
        contactPhone: brandContact.trim(),
        isVerified: true,
        isOrbitCollection: false,
        status: 'Active',
        createdAt: userOwnedBrand?.createdAt || new Date().toISOString()
      };

      const brandRes = await createBrand(newBrand);
      if (typeof brandRes === 'object' && !brandRes.success) {
        setBrandError(brandRes.error || "Sorry, that brand/storefront name already exists. Please choose another name.");
        setIsSubmittingProd(false);
        return;
      }
      targetBrandId = newBrandId;
      targetBrandName = cleanBrand;
    }

    const priceNum = parseFloat(prodPrice) || 0;
    const prodId = `prod-${Date.now()}`;

    let variants: MarketProductVariant[] = [];
    let totalStock = singleStock;

    if (prodHasSizes) {
      variants = [
        { id: `var-${prodId}-s`, productId: prodId, sizeName: 'S', stockQuantity: stockS },
        { id: `var-${prodId}-m`, productId: prodId, sizeName: 'M', stockQuantity: stockM },
        { id: `var-${prodId}-l`, productId: prodId, sizeName: 'L', stockQuantity: stockL },
        { id: `var-${prodId}-xl`, productId: prodId, sizeName: 'XL', stockQuantity: stockXL }
      ];
      totalStock = stockS + stockM + stockL + stockXL;
    }

    const mainImageUrl = uploadedImages.length > 0 ? uploadedImages[0] : '';

    const newProd: MarketProduct = {
      id: prodId,
      brandId: targetBrandId,
      brandName: targetBrandName,
      name: prodName.trim(),
      description: prodDesc.trim(),
      price: priceNum,
      category: prodCategory.trim() || targetBrandName,
      imageUrl: mainImageUrl,
      images: uploadedImages,
      isPublished: isPublished,
      inStock: totalStock > 0,
      stockQuantity: totalStock,
      variants,
      createdAt: new Date().toISOString()
    };

    const ok = await createProduct(newProd);
    setIsSubmittingProd(false);
    if (ok) {
      setProdSuccessToast(`Product "${newProd.name}" added to your storefront.`);
      setProdName('');
      setProdDesc('');
      setProdPrice('');
      setUploadedImages([]);
      setTimeout(() => {
        setProdSuccessToast(null);
        setActiveTab('products');
      }, 2000);
    }
  };

  const toggleProductPublish = async (prod: MarketProduct) => {
    const updated: MarketProduct = {
      ...prod,
      isPublished: !prod.isPublished
    };
    await createProduct(updated);
  };

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden bg-white text-slate-900 font-sans selection:bg-blue-50 selection:text-blue-900 pb-16 text-left">
      
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center space-x-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Market</span>
          </button>
          <div className="flex items-center space-x-2">
            <Store className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-black text-slate-900 uppercase tracking-wider font-sans">
              Seller Portal • {userBrand?.name || 'Local Brand'}
            </span>
          </div>
          <div className="w-16" />
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        
        {/* Navigation Tabs */}
        <div className="flex items-center space-x-2 border-b border-slate-100 pb-3 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('products')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 shrink-0 cursor-pointer ${
              activeTab === 'products'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Storefront Products</span>
          </button>

          <button
            onClick={() => setActiveTab('new-product')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 shrink-0 cursor-pointer ${
              activeTab === 'new-product'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add New Product</span>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 shrink-0 cursor-pointer ${
              activeTab === 'orders'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Incoming Orders ({sellerOrders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('brand-profile')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 shrink-0 cursor-pointer ${
              activeTab === 'brand-profile'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>Brand Profile</span>
          </button>
        </div>

        {/* TAB 1: PRODUCTS IN STOREFRONT */}
        {activeTab === 'products' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {userBrand?.name || 'Local Brand'} Catalog
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Manage inventory, update sizes, and toggle publication status.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('new-product')}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center space-x-1.5 cursor-pointer shadow-xs shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Product</span>
              </button>
            </div>

            {products.filter(p => p.brandId === userBrand?.id || p.brandName === userBrand?.name).length === 0 ? (
              <div className="py-16 text-center bg-slate-50 border border-slate-200/80 rounded-3xl p-8 space-y-3">
                <Tag className="w-8 h-8 text-slate-400 mx-auto" />
                <h4 className="text-sm font-bold text-slate-900">No products added yet</h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Click "Add New Product" to list apparel, caps, or accessories on Orbit Market.
                </p>
                <button
                  onClick={() => setActiveTab('new-product')}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                >
                  Create Your First Product
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {products
                  .filter(p => p.brandId === userBrand?.id || p.brandName === userBrand?.name)
                  .map((prod) => {
                    const displayImage = prod.imageUrl || (prod.images && prod.images.length > 0 ? prod.images[0] : null);

                    return (
                      <div
                        key={prod.id}
                        className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3 flex flex-col justify-between"
                      >
                        <div className="space-y-3">
                          {/* Image */}
                          <div className="w-full aspect-square bg-slate-100 rounded-xl overflow-hidden relative border border-slate-100">
                            {displayImage ? (
                              <img src={displayImage} alt={prod.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-300">
                                <Tag className="w-8 h-8" />
                              </div>
                            )}
                            <div className="absolute top-2 left-2">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                prod.isPublished !== false
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-slate-800 text-slate-200'
                              }`}>
                                {prod.isPublished !== false ? 'Published' : 'Hidden'}
                              </span>
                            </div>
                          </div>

                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block truncate">
                              {prod.category}
                            </span>
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug line-clamp-1">
                              {prod.name}
                            </h4>
                            <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                              {prod.description}
                            </p>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                          <div>
                            <div className="font-black text-sm text-slate-950">
                              R{prod.price.toFixed(2)}
                            </div>
                            <div className="text-[10px] text-slate-400 font-medium">
                              Stock: {prod.stockQuantity}
                            </div>
                          </div>

                          <button
                            onClick={() => toggleProductPublish(prod)}
                            className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                          >
                            {prod.isPublished !== false ? (
                              <>
                                <EyeOff className="w-3 h-3 text-slate-400" />
                                <span>Hide</span>
                              </>
                            ) : (
                              <>
                                <Eye className="w-3 h-3 text-blue-600" />
                                <span>Publish</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ADD NEW PRODUCT */}
        {activeTab === 'new-product' && (
          <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/90 shadow-2xs space-y-6">
            <div>
              <h3 className="text-base font-black text-slate-950 font-sans mb-1">
                Add Product to {userBrand?.name || 'Storefront'}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Upload product photos, set pricing in Rand, specify sizes, and publish to Orbit Market.
              </p>
            </div>

            {prodSuccessToast && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center space-x-2 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{prodSuccessToast}</span>
              </div>
            )}

            <div className="space-y-4 text-xs">
              
              {/* Product Photos Upload Section */}
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Product Photos *
                </label>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {uploadedImages.map((imgUrl, idx) => (
                    <div key={idx} className="relative aspect-square rounded-2xl bg-slate-100 overflow-hidden border border-slate-200 group">
                      <img src={imgUrl} alt={`Upload ${idx + 1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <button
                        type="button"
                        onClick={() => removeUploadedImage(idx)}
                        className="absolute top-1.5 right-1.5 p-1 bg-red-600 text-white rounded-full opacity-90 hover:opacity-100 transition-opacity cursor-pointer"
                        title="Remove Image"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      {idx === 0 && (
                        <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.2 bg-slate-900/80 text-white text-[9px] font-bold rounded">
                          Cover Photo
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Upload Box */}
                  <label className="aspect-square rounded-2xl border-2 border-dashed border-slate-200 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/30 flex flex-col items-center justify-center p-3 text-center cursor-pointer transition-colors">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageFileChange}
                      className="hidden"
                    />
                    {isUploadingImage ? (
                      <RefreshCw className="w-5 h-5 animate-spin text-blue-600 mb-1" />
                    ) : (
                      <UploadCloud className="w-6 h-6 text-slate-400 mb-1" />
                    )}
                    <span className="text-[11px] font-bold text-slate-700">
                      {isUploadingImage ? 'Uploading...' : 'Upload Photos'}
                    </span>
                    <span className="text-[9px] text-slate-400">PNG, JPG, WebP</span>
                  </label>
                </div>

                {imageError && (
                  <p className="text-red-600 text-[11px] font-medium">{imageError}</p>
                )}
              </div>

              {/* Brand Storefront Field */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Brand / Storefront *
                </label>
                <input
                  type="text"
                  value={prodBrandName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setProdBrandName(val);
                    if (brandError) setBrandError(null);
                    if (!prodCategory || prodCategory === prodBrandName) {
                      setProdCategory(val);
                    }
                  }}
                  onBlur={handleBrandBlur}
                  placeholder="Enter your brand or storefront name"
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border text-slate-900 text-xs font-medium focus:outline-hidden transition-all ${
                    brandError 
                      ? 'border-red-500 focus:border-red-600 focus:bg-white bg-red-50/20' 
                      : 'border-slate-200 focus:border-blue-600 focus:bg-white'
                  }`}
                />
                {brandError && (
                  <div className="flex items-center space-x-1.5 mt-1.5 text-red-600 text-[11px] font-medium animate-fade-in">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{brandError}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Product Title *
                </label>
                <input
                  type="text"
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  placeholder="e.g. Classic Oversized Heavyweight Tee"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium focus:border-blue-600 focus:bg-white outline-hidden transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Price (ZAR / Rand) *
                  </label>
                  <input
                    type="number"
                    value={prodPrice}
                    onChange={(e) => setProdPrice(e.target.value)}
                    placeholder="e.g. 199.00"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium focus:border-blue-600 focus:bg-white outline-hidden transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Category Name
                  </label>
                  <input
                    type="text"
                    value={prodCategory}
                    onChange={(e) => setProdCategory(e.target.value)}
                    placeholder="e.g. Orbit Collection or Brand Name"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium focus:border-blue-600 focus:bg-white outline-hidden transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={prodDesc}
                  onChange={(e) => setProdDesc(e.target.value)}
                  placeholder="Describe material, fabric GSM, fit, and styling details..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium focus:border-blue-600 focus:bg-white outline-hidden transition-all"
                />
              </div>

              {/* Size Variants Switch */}
              <div className="border-t border-slate-100 pt-3.5">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold text-slate-800 text-xs">Clothing Size Breakdown (S, M, L, XL)</span>
                  <input
                    type="checkbox"
                    checked={prodHasSizes}
                    onChange={(e) => setProdHasSizes(e.target.checked)}
                    className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                  />
                </div>

                {prodHasSizes ? (
                  <div className="grid grid-cols-4 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block mb-1">Stock (S)</label>
                      <input
                        type="number"
                        value={stockS}
                        onChange={(e) => setStockS(parseInt(e.target.value) || 0)}
                        className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 text-xs font-bold text-center"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block mb-1">Stock (M)</label>
                      <input
                        type="number"
                        value={stockM}
                        onChange={(e) => setStockM(parseInt(e.target.value) || 0)}
                        className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 text-xs font-bold text-center"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block mb-1">Stock (L)</label>
                      <input
                        type="number"
                        value={stockL}
                        onChange={(e) => setStockL(parseInt(e.target.value) || 0)}
                        className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 text-xs font-bold text-center"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block mb-1">Stock (XL)</label>
                      <input
                        type="number"
                        value={stockXL}
                        onChange={(e) => setStockXL(parseInt(e.target.value) || 0)}
                        className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 text-xs font-bold text-center"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-slate-700 font-bold mb-1 text-[11px]">Total Stock Quantity</label>
                    <input
                      type="number"
                      value={singleStock}
                      onChange={(e) => setSingleStock(parseInt(e.target.value) || 0)}
                      className="w-48 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-medium"
                    />
                  </div>
                )}
              </div>

              {/* Publish Toggle */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-3.5">
                <div>
                  <span className="font-bold text-slate-800 text-xs block">Publish immediately</span>
                  <span className="text-[11px] text-slate-500">Make this product visible in the public marketplace immediately upon saving.</span>
                </div>
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                />
              </div>

              <div className="pt-3">
                <button
                  disabled={isSubmittingProd || !prodName.trim() || !prodPrice.trim()}
                  onClick={handleCreateProduct}
                  className="w-full py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold text-xs sm:text-sm disabled:opacity-40 transition-all flex items-center justify-center space-x-2 shadow-xs cursor-pointer"
                >
                  {isSubmittingProd ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Publishing to Marketplace...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Publish Product to Storefront</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: INCOMING ORDERS */}
        {activeTab === 'orders' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Seller Fulfillment Pipeline
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Pack items safely and update status. Orbit couriers will arrive to collect and deliver.
                </p>
              </div>
              <div className="text-xs bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 font-medium">
                Platform Commission: <strong className="text-slate-900 font-bold">{((settings.commissionRate || 0.10) * 100).toFixed(0)}%</strong>
              </div>
            </div>

            {sellerOrders.length === 0 ? (
              <div className="py-16 text-center bg-slate-50 border border-slate-200/80 rounded-3xl p-8 space-y-3">
                <Package className="w-8 h-8 text-slate-400 mx-auto" />
                <h4 className="text-sm font-bold text-slate-900">No incoming orders yet</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Orders placed for {userBrand?.name} products will appear here for packaging and dispatch.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {sellerOrders.map((order) => {
                  const brandItems = order.items.filter(it => it.brandId === userBrand?.id || it.brandName === userBrand?.name);
                  const sellerSubtotal = brandItems.reduce((t, it) => t + it.totalPrice, 0);
                  const sellerPayout = sellerSubtotal * (1 - (settings.commissionRate || 0.10));

                  return (
                    <div 
                      key={order.id}
                      className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-2xs space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div>
                          <span className="font-extrabold text-sm text-slate-900 font-mono">
                            {order.orderNumber}
                          </span>
                          <span className="text-slate-400 text-xs ml-2">
                            {new Date(order.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
                            {order.orderStatus}
                          </span>
                        </div>
                      </div>

                      {/* Items */}
                      <div className="space-y-1.5 text-xs">
                        {brandItems.map((item, idx) => (
                          <div key={idx} className="flex justify-between py-1 border-b border-slate-50">
                            <span className="font-bold text-slate-900">
                              {item.productName} {item.variantName ? `(Size: ${item.variantName})` : ''} × {item.quantity}
                            </span>
                            <span className="font-bold text-slate-900">
                              R{item.totalPrice.toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Financial breakdown */}
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-wrap items-center justify-between text-xs gap-2">
                        <div>
                          <span className="text-slate-500">Gross Sales: </span>
                          <span className="font-bold text-slate-900">R{sellerSubtotal.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Platform Fee (10%): </span>
                          <span className="text-slate-600 font-medium">R{(sellerSubtotal * 0.10).toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Your Payout: </span>
                          <span className="font-black text-emerald-600 text-sm">R{sellerPayout.toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {order.orderStatus === 'PAID' && (
                          <button
                            onClick={() => updateOrderStatus(order.id, 'PREPARING')}
                            className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer"
                          >
                            Mark as Preparing
                          </button>
                        )}
                        {(order.orderStatus === 'PAID' || order.orderStatus === 'PREPARING') && (
                          <button
                            onClick={() => updateOrderStatus(order.id, 'READY FOR COLLECTION')}
                            className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all cursor-pointer"
                          >
                            Ready for Orbit Courier Collection
                          </button>
                        )}
                        {order.orderStatus === 'READY FOR COLLECTION' && (
                          <span className="text-xs text-blue-700 font-bold bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-200">
                            Awaiting Courier Pickup
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: BRAND SETTINGS */}
        {activeTab === 'brand-profile' && (
          <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/90 shadow-2xs space-y-6">
            <div>
              <h3 className="text-base font-black text-slate-950 font-sans mb-1">
                Storefront Profile Settings
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Configure your public brand identity and dispatch pickup address.
              </p>
            </div>

            {brandSavedToast && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center space-x-2 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{brandSavedToast}</span>
              </div>
            )}

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Brand Name *
                </label>
                <input
                  type="text"
                  value={brandName}
                  onChange={(e) => {
                    setBrandName(e.target.value);
                    if (brandProfileError) setBrandProfileError(null);
                  }}
                  placeholder="Enter your brand or storefront name"
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border text-slate-900 text-xs font-medium focus:outline-hidden transition-all ${
                    brandProfileError 
                      ? 'border-red-500 focus:border-red-600 focus:bg-white bg-red-50/20' 
                      : 'border-slate-200 focus:border-blue-600 focus:bg-white'
                  }`}
                />
                {brandProfileError && (
                  <div className="flex items-center space-x-1.5 mt-1.5 text-red-600 text-[11px] font-medium animate-fade-in">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{brandProfileError}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Brand Tagline / Story
                </label>
                <textarea
                  rows={2}
                  value={brandDesc}
                  onChange={(e) => setBrandDesc(e.target.value)}
                  placeholder="Tell customers about your story, materials, and origins..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium focus:border-blue-600 focus:bg-white outline-hidden transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    City / Dispatch Location
                  </label>
                  <input
                    type="text"
                    value={brandLocation}
                    onChange={(e) => setBrandLocation(e.target.value)}
                    placeholder="Johannesburg, ZA"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium focus:border-blue-600 focus:bg-white outline-hidden transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Courier Dispatch Contact Phone
                  </label>
                  <input
                    type="tel"
                    value={brandContact}
                    onChange={(e) => setBrandContact(e.target.value)}
                    placeholder="082 123 4567"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium focus:border-blue-600 focus:bg-white outline-hidden transition-all"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleCreateBrand}
                  className="w-full py-3.5 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm transition-all shadow-xs cursor-pointer"
                >
                  Save Storefront Profile
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};
