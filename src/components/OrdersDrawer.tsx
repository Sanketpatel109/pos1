import React, { useState } from 'react';
import { X, PauseCircle, CheckCircle, BarChart3, Settings, Play, Trash2, Printer, Volume2, VolumeX } from '../icons/faIcons';
import { Order, ShopSettings } from '../types';

interface OrdersDrawerProps {
  isOpen: boolean;
  heldOrders: Order[];
  completedOrders: Order[];
  shopSettings: ShopSettings;
  currencySymbol: string;
  onClose: () => void;
  onResumeHeldOrder: (order: Order) => void;
  onDeleteHeldOrder: (orderId: string) => void;
  onReprintOrder: (order: Order) => void;
  onUpdateSettings: (settings: ShopSettings) => void;
}

type DrawerTab = 'held' | 'history' | 'analytics' | 'settings';

export const OrdersDrawer: React.FC<OrdersDrawerProps> = ({
  isOpen,
  heldOrders,
  completedOrders,
  shopSettings,
  currencySymbol,
  onClose,
  onResumeHeldOrder,
  onDeleteHeldOrder,
  onReprintOrder,
  onUpdateSettings,
}) => {
  const [activeTab, setActiveTab] = useState<DrawerTab>('held');
  const [settingsForm, setSettingsForm] = useState<ShopSettings>(shopSettings);

  if (!isOpen) return null;

  // Analytics calculations
  const totalSales = completedOrders.reduce((sum, o) => sum + o.total, 0);
  const totalItemsSold = completedOrders.reduce(
    (sum, o) => sum + o.items.reduce((iSum, item) => iSum + item.quantity, 0),
    0
  );
  const cashSales = completedOrders
    .filter((o) => o.paymentMethod === 'cash')
    .reduce((sum, o) => sum + o.total, 0);
  const upiSales = completedOrders
    .filter((o) => o.paymentMethod === 'upi')
    .reduce((sum, o) => sum + o.total, 0);
  const cardSales = completedOrders
    .filter((o) => o.paymentMethod === 'card')
    .reduce((sum, o) => sum + o.total, 0);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings(settingsForm);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-sm h-full shadow-2xl flex flex-col border-r border-zinc-200 animate-in slide-in-from-left duration-200">
        {/* Drawer Header */}
        <div className="px-3.5 py-2.5 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
          <div>
            <h2 className="text-sm font-bold text-zinc-900">POS Operations</h2>
            <p className="text-[11px] text-zinc-500 font-mono">Terminal #01 &bull; {shopSettings.shopName}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close drawer"
            className="p-1 text-zinc-500 hover:text-zinc-900 rounded-md hover:bg-zinc-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-zinc-200 bg-zinc-100/70 p-1 gap-1">
          <button
            onClick={() => setActiveTab('held')}
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
              activeTab === 'held'
                ? 'bg-white text-zinc-900 shadow-2xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <PauseCircle className="w-3.5 h-3.5" />
            <span>Held ({heldOrders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-white text-zinc-900 shadow-2xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>History ({completedOrders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
              activeTab === 'analytics'
                ? 'bg-white text-zinc-900 shadow-2xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Summary</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-white text-zinc-900 shadow-2xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Config</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-3">
          {/* TAB 1: HELD ORDERS */}
          {activeTab === 'held' && (
            <div className="space-y-2.5">
              {heldOrders.length === 0 ? (
                <div className="py-12 text-center text-zinc-400">
                  <PauseCircle className="w-9 h-9 mx-auto stroke-1 mb-1.5 text-zinc-300" />
                  <p className="text-xs font-semibold text-zinc-600">No orders on hold</p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Use the pause button on the bill screen to temporarily save an in-progress order.
                  </p>
                </div>
              ) : (
                heldOrders.map((order) => (
                  <div
                    key={order.id}
                    className="border border-zinc-200 rounded-lg p-2.5 bg-zinc-50 hover:border-zinc-400 transition-all space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="bg-zinc-900 text-white font-mono font-bold text-[10px] px-1.5 py-0.5 rounded">
                          Order #{String(order.orderNumber).padStart(3, '0')}
                        </span>
                        <span className="text-[11px] text-zinc-500 font-mono">
                          {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-xs text-zinc-900">
                        {currencySymbol}{order.total.toFixed(2)}
                      </span>
                    </div>

                    {/* Items preview */}
                    <div className="text-[11px] text-zinc-600 font-medium bg-white p-1.5 rounded border border-zinc-200/80">
                      {order.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-1.5 pt-0.5">
                      <button
                        onClick={() => onDeleteHeldOrder(order.id)}
                        className="px-2 py-1 text-[11px] text-red-600 hover:bg-red-50 rounded font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Discard</span>
                      </button>
                      <button
                        onClick={() => {
                          onResumeHeldOrder(order);
                          onClose();
                        }}
                        className="px-2.5 py-1 text-[11px] bg-zinc-900 hover:bg-black text-white rounded font-bold flex items-center gap-1 transition-all shadow-2xs cursor-pointer"
                      >
                        <Play className="w-3 h-3" />
                        <span>Resume to Bill</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 2: COMPLETED ORDERS */}
          {activeTab === 'history' && (
            <div className="space-y-2">
              {completedOrders.length === 0 ? (
                <div className="py-12 text-center text-zinc-400">
                  <CheckCircle className="w-9 h-9 mx-auto stroke-1 mb-1.5 text-zinc-300" />
                  <p className="text-xs font-semibold text-zinc-600">No completed orders yet</p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Processed orders will appear here for receipt reprints and auditing.
                  </p>
                </div>
              ) : (
                completedOrders.slice().reverse().map((order) => (
                  <div
                    key={order.id}
                    className="border border-zinc-200 rounded-lg p-2.5 bg-white hover:border-zinc-400 transition-all space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="bg-zinc-900 text-white font-mono font-bold text-[10px] px-1.5 py-0.5 rounded">
                          #{String(order.orderNumber).padStart(3, '0')}
                        </span>
                        <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">
                          {order.paymentMethod || 'PAID'}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-xs text-zinc-900">
                        {currencySymbol}{order.total.toFixed(2)}
                      </span>
                    </div>

                    <div className="text-[11px] text-zinc-500 flex justify-between">
                      <span>{order.items.reduce((s, i) => s + i.quantity, 0)} items</span>
                      <span>{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    <div className="flex justify-end pt-0.5">
                      <button
                        onClick={() => {
                          onReprintOrder(order);
                          onClose();
                        }}
                        className="px-2 py-0.5 text-[11px] bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Printer className="w-3 h-3" />
                        <span>Print Receipt</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: ANALYTICS / SUMMARY */}
          {activeTab === 'analytics' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-zinc-900 text-white p-2.5 rounded-lg">
                  <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">Today&apos;s Revenue</p>
                  <p className="text-xl font-extrabold font-mono mt-0.5">
                    {currencySymbol}{totalSales.toFixed(2)}
                  </p>
                </div>
                <div className="bg-zinc-100 border border-zinc-200 p-2.5 rounded-lg">
                  <p className="text-[10px] uppercase tracking-wider text-zinc-600 font-semibold">Total Orders</p>
                  <p className="text-xl font-extrabold font-mono text-zinc-900 mt-0.5">
                    {completedOrders.length}
                  </p>
                </div>
              </div>

              <div className="border border-zinc-200 rounded-lg p-2.5 bg-zinc-50 space-y-1.5 text-[11px]">
                <h4 className="font-bold text-zinc-900 uppercase tracking-wider">Payment Breakdown</h4>
                <div className="flex justify-between text-zinc-700">
                  <span>Cash:</span>
                  <span className="font-mono font-bold">{currencySymbol}{cashSales.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-zinc-700">
                  <span>UPI / QR:</span>
                  <span className="font-mono font-bold">{currencySymbol}{upiSales.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-zinc-700">
                  <span>Card / POS:</span>
                  <span className="font-mono font-bold">{currencySymbol}{cardSales.toFixed(2)}</span>
                </div>
                <div className="pt-1.5 border-t border-zinc-200 flex justify-between font-bold text-zinc-900">
                  <span>Total Items Sold:</span>
                  <span className="font-mono">{totalItemsSold}</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SETTINGS */}
          {activeTab === 'settings' && (
            <form onSubmit={handleSaveSettings} className="space-y-2.5 text-xs">
              <div>
                <label className="block font-bold text-zinc-700 uppercase text-[10px] mb-0.5">Store Name</label>
                <input
                  type="text"
                  value={settingsForm.shopName}
                  onChange={(e) => setSettingsForm({ ...settingsForm, shopName: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-zinc-300 rounded text-zinc-900 bg-white text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-700 uppercase text-[10px] mb-0.5">Tagline / Header</label>
                <input
                  type="text"
                  value={settingsForm.tagline}
                  onChange={(e) => setSettingsForm({ ...settingsForm, tagline: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-zinc-300 rounded text-zinc-900 bg-white text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-700 uppercase text-[10px] mb-0.5">Store Address & Phone</label>
                <input
                  type="text"
                  value={settingsForm.address}
                  onChange={(e) => setSettingsForm({ ...settingsForm, address: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-zinc-300 rounded text-zinc-900 bg-white mb-1.5 text-xs"
                />
                <input
                  type="text"
                  value={settingsForm.phone}
                  onChange={(e) => setSettingsForm({ ...settingsForm, phone: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-zinc-300 rounded text-zinc-900 bg-white text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-700 uppercase text-[10px] mb-0.5">GSTIN / Tax ID</label>
                <input
                  type="text"
                  value={settingsForm.gstin}
                  onChange={(e) => setSettingsForm({ ...settingsForm, gstin: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-zinc-300 rounded text-zinc-900 bg-white font-mono text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-zinc-700 uppercase text-[10px] mb-0.5">Tax Rate (%)</label>
                  <select
                    value={settingsForm.taxRate}
                    onChange={(e) => setSettingsForm({ ...settingsForm, taxRate: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2.5 py-1.5 border border-zinc-300 rounded text-zinc-900 bg-white font-mono text-xs"
                  >
                    <option value="0">0% (Zero Tax)</option>
                    <option value="5">5% (GST 5%)</option>
                    <option value="12">12% (GST 12%)</option>
                    <option value="18">18% (GST 18%)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-zinc-700 uppercase text-[10px] mb-0.5">Audio Feedback</label>
                  <button
                    type="button"
                    onClick={() => setSettingsForm({ ...settingsForm, soundEnabled: !settingsForm.soundEnabled })}
                    className="w-full px-2.5 py-1.5 border border-zinc-300 rounded text-zinc-900 bg-white flex items-center justify-between font-semibold cursor-pointer text-xs"
                  >
                    <span>{settingsForm.soundEnabled ? 'Enabled' : 'Muted'}</span>
                    {settingsForm.soundEnabled ? (
                      <Volume2 className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <VolumeX className="w-3.5 h-3.5 text-zinc-400" />
                    )}
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-200 flex justify-end">
                <button
                  type="submit"
                  className="w-full py-1.5 bg-zinc-900 hover:bg-black text-white font-bold rounded-lg transition-all shadow-2xs cursor-pointer text-xs"
                >
                  Save Settings
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
