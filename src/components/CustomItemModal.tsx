import React, { useState } from 'react';
import { Plus, X, Tag } from '../icons/faIcons';
import { BillItem } from '../types';
import { GST_SLABS, calculateItemTaxSnapshot } from '../constants/taxRates';

export interface CustomItemModalProps {
  isOpen: boolean;
  currencySymbol: string;
  onClose: () => void;
  onAddCustomItem: (item: BillItem) => void;
}

export const CustomItemModal: React.FC<CustomItemModalProps> = ({
  isOpen,
  currencySymbol,
  onClose,
  onAddCustomItem,
}) => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [gstRate, setGstRate] = useState<string>('0');
  const [customGstRate, setCustomGstRate] = useState<string>('');

  if (!isOpen) return null;

  const isCustom = gstRate === 'custom';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(price);
    const qtyNum = parseInt(quantity, 10);
    const effectiveGstRate = isCustom
      ? parseFloat(customGstRate) || 0
      : parseFloat(gstRate) || 0;

    if (!name.trim() || isNaN(priceNum) || priceNum <= 0) return;

    const validQty = isNaN(qtyNum) || qtyNum <= 0 ? 1 : qtyNum;
    const taxSnapshot = calculateItemTaxSnapshot(priceNum, validQty, effectiveGstRate);

    onAddCustomItem({
      id: `custom-${Date.now()}`,
      name: name.trim(),
      unitPrice: priceNum,
      quantity: validQty,
      gstRate: taxSnapshot.gstRate,
      taxableAmount: taxSnapshot.taxableAmount,
      cgst: taxSnapshot.cgst,
      sgst: taxSnapshot.sgst,
      totalTax: taxSnapshot.totalTax,
      itemTotal: taxSnapshot.itemTotal,
    });

    onClose();
    setName('');
    setPrice('');
    setQuantity('1');
    setGstRate('0');
    setCustomGstRate('');
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl w-full max-w-sm border border-[#d4d4d8] shadow-2xl p-4 space-y-3 text-[#1c1b1d]">
        <div className="flex justify-between items-center border-b border-[#d4d4d8] pb-2.5">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-[#18181b]" />
            <h3 className="font-bold text-sm">Add Custom Item to Bill</h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#77767b] hover:text-[#1c1b1d]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-2.5">
          <div>
            <label className="text-[10px] font-bold text-[#77767b] block mb-1">
              Item Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Special Thali / Extra Cheese"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#fcf8fb] border border-[#d4d4d8] rounded-xl px-3 py-1.5 text-xs text-[#1c1b1d] focus:outline-hidden"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold text-[#77767b] block mb-1">
                Unit Price ({currencySymbol}) *
              </label>
              <input
                type="number"
                placeholder="0.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full bg-[#fcf8fb] border border-[#d4d4d8] rounded-xl px-3 py-1.5 text-xs font-mono text-[#1c1b1d] focus:outline-hidden"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-[#77767b] block mb-1">
                Quantity
              </label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full bg-[#fcf8fb] border border-[#d4d4d8] rounded-xl px-3 py-1.5 text-xs font-mono text-[#1c1b1d] focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-[#77767b] block mb-1">
              GST Slab (%) *
            </label>
            <select
              value={gstRate}
              onChange={(e) => setGstRate(e.target.value)}
              required
              className="w-full bg-[#fcf8fb] border border-[#d4d4d8] rounded-xl px-3 py-1.5 text-xs font-bold text-[#1c1b1d] focus:outline-hidden"
            >
              {GST_SLABS.map((slab) => (
                <option key={slab.label} value={slab.isCustom ? 'custom' : String(slab.rate)}>
                  {slab.label}
                </option>
              ))}
            </select>
            {isCustom && (
              <div className="mt-1.5 flex items-center gap-1.5">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  placeholder="Enter custom GST % (e.g. 7.5)"
                  value={customGstRate}
                  onChange={(e) => setCustomGstRate(e.target.value)}
                  required
                  autoFocus
                  className="w-full bg-[#fcf8fb] border border-[#d4d4d8] rounded-xl px-3 py-1 text-xs font-mono text-[#1c1b1d] focus:outline-hidden"
                />
                <span className="text-xs font-bold text-[#77767b] shrink-0">%</span>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 bg-[#f6f2f5] text-[#1c1b1d] rounded-xl text-xs font-bold border border-[#d4d4d8]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2 bg-[#18181b] text-white rounded-xl text-xs font-bold hover:bg-black shadow-2xs"
            >
              Add to Bill
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const AddCustomItemModal = CustomItemModal;
export default CustomItemModal;
