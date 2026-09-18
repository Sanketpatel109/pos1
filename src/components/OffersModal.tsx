import React, { useState } from 'react';
import {
  Tag,
  Plus,
  Trash2,
  Gift,
  Layers,
  Sparkles,
  RotateCcw,
  ShoppingBag,
  Percent,
  Check,
  X,
} from 'lucide-react';
import { PromotionOffer, OfferType, CatalogItem, Category } from '../types';
import { useCart } from '../context/CartContext';
import { DEFAULT_PROMOTION_OFFERS } from '../utils/promotionsEngine';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';

export interface OffersModalProps {
  isOpen: boolean;
  onClose: () => void;
  currencySymbol?: string;
  catalog?: CatalogItem[];
  categories?: Category[];
}

interface ComboRowItem {
  productId?: string;
  productName: string;
  quantity: number;
  price?: number;
}

export const OffersModal: React.FC<OffersModalProps> = ({
  isOpen,
  onClose,
  currencySymbol = '₹',
  catalog = [],
  categories = [],
}) => {
  const { offers, setOffers, appliedPromotions, promotionsDiscount } = useCart();
  const [isCreating, setIsCreating] = useState(false);

  // Form state
  const [newType, setNewType] = useState<OfferType>('COMBO');
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  // 1. Combo specific
  const [comboRows, setComboRows] = useState<ComboRowItem[]>([
    {
      productId: catalog[0]?.id || '',
      productName: catalog[0]?.name || 'French Fries',
      quantity: 1,
      price: catalog[0]?.price || 50,
    },
    {
      productId: catalog[1]?.id || '',
      productName: catalog[1]?.name || 'Cold Coffee',
      quantity: 1,
      price: catalog[1]?.price || 45,
    },
  ]);
  const [bundlePrice, setBundlePrice] = useState('80.00');

  // 2. BOGO specific
  const [targetProduct, setTargetProduct] = useState(catalog[0]?.name || 'Samosa');
  const [targetProductId, setTargetProductId] = useState(catalog[0]?.id || '');
  const [buyQty, setBuyQty] = useState('2');
  const [getQty, setGetQty] = useState('1');
  const [discountPercent, setDiscountPercent] = useState('100');

  // 3. Min Spend specific
  const [minSpendAmount, setMinSpendAmount] = useState('500');
  const [minSpendDiscountType, setMinSpendDiscountType] = useState<'flat' | 'percentage'>('flat');
  const [minSpendDiscountVal, setMinSpendDiscountVal] = useState('50');

  // 4. Category specific
  const [targetCategory, setTargetCategory] = useState(
    categories.find((c) => c.name !== 'ALL' && c.name !== 'All Items')?.name || 'Fast Food'
  );
  const [categoryDiscountPercent, setCategoryDiscountPercent] = useState('10');

  if (!isOpen) return null;

  const activeOffersCount = offers.filter((o) => o.enabled).length;

  // Helpers for Combo price computation
  const comboRegularTotal = comboRows.reduce(
    (sum, r) => sum + (r.price || 0) * (r.quantity || 1),
    0
  );
  const comboBundleVal = parseFloat(bundlePrice) || 0;
  const comboSavings = Math.max(0, comboRegularTotal - comboBundleVal);

  const handleToggleOffer = (id: string) => {
    setOffers((prev) =>
      prev.map((o) => (o.id === id ? { ...o, enabled: !o.enabled } : o))
    );
  };

  const handleDeleteOffer = (id: string) => {
    setOffers((prev) => prev.filter((o) => o.id !== id));
  };

  const handleResetDefaults = () => {
    setOffers(DEFAULT_PROMOTION_OFFERS);
  };

  // Combo Row Handlers
  const handleAddComboRow = () => {
    const defaultItem = catalog[0];
    setComboRows((prev) => [
      ...prev,
      {
        productId: defaultItem?.id || '',
        productName: defaultItem?.name || '',
        quantity: 1,
        price: defaultItem?.price || 0,
      },
    ]);
  };

  const handleUpdateComboRow = (index: number, field: keyof ComboRowItem, value: any) => {
    setComboRows((prev) => {
      const next = [...prev];
      if (field === 'productId') {
        const item = catalog.find((c) => c.id === value);
        if (item) {
          next[index] = {
            ...next[index],
            productId: item.id,
            productName: item.name,
            price: item.price,
          };
          return next;
        }
      }
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleRemoveComboRow = (index: number) => {
    setComboRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSelectBogoProduct = (productId: string) => {
    const item = catalog.find((c) => c.id === productId);
    if (item) {
      setTargetProductId(item.id);
      setTargetProduct(item.name);
      if (!newName || newName.startsWith('Buy ')) {
        setNewName(`Buy ${buyQty} ${item.name}, Get ${getQty} Free`);
      }
    }
  };

  const handleCreateOffer = (e: React.FormEvent) => {
    e.preventDefault();
    const title = newName.trim();
    if (!title) return;

    if (newType === 'COMBO') {
      const validItems = comboRows.filter((r) => r.productName.trim() && r.quantity > 0);
      if (validItems.length < 2) return;

      const newOffer: PromotionOffer = {
        id: `offer-combo-${Date.now()}`,
        name: title,
        type: 'COMBO',
        enabled: true,
        description:
          newDesc.trim() ||
          `${validItems.map((i) => `${i.quantity}x ${i.productName}`).join(' + ')} for ${currencySymbol}${comboBundleVal.toFixed(2)}`,
        createdAt: new Date().toISOString(),
        comboItems: validItems,
        bundlePrice: comboBundleVal,
      };

      setOffers((prev) => [newOffer, ...prev]);
    } else if (newType === 'BOGO') {
      if (!targetProduct.trim()) return;

      const buyCount = parseInt(buyQty, 10) || 1;
      const getCount = parseInt(getQty, 10) || 1;
      const discPct = parseFloat(discountPercent) || 100;

      const newOffer: PromotionOffer = {
        id: `offer-bogo-${Date.now()}`,
        name: title,
        type: 'BOGO',
        enabled: true,
        description:
          newDesc.trim() ||
          `Buy ${buyCount} ${targetProduct}, get ${getCount} at ${discPct === 100 ? 'FREE' : `${discPct}% off`}`,
        createdAt: new Date().toISOString(),
        targetProductId: targetProductId || undefined,
        targetProductName: targetProduct.trim(),
        buyQuantity: buyCount,
        getQuantity: getCount,
        discountPercent: discPct,
      };

      setOffers((prev) => [newOffer, ...prev]);
    } else if (newType === 'MIN_SPEND') {
      const minSpend = parseFloat(minSpendAmount) || 0;
      const discVal = parseFloat(minSpendDiscountVal) || 0;
      if (minSpend <= 0 || discVal <= 0) return;

      const newOffer: PromotionOffer = {
        id: `offer-min-spend-${Date.now()}`,
        name: title,
        type: 'MIN_SPEND',
        enabled: true,
        description:
          newDesc.trim() ||
          `Spend ${currencySymbol}${minSpend} or more to get ${minSpendDiscountType === 'percentage' ? `${discVal}% OFF` : `${currencySymbol}${discVal} OFF`}`,
        createdAt: new Date().toISOString(),
        minSpendAmount: minSpend,
        discountType: minSpendDiscountType,
        discountValue: discVal,
      };

      setOffers((prev) => [newOffer, ...prev]);
    } else if (newType === 'CATEGORY') {
      const pct = parseFloat(categoryDiscountPercent) || 0;
      if (!targetCategory || pct <= 0) return;

      const newOffer: PromotionOffer = {
        id: `offer-category-${Date.now()}`,
        name: title,
        type: 'CATEGORY',
        enabled: true,
        description: newDesc.trim() || `${pct}% OFF on all ${targetCategory} products`,
        createdAt: new Date().toISOString(),
        targetCategory: targetCategory,
        categoryDiscountPercent: pct,
      };

      setOffers((prev) => [newOffer, ...prev]);
    }

    // Reset & close creation form
    setNewName('');
    setNewDesc('');
    setIsCreating(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Modal Header */}
        <DialogHeader className="p-6 pb-4 border-b border-border shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DialogTitle className="text-base font-semibold flex items-center gap-2">
                <Tag className="w-4 h-4 text-primary" />
                <span>Store Offers & Promotions</span>
              </DialogTitle>
              <Badge variant={activeOffersCount > 0 ? 'default' : 'secondary'}>
                {activeOffersCount} Active {activeOffersCount === 1 ? 'Deal' : 'Deals'}
              </Badge>
            </div>
            {!isCreating && (
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  setIsCreating(true);
                  if (catalog.length > 0) {
                    setTargetProduct(catalog[0].name);
                    setTargetProductId(catalog[0].id);
                  }
                }}
                className="gap-1.5 text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Offer</span>
              </Button>
            )}
          </div>
          <DialogDescription className="text-xs">
            Create combo bundles, Buy 1 Get 1 (BOGO) rules, and cart spend discounts that apply
            automatically in the register.
          </DialogDescription>
        </DialogHeader>

        {/* Live Cart Savings Indicator */}
        {promotionsDiscount > 0 && (
          <div className="px-6 py-2.5 bg-muted/50 border-b border-border flex items-center justify-between gap-2 shrink-0 text-xs">
            <div className="flex items-center gap-2 text-foreground font-medium min-w-0">
              <Sparkles className="w-4 h-4 text-primary shrink-0" />
              <span className="truncate">
                Active register cart currently qualifies for{' '}
                <strong>
                  {appliedPromotions.length} automatic offer{appliedPromotions.length > 1 ? 's' : ''}
                </strong>{' '}
                (Customer saves {currencySymbol}{promotionsDiscount.toFixed(2)})
              </span>
            </div>
            <Badge variant="default" className="text-xs shrink-0">
              Saved {currencySymbol}{promotionsDiscount.toFixed(2)}
            </Badge>
          </div>
        )}

        {/* Modal Body Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {isCreating ? (
            /* CREATE OFFER FORM */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold">New Promotion Offer</h3>
                  <p className="text-xs text-muted-foreground">
                    Choose a deal format, pick qualifying products from your catalog, and set discount rules.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCreating(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
              </div>

              <Separator />

              <form onSubmit={handleCreateOffer} className="space-y-4">
                {/* 1. Select Offer Type */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Offer Type</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <Button
                      type="button"
                      variant={newType === 'COMBO' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setNewType('COMBO');
                        setNewName('Snack & Drink Combo');
                        setNewDesc('Combo meal bundle discount');
                      }}
                      className="text-xs h-auto py-2 flex flex-col items-center gap-1"
                    >
                      <Layers className="w-4 h-4" />
                      <span>Combo Bundle</span>
                    </Button>
                    <Button
                      type="button"
                      variant={newType === 'BOGO' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setNewType('BOGO');
                        setNewName(
                          targetProduct ? `Buy 1 Get 1 Free on ${targetProduct}` : 'Buy 1 Get 1 Free'
                        );
                        setNewDesc('Buy qualifying items, get free or discounted units');
                      }}
                      className="text-xs h-auto py-2 flex flex-col items-center gap-1"
                    >
                      <Gift className="w-4 h-4" />
                      <span>Buy X Get Y</span>
                    </Button>
                    <Button
                      type="button"
                      variant={newType === 'MIN_SPEND' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setNewType('MIN_SPEND');
                        setNewName(`Spend ${currencySymbol}500, Get ${currencySymbol}50 OFF`);
                        setNewDesc('Minimum cart total order discount');
                      }}
                      className="text-xs h-auto py-2 flex flex-col items-center gap-1"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      <span>Order Spend</span>
                    </Button>
                    <Button
                      type="button"
                      variant={newType === 'CATEGORY' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setNewType('CATEGORY');
                        setNewName(`10% OFF on ${targetCategory}`);
                        setNewDesc(`Category percentage discount`);
                      }}
                      className="text-xs h-auto py-2 flex flex-col items-center gap-1"
                    >
                      <Percent className="w-4 h-4" />
                      <span>Category %</span>
                    </Button>
                  </div>
                </div>

                {/* 2. Offer Title & Description */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="input-offer-name" className="text-xs font-semibold">
                      Offer Title <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="input-offer-name"
                      placeholder="e.g. Burger + Fries + Drink Combo"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="input-offer-desc" className="text-xs font-semibold">
                      Receipt Note / Description
                    </Label>
                    <Input
                      id="input-offer-desc"
                      placeholder="e.g. Save ₹20 with combo meal"
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                    />
                  </div>
                </div>

                {/* 3. TYPE-SPECIFIC CONFIGURATION */}
                {newType === 'COMBO' && (
                  <div className="space-y-3 rounded-md border border-border p-4 bg-muted/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-semibold">Combo Bundle Items</h4>
                        <p className="text-[11px] text-muted-foreground">
                          Select the products required. When all are present in cart, the bundle price applies.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddComboRow}
                        className="text-xs h-7"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" /> Add Item
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {comboRows.map((row, idx) => (
                        <div
                          key={idx}
                          className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-background p-2.5 rounded-md border border-border"
                        >
                          <div className="sm:col-span-6">
                            <Label className="text-[10px] text-muted-foreground">Product</Label>
                            {catalog.length > 0 ? (
                              <Select
                                value={row.productId || ''}
                                onValueChange={(val) => handleUpdateComboRow(idx, 'productId', val)}
                              >
                                <SelectTrigger className="w-full h-8 text-xs">
                                  <SelectValue placeholder="Select product" />
                                </SelectTrigger>
                                <SelectContent>
                                  {catalog.map((catItem) => (
                                    <SelectItem key={catItem.id} value={catItem.id}>
                                      {catItem.name} ({currencySymbol}{catItem.price.toFixed(2)})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Input
                                placeholder="Product name"
                                value={row.productName}
                                onChange={(e) =>
                                  handleUpdateComboRow(idx, 'productName', e.target.value)
                                }
                                className="h-8 text-xs"
                                required
                              />
                            )}
                          </div>

                          <div className="sm:col-span-2">
                            <Label className="text-[10px] text-muted-foreground">Qty</Label>
                            <Input
                              type="number"
                              min="1"
                              value={row.quantity}
                              onChange={(e) =>
                                handleUpdateComboRow(
                                  idx,
                                  'quantity',
                                  parseInt(e.target.value, 10) || 1
                                )
                              }
                              className="h-8 text-xs tabular-nums"
                              required
                            />
                          </div>

                          <div className="sm:col-span-3">
                            <Label className="text-[10px] text-muted-foreground">
                              Unit Price ({currencySymbol})
                            </Label>
                            <Input
                              type="number"
                              min="0"
                              step="any"
                              value={row.price ?? 0}
                              onChange={(e) =>
                                handleUpdateComboRow(
                                  idx,
                                  'price',
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="h-8 text-xs tabular-nums"
                            />
                          </div>

                          <div className="sm:col-span-1 flex justify-end pt-3">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveComboRow(idx)}
                              disabled={comboRows.length <= 2}
                              className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Combo Pricing Calculation */}
                    <div className="pt-2 border-t border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div>
                        <span className="text-muted-foreground">Combined Regular Price: </span>
                        <strong className="text-foreground">
                          {currencySymbol}{comboRegularTotal.toFixed(2)}
                        </strong>
                      </div>

                      <div className="flex items-center gap-2">
                        <Label htmlFor="input-bundle-price" className="text-xs whitespace-nowrap font-semibold">
                          Special Bundle Price ({currencySymbol}):
                        </Label>
                        <Input
                          id="input-bundle-price"
                          type="number"
                          step="0.01"
                          value={bundlePrice}
                          onChange={(e) => setBundlePrice(e.target.value)}
                          required
                          className="w-24 h-8 text-xs font-semibold tabular-nums"
                        />
                      </div>
                    </div>

                    {comboSavings > 0 && (
                      <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>
                          Customer saves {currencySymbol}{comboSavings.toFixed(2)} (
                          {((comboSavings / (comboRegularTotal || 1)) * 100).toFixed(1)}% discount)!
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {newType === 'BOGO' && (
                  <div className="space-y-3 rounded-md border border-border p-4 bg-muted/20">
                    <h4 className="text-xs font-semibold">Buy X Get Y Free Configuration</h4>
                    <p className="text-[11px] text-muted-foreground">
                      When a customer buys qualifying units of a product, free or discounted units apply automatically.
                    </p>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Qualifying Product</Label>
                      {catalog.length > 0 ? (
                        <Select
                          value={targetProductId || ''}
                          onValueChange={(val) => handleSelectBogoProduct(val)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select catalog product" />
                          </SelectTrigger>
                          <SelectContent>
                            {catalog.map((catItem) => (
                              <SelectItem key={catItem.id} value={catItem.id}>
                                {catItem.name} ({currencySymbol}{catItem.price.toFixed(2)})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          placeholder="e.g. Samosa"
                          value={targetProduct}
                          onChange={(e) => setTargetProduct(e.target.value)}
                          required
                        />
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Customer Buys (Qty)</Label>
                        <Input
                          type="number"
                          min="1"
                          value={buyQty}
                          onChange={(e) => {
                            setBuyQty(e.target.value);
                            if (targetProduct) {
                              setNewName(`Buy ${e.target.value} ${targetProduct}, Get ${getQty} Free`);
                            }
                          }}
                          required
                          className="tabular-nums"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Customer Gets (Qty)</Label>
                        <Input
                          type="number"
                          min="1"
                          value={getQty}
                          onChange={(e) => {
                            setGetQty(e.target.value);
                            if (targetProduct) {
                              setNewName(`Buy ${buyQty} ${targetProduct}, Get ${e.target.value} Free`);
                            }
                          }}
                          required
                          className="tabular-nums"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Discount on Get Qty</Label>
                        <Select
                          value={discountPercent}
                          onValueChange={(val) => val && setDiscountPercent(val)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="100">100% (FREE)</SelectItem>
                            <SelectItem value="50">50% OFF</SelectItem>
                            <SelectItem value="25">25% OFF</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}

                {newType === 'MIN_SPEND' && (
                  <div className="space-y-3 rounded-md border border-border p-4 bg-muted/20">
                    <h4 className="text-xs font-semibold">Minimum Order Spend Discount</h4>
                    <p className="text-[11px] text-muted-foreground">
                      Reward customers with an instant discount when their cart total reaches a spending target.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Minimum Spend ({currencySymbol})</Label>
                        <Input
                          type="number"
                          min="1"
                          value={minSpendAmount}
                          onChange={(e) => {
                            setMinSpendAmount(e.target.value);
                            setNewName(
                              `Spend ${currencySymbol}${e.target.value}, Get ${
                                minSpendDiscountType === 'percentage'
                                  ? `${minSpendDiscountVal}%`
                                  : `${currencySymbol}${minSpendDiscountVal}`
                              } OFF`
                            );
                          }}
                          required
                          className="tabular-nums"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Discount Type</Label>
                        <Select
                          value={minSpendDiscountType}
                          onValueChange={(val) => {
                            const t = val as 'flat' | 'percentage';
                            setMinSpendDiscountType(t);
                            setNewName(
                              `Spend ${currencySymbol}${minSpendAmount}, Get ${
                                t === 'percentage'
                                  ? `${minSpendDiscountVal}%`
                                  : `${currencySymbol}${minSpendDiscountVal}`
                              } OFF`
                            );
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="flat">Flat Amount ({currencySymbol})</SelectItem>
                            <SelectItem value="percentage">Percentage (%)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Discount Value</Label>
                        <Input
                          type="number"
                          min="1"
                          value={minSpendDiscountVal}
                          onChange={(e) => {
                            setMinSpendDiscountVal(e.target.value);
                            setNewName(
                              `Spend ${currencySymbol}${minSpendAmount}, Get ${
                                minSpendDiscountType === 'percentage'
                                  ? `${e.target.value}%`
                                  : `${currencySymbol}${e.target.value}`
                              } OFF`
                            );
                          }}
                          required
                          className="tabular-nums"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {newType === 'CATEGORY' && (
                  <div className="space-y-3 rounded-md border border-border p-4 bg-muted/20">
                    <h4 className="text-xs font-semibold">Category-Wide Discount</h4>
                    <p className="text-[11px] text-muted-foreground">
                      Apply an automatic percentage discount to every item belonging to a category in the cart.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Category</Label>
                        <Select
                          value={targetCategory}
                          onValueChange={(val) => {
                            setTargetCategory(val);
                            setNewName(`${categoryDiscountPercent}% OFF on ${val}`);
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories
                              .filter((c) => c.name !== 'ALL' && c.name !== 'All Items')
                              .map((c) => (
                                <SelectItem key={c.id} value={c.name}>
                                  {c.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Discount Percentage (%)</Label>
                        <Input
                          type="number"
                          min="1"
                          max="100"
                          value={categoryDiscountPercent}
                          onChange={(e) => {
                            setCategoryDiscountPercent(e.target.value);
                            setNewName(`${e.target.value}% OFF on ${targetCategory}`);
                          }}
                          required
                          className="tabular-nums"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Submit Row */}
                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreating(false)}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="default" className="text-xs">
                    Save & Activate Offer
                  </Button>
                </div>
              </form>
            </div>
          ) : offers.length === 0 ? (
            /* EMPTY STATE */
            <div className="py-12 px-4 flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-4">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                <Tag className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-semibold text-foreground">No Offers Configured</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Create automatic Combo Bundles, Buy-1-Get-1 rules, or Cart Minimum discounts to
                  increase basket size and reward loyal customers.
                </p>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetDefaults}
                  className="text-xs gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Load Sample Deals</span>
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setIsCreating(true)}
                  className="text-xs gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Offer</span>
                </Button>
              </div>
            </div>
          ) : (
            /* OFFERS TABLE */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Configured Store Offers
                </Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetDefaults}
                  className="text-xs text-muted-foreground hover:text-foreground gap-1 h-7"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Restore Sample Deals</span>
                </Button>
              </div>

              <div className="rounded-md border border-border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="w-[30%] text-xs font-semibold">Offer Title</TableHead>
                      <TableHead className="w-[20%] text-xs font-semibold">Type</TableHead>
                      <TableHead className="w-[32%] text-xs font-semibold">Rule / Pricing</TableHead>
                      <TableHead className="w-[10%] text-center text-xs font-semibold">Status</TableHead>
                      <TableHead className="w-[8%] text-right text-xs font-semibold">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {offers.map((offer) => {
                      return (
                        <TableRow key={offer.id}>
                          <TableCell className="py-3">
                            <div className="space-y-0.5">
                              <span className="font-medium text-xs text-foreground block">
                                {offer.name}
                              </span>
                              {offer.description && (
                                <span className="text-[11px] text-muted-foreground block line-clamp-1">
                                  {offer.description}
                                </span>
                              )}
                            </div>
                          </TableCell>

                          <TableCell className="py-3">
                            <Badge
                              variant={offer.type === 'COMBO' ? 'default' : 'secondary'}
                              className="text-[10px] px-2 py-0.5"
                            >
                              {offer.type === 'COMBO'
                                ? 'Combo Deal'
                                : offer.type === 'BOGO'
                                ? 'Buy X Get Y'
                                : offer.type === 'MIN_SPEND'
                                ? 'Order Spend'
                                : 'Category'}
                            </Badge>
                          </TableCell>

                          <TableCell className="py-3 text-xs">
                            {offer.type === 'COMBO' ? (
                              <div className="space-y-0.5">
                                <span className="text-foreground font-semibold">
                                  {currencySymbol}{(offer.bundlePrice ?? 0).toFixed(2)} bundle
                                </span>
                                <span className="text-[10px] text-muted-foreground block truncate max-w-[200px]">
                                  {offer.comboItems
                                    ?.map((i) => `${i.quantity}x ${i.productName}`)
                                    .join(' + ')}
                                </span>
                              </div>
                            ) : offer.type === 'BOGO' ? (
                              <div className="space-y-0.5">
                                <span className="text-foreground font-semibold">
                                  Buy {offer.buyQuantity || 1}, Get {offer.getQuantity || 1}{' '}
                                  {offer.discountPercent === 100 ? 'Free' : `${offer.discountPercent}% Off`}
                                </span>
                                <span className="text-[10px] text-muted-foreground block truncate max-w-[200px]">
                                  {offer.targetProductName}
                                </span>
                              </div>
                            ) : offer.type === 'MIN_SPEND' ? (
                              <div className="space-y-0.5">
                                <span className="text-foreground font-semibold">
                                  {offer.discountType === 'percentage'
                                    ? `${offer.discountValue}% OFF`
                                    : `${currencySymbol}${offer.discountValue} OFF`}
                                </span>
                                <span className="text-[10px] text-muted-foreground block">
                                  Orders &ge; {currencySymbol}{offer.minSpendAmount}
                                </span>
                              </div>
                            ) : (
                              <div className="space-y-0.5">
                                <span className="text-foreground font-semibold">
                                  {offer.categoryDiscountPercent}% OFF
                                </span>
                                <span className="text-[10px] text-muted-foreground block">
                                  Category: {offer.targetCategory}
                                </span>
                              </div>
                            )}
                          </TableCell>

                          <TableCell className="py-3 text-center">
                            <Button
                              variant={offer.enabled ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => handleToggleOffer(offer.id)}
                              className="text-[10px] h-6 px-2"
                            >
                              {offer.enabled ? 'Active' : 'Paused'}
                            </Button>
                          </TableCell>

                          <TableCell className="py-3 text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteOffer(offer.id)}
                              className="text-muted-foreground hover:text-destructive h-7 w-7"
                              title="Delete offer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>

        {/* Dialog Footer */}
        <DialogFooter className="p-4 border-t border-border flex flex-row items-center justify-between sm:justify-between shrink-0">
          <p className="text-xs text-muted-foreground hidden sm:block">
            Offers are evaluated automatically in real-time as cashier scans or adds items to cart.
          </p>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OffersModal;
