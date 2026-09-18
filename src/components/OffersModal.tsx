import React, { useState } from 'react';
import {
  Tag,
  Plus,
  Trash2,
  CheckCircle2,
  Gift,
  Layers,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import { PromotionOffer, OfferType } from '../types';
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
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
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
}

export const OffersModal: React.FC<OffersModalProps> = ({
  isOpen,
  onClose,
  currencySymbol = '₹',
}) => {
  const { offers, setOffers, appliedPromotions, promotionsDiscount } = useCart();
  const [isCreating, setIsCreating] = useState(false);

  // Form state for creating a new offer
  const [newType, setNewType] = useState<OfferType>('COMBO');
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  // Combo specific
  const [comboItem1, setComboItem1] = useState('coke');
  const [comboItem2, setComboItem2] = useState('drink');
  const [comboItem3, setComboItem3] = useState('sweet');
  const [bundlePrice, setBundlePrice] = useState('10.00');

  // BOGO specific
  const [targetProduct, setTargetProduct] = useState('coke');
  const [buyQty, setBuyQty] = useState('1');
  const [getQty, setGetQty] = useState('1');
  const [discountPercent, setDiscountPercent] = useState('100');

  if (!isOpen) return null;

  const activeOffersCount = offers.filter((o) => o.enabled).length;

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

  const handleCreateOffer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    if (newType === 'COMBO') {
      const items = [comboItem1, comboItem2, comboItem3]
        .map((s) => s.trim())
        .filter(Boolean)
        .map((name) => ({ productName: name, quantity: 1 }));

      if (items.length === 0) return;

      const newOffer: PromotionOffer = {
        id: `offer-combo-${Date.now()}`,
        name: newName.trim(),
        type: 'COMBO',
        enabled: true,
        description: newDesc.trim() || `Bundle deal for ${currencySymbol}${bundlePrice}`,
        createdAt: new Date().toISOString(),
        comboItems: items,
        bundlePrice: parseFloat(bundlePrice) || 0,
      };

      setOffers((prev) => [newOffer, ...prev]);
    } else {
      if (!targetProduct.trim()) return;

      const newOffer: PromotionOffer = {
        id: `offer-bogo-${Date.now()}`,
        name: newName.trim(),
        type: 'BOGO',
        enabled: true,
        description:
          newDesc.trim() ||
          `Buy ${buyQty} ${targetProduct}, get ${getQty} at ${discountPercent}% off`,
        createdAt: new Date().toISOString(),
        targetProductName: targetProduct.trim(),
        buyQuantity: parseInt(buyQty, 10) || 1,
        getQuantity: parseInt(getQty, 10) || 1,
        discountPercent: parseFloat(discountPercent) || 100,
      };

      setOffers((prev) => [newOffer, ...prev]);
    }

    // Reset form
    setNewName('');
    setNewDesc('');
    setIsCreating(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b border-border shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DialogTitle className="text-base font-semibold flex items-center gap-2">
                <Tag className="size-4 text-primary" />
                <span>Offers & Promotions Engine</span>
              </DialogTitle>
              <Badge variant={activeOffersCount > 0 ? 'default' : 'secondary'}>
                {activeOffersCount} Active {activeOffersCount === 1 ? 'Deal' : 'Deals'}
              </Badge>
            </div>
            {!isCreating && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCreating(true)}
                className="gap-1 text-xs font-medium"
              >
                <Plus className="size-3.5" />
                <span>New Offer</span>
              </Button>
            )}
          </div>
          <DialogDescription>
            Automatic combo bundles and Buy 1 Get 1 Free (BOGO) rules applied to customer carts in
            real-time.
          </DialogDescription>
        </DialogHeader>

        {/* Live Cart Savings Alert Banner if applicable */}
        {promotionsDiscount > 0 && (
          <div className="px-6 py-2.5 bg-muted/60 border-b border-border flex items-center justify-between gap-2 shrink-0 text-xs">
            <div className="flex items-center gap-2 text-foreground font-medium min-w-0">
              <Sparkles className="size-3.5 text-primary shrink-0" />
              <span className="truncate">
                Current register cart has{' '}
                <strong className="text-primary font-bold">
                  {appliedPromotions.length} active promotion{appliedPromotions.length > 1 ? 's' : ''} applied
                </strong>{' '}
                (Saved {currencySymbol}{promotionsDiscount.toFixed(2)})
              </span>
            </div>
            <Badge variant="default" className="text-xs">
              Save {currencySymbol}{promotionsDiscount.toFixed(2)}
            </Badge>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {isCreating ? (
            /* Creation Form */
            <Card size="sm">
              <CardHeader className="border-b border-border pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-semibold">Create Promotion Rule</CardTitle>
                    <CardDescription className="text-xs">
                      Set up automatic discounts that trigger when qualifying items are in the cart
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsCreating(false)}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="pt-4">
                <form onSubmit={handleCreateOffer} className="space-y-4">
                  {/* Deal Type Selector */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">
                      Offer Type
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant={newType === 'COMBO' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                          setNewType('COMBO');
                          if (!newName) setNewName('Coke + Drink + Sweet Combo');
                          if (!newDesc) setNewDesc('Buy Coke, Drink and Sweet for ₹10.00');
                        }}
                        className="gap-2 text-xs"
                      >
                        <Layers className="size-3.5" />
                        <span>Combo / Bundle Deal</span>
                      </Button>
                      <Button
                        type="button"
                        variant={newType === 'BOGO' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                          setNewType('BOGO');
                          if (!newName) setNewName('Buy 1 Get 1 Free on Coke');
                          if (!newDesc) setNewDesc('Buy 1 Coke, get 1 Coke Free');
                        }}
                        className="gap-2 text-xs"
                      >
                        <Gift className="size-3.5" />
                        <span>Buy 1 Get 1 (BOGO)</span>
                      </Button>
                    </div>
                  </div>

                  {/* Offer Name */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">
                      Offer Title
                    </Label>
                    <Input
                      placeholder={
                        newType === 'COMBO'
                          ? 'e.g., Coke + Drink + Sweet Deal'
                          : 'e.g., Buy 1 Get 1 Free on Coke'
                      }
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      required
                      className="text-xs"
                    />
                  </div>

                  {/* Offer Description */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">
                      Customer Description / Receipt Note
                    </Label>
                    <Input
                      placeholder="e.g., Save ₹4 with the summer snack combo"
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                      className="text-xs"
                    />
                  </div>

                  {newType === 'COMBO' ? (
                    /* COMBO SPECIFIC INPUTS */
                    <div className="space-y-3 rounded-lg border border-border p-3 bg-muted/20">
                      <Label className="text-xs font-semibold text-foreground">
                        Items Required for this Combo
                      </Label>
                      <p className="text-[11px] text-muted-foreground">
                        Enter the product keywords. When a cart contains all items, the bundle price
                        applies automatically.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground uppercase">Item 1</Label>
                          <Input
                            placeholder="e.g. coke"
                            value={comboItem1}
                            onChange={(e) => setComboItem1(e.target.value)}
                            required
                            className="text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground uppercase">Item 2</Label>
                          <Input
                            placeholder="e.g. drink"
                            value={comboItem2}
                            onChange={(e) => setComboItem2(e.target.value)}
                            required
                            className="text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground uppercase">Item 3</Label>
                          <Input
                            placeholder="e.g. sweet"
                            value={comboItem3}
                            onChange={(e) => setComboItem3(e.target.value)}
                            className="text-xs"
                          />
                        </div>
                      </div>

                      <div className="space-y-1 pt-1">
                        <Label className="text-xs font-semibold text-foreground">
                          Special Combo Bundle Price ({currencySymbol})
                        </Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="10.00"
                          value={bundlePrice}
                          onChange={(e) => setBundlePrice(e.target.value)}
                          required
                          className="text-xs font-semibold"
                        />
                      </div>
                    </div>
                  ) : (
                    /* BOGO SPECIFIC INPUTS */
                    <div className="space-y-3 rounded-lg border border-border p-3 bg-muted/20">
                      <Label className="text-xs font-semibold text-foreground">
                        BOGO (Buy X Get Y) Details
                      </Label>
                      <p className="text-[11px] text-muted-foreground">
                        When the customer buys qualifying units, free or discounted units are
                        deducted automatically.
                      </p>

                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Target Product Keyword</Label>
                        <Input
                          placeholder="e.g. coke"
                          value={targetProduct}
                          onChange={(e) => setTargetProduct(e.target.value)}
                          required
                          className="text-xs"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground uppercase">Buy Qty</Label>
                          <Input
                            type="number"
                            min="1"
                            value={buyQty}
                            onChange={(e) => setBuyQty(e.target.value)}
                            className="text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground uppercase">Get Free Qty</Label>
                          <Input
                            type="number"
                            min="1"
                            value={getQty}
                            onChange={(e) => setGetQty(e.target.value)}
                            className="text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground uppercase">Discount %</Label>
                          <Input
                            type="number"
                            min="1"
                            max="100"
                            value={discountPercent}
                            onChange={(e) => setDiscountPercent(e.target.value)}
                            className="text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsCreating(false)}
                      className="text-xs"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" variant="default" size="sm" className="text-xs">
                      Save & Activate Offer
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : offers.length === 0 ? (
            /* Empty State */
            <div className="py-12 px-4 flex flex-col items-center justify-center text-center max-w-sm mx-auto space-y-4">
              <div className="size-14 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                <Tag className="size-7" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-semibold text-foreground">No Offers Configured</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Create automatic Combo Bundles or Buy-1-Get-1 rules to boost sales and reward
                  customers during checkout.
                </p>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetDefaults}
                  className="text-xs gap-1.5"
                >
                  <RotateCcw className="size-3.5" />
                  <span>Load Sample Deals</span>
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setIsCreating(true)}
                  className="text-xs gap-1.5"
                >
                  <Plus className="size-3.5" />
                  <span>Create Offer</span>
                </Button>
              </div>
            </div>
          ) : (
            /* Active Offers List */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Configured Store Offers
                </Label>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={handleResetDefaults}
                  className="text-xs text-muted-foreground hover:text-foreground gap-1"
                >
                  <RotateCcw className="size-3" />
                  <span>Restore Sample Offers</span>
                </Button>
              </div>

              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="w-[30%] text-xs font-semibold">Offer</TableHead>
                      <TableHead className="w-[18%] text-xs font-semibold">Type</TableHead>
                      <TableHead className="w-[32%] text-xs font-semibold">Rule / Price</TableHead>
                      <TableHead className="w-[10%] text-center text-xs font-semibold">Status</TableHead>
                      <TableHead className="w-[10%] text-right text-xs font-semibold">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {offers.map((offer) => {
                      const isCombo = offer.type === 'COMBO';

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
                              variant={isCombo ? 'default' : 'secondary'}
                              className="text-[10px] px-1.5 py-0 h-4"
                            >
                              {isCombo ? 'Combo Deal' : 'Buy 1 Get 1'}
                            </Badge>
                          </TableCell>

                          <TableCell className="py-3 text-xs">
                            {isCombo ? (
                              <div className="space-y-0.5">
                                <span className="text-foreground font-semibold">
                                  {currencySymbol}
                                  {(offer.bundlePrice ?? 0).toFixed(2)} bundle
                                </span>
                                <span className="text-[10px] text-muted-foreground block truncate max-w-[200px]">
                                  Includes:{' '}
                                  {offer.comboItems?.map((i) => i.productName).join(' + ')}
                                </span>
                              </div>
                            ) : (
                              <div className="space-y-0.5">
                                <span className="text-foreground font-semibold">
                                  Buy {offer.buyQuantity || 1}, Get {offer.getQuantity || 1} Free
                                </span>
                                <span className="text-[10px] text-muted-foreground block truncate max-w-[200px]">
                                  Product: {offer.targetProductName}
                                </span>
                              </div>
                            )}
                          </TableCell>

                          <TableCell className="py-3 text-center">
                            <Button
                              variant={offer.enabled ? 'default' : 'outline'}
                              size="xs"
                              onClick={() => handleToggleOffer(offer.id)}
                              className="text-[10px] h-6 px-2"
                            >
                              {offer.enabled ? 'Active' : 'Paused'}
                            </Button>
                          </TableCell>

                          <TableCell className="py-3 text-right">
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => handleDeleteOffer(offer.id)}
                              className="text-muted-foreground hover:text-destructive size-7"
                              title="Delete offer"
                            >
                              <Trash2 className="size-3.5" />
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
            Offers are evaluated automatically when cashier adds items to cart.
          </p>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close (Esc)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
