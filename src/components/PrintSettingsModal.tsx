import React, { useState } from 'react';
import {
  Printer,
  Bluetooth,
  Save,
  X,
  Sliders,
  CheckCircle,
  Building,
  Hash,
  Globe,
  QrCode,
} from 'lucide-react';
import { ShopSettings } from '../types';

interface PrintSettingsModalProps {
  isOpen: boolean;
  settings: ShopSettings;
  onClose: () => void;
  onSaveSettings: (settings: ShopSettings) => void;
}

export const PrintSettingsModal: React.FC<PrintSettingsModalProps> = ({
  isOpen,
  settings,
  onClose,
  onSaveSettings,
}) => {
  const [formData, setFormData] = useState<ShopSettings>({ ...settings });
  const [isScanningBluetooth, setIsScanningBluetooth] = useState(false);

  if (!isOpen) return null;

  const handleScanBluetooth = () => {
    setIsScanningBluetooth(true);
    setTimeout(() => {
      setIsScanningBluetooth(false);
      setFormData((prev) => ({
        ...prev,
        connectedBluetoothDevice: 'MonoPOS Thermal BT-800',
      }));
    }, 1200);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl w-full max-w-md border border-[#d4d4d8] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-[#1c1b1d]">
        {/* Header */}
        <div className="px-4 py-3 border-b border-[#d4d4d8] flex items-center justify-between bg-[#f6f2f5]">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-[#18181b]" />
            <h2 className="font-bold text-sm text-[#1c1b1d]">Hardware & Print Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#77767b] hover:text-[#1c1b1d] hover:bg-[#eae7ea]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
          {/* Target Market / Country Presets */}
          <div className="space-y-2 p-3 rounded-2xl bg-[#faf7fa] border border-[#d4d4d8]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-[#1c1b1d] flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-[#18181b]" />
                <span>Primary Target Market</span>
              </span>
              <span className="text-[10px] font-bold text-[#77767b] bg-[#eae7ea] px-2 py-0.5 rounded-full">
                1-Click Preset
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setFormData((prev) => ({
                    ...prev,
                    marketRegion: 'IN',
                    currencySymbol: '₹',
                    taxRate: 5,
                    taxLabel: 'GST (2.5% CGST + 2.5% SGST)',
                    gstin: prev.gstin && !prev.gstin.startsWith('EIN') ? prev.gstin : '24AAACC1206D1ZH',
                    upiId: prev.upiId || 'monopos.merchant@okhdfcbank',
                    paperWidth: '58mm',
                  }));
                }}
                className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                  formData.marketRegion === 'IN' || formData.currencySymbol === '₹'
                    ? 'bg-[#18181b] text-white border-[#18181b] shadow-2xs ring-1 ring-black'
                    : 'bg-white text-[#1c1b1d] border-[#d4d4d8] hover:bg-[#f6f2f5]'
                }`}
              >
                <span className="text-xl leading-none">🇮🇳</span>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-extrabold">India (IN)</div>
                  <div
                    className={`text-[10px] truncate ${
                      formData.marketRegion === 'IN' || formData.currencySymbol === '₹'
                        ? 'text-zinc-300'
                        : 'text-[#77767b]'
                    }`}
                  >
                    ₹ INR · GST · UPI QR · 58mm
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setFormData((prev) => ({
                    ...prev,
                    marketRegion: 'US',
                    currencySymbol: '$',
                    taxRate: 8.25,
                    taxLabel: 'Sales Tax',
                    gstin: prev.gstin === '24AAACC1206D1ZH' ? 'EIN 82-1940219' : prev.gstin,
                    paperWidth: '80mm',
                  }));
                }}
                className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                  formData.marketRegion === 'US' || formData.currencySymbol === '$'
                    ? 'bg-[#18181b] text-white border-[#18181b] shadow-2xs ring-1 ring-black'
                    : 'bg-white text-[#1c1b1d] border-[#d4d4d8] hover:bg-[#f6f2f5]'
                }`}
              >
                <span className="text-xl leading-none">🇺🇸</span>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-extrabold">United States (US)</div>
                  <div
                    className={`text-[10px] truncate ${
                      formData.marketRegion === 'US' || formData.currencySymbol === '$'
                        ? 'text-zinc-300'
                        : 'text-[#77767b]'
                    }`}
                  >
                    $ USD · Sales Tax · Tips · 80mm
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Printer Configuration */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-[#1c1b1d] uppercase tracking-wider">
              Thermal Paper Width
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {(['58mm', '80mm'] as const).map((width) => (
                <button
                  key={width}
                  type="button"
                  onClick={() => setFormData({ ...formData, paperWidth: width })}
                  className={`py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    formData.paperWidth === width
                      ? 'bg-[#18181b] text-white border-[#18181b] shadow-2xs'
                      : 'bg-white text-[#47464b] border-[#d4d4d8] hover:bg-[#f6f2f5]'
                  }`}
                >
                  {width} Roll
                </button>
              ))}
            </div>
          </div>

          {/* Bluetooth Device Pairing */}
          <div className="bg-[#f6f2f5] p-3 rounded-xl border border-[#d4d4d8] space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-[#1c1b1d] flex items-center gap-1.5">
                <Bluetooth className="w-3.5 h-3.5 text-[#18181b]" />
                <span>Bluetooth ESC/POS Device</span>
              </span>
              <button
                type="button"
                onClick={handleScanBluetooth}
                disabled={isScanningBluetooth}
                className="text-[11px] font-bold text-[#18181b] hover:underline cursor-pointer"
              >
                {isScanningBluetooth ? 'Scanning...' : 'Pair / Scan'}
              </button>
            </div>
            <p className="text-[11px] font-mono text-[#47464b] bg-white p-2 rounded-lg border border-[#d4d4d8]">
              {formData.connectedBluetoothDevice || 'No Bluetooth printer paired'}
            </p>
          </div>

          {/* Store Info */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold text-[#1c1b1d] uppercase tracking-wider">
              Store Information
            </h3>

            <div>
              <label className="text-[10px] font-bold text-[#77767b] block mb-1">
                Store / Brand Name
              </label>
              <input
                type="text"
                value={formData.shopName}
                onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                className="w-full bg-[#fcf8fb] border border-[#d4d4d8] rounded-xl px-3 py-1.5 text-xs text-[#1c1b1d] focus:outline-hidden"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-[#77767b] block mb-1">
                Address & City
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full bg-[#fcf8fb] border border-[#d4d4d8] rounded-xl px-3 py-1.5 text-xs text-[#1c1b1d] focus:outline-hidden"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-[#77767b] block mb-1">
                  Contact Phone
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-[#fcf8fb] border border-[#d4d4d8] rounded-xl px-3 py-1.5 text-xs text-[#1c1b1d] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#77767b] block mb-1">
                  {formData.currencySymbol === '₹' || formData.marketRegion === 'IN'
                    ? 'GSTIN Tax ID (India)'
                    : 'EIN / Tax ID (US)'}
                </label>
                <input
                  type="text"
                  placeholder={
                    formData.currencySymbol === '₹' ? 'e.g. 24AAACC1206D1ZH' : 'e.g. EIN 82-1940219'
                  }
                  value={formData.gstin || ''}
                  onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                  className="w-full bg-[#fcf8fb] border border-[#d4d4d8] rounded-xl px-3 py-1.5 text-xs font-mono text-[#1c1b1d] focus:outline-hidden"
                />
              </div>
            </div>

            {(formData.currencySymbol === '₹' || formData.marketRegion === 'IN') && (
              <div>
                <label className="text-[10px] font-bold text-[#77767b] block mb-1 flex items-center gap-1">
                  <QrCode className="w-3 h-3 text-[#18181b]" />
                  <span>UPI ID for Counter Payment QR (Google Pay / PhonePe / Paytm)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. storename@upi or merchant@okhdfcbank"
                  value={formData.upiId || ''}
                  onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                  className="w-full bg-[#fcf8fb] border border-[#d4d4d8] rounded-xl px-3 py-1.5 text-xs font-mono text-[#1c1b1d] focus:outline-hidden"
                />
                <span className="text-[10px] text-[#77767b] mt-0.5 block">
                  Generates instant scannable UPI QR code on paper bills for seamless cashless collection.
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-[#77767b] block mb-1">
                  {formData.currencySymbol === '₹' ? 'GST Rate (%)' : 'Sales Tax Rate (%)'}
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.taxRate}
                  onChange={(e) =>
                    setFormData({ ...formData, taxRate: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full bg-[#fcf8fb] border border-[#d4d4d8] rounded-xl px-3 py-1.5 text-xs font-mono text-[#1c1b1d] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#77767b] block mb-1">
                  Currency Symbol
                </label>
                <input
                  type="text"
                  value={formData.currencySymbol}
                  onChange={(e) => setFormData({ ...formData, currencySymbol: e.target.value })}
                  className="w-full bg-[#fcf8fb] border border-[#d4d4d8] rounded-xl px-3 py-1.5 text-xs font-mono text-[#1c1b1d] focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Footer Save */}
          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-[#f6f2f5] hover:bg-[#eae7ea] text-[#1c1b1d] border border-[#d4d4d8] font-bold text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-[#18181b] hover:bg-black text-white font-extrabold text-xs shadow-sm"
            >
              Save Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
