import React, { useState, useMemo, useEffect } from 'react';
import { Search, UserCheck, AlertTriangle, Phone, Wallet, Plus, ShieldAlert, Check } from '../../icons/faIcons';
import { Customer } from '../../types';
import { posSound } from '../../utils/sound';

export interface KhataPaymentProps {
  total: number;
  currencySymbol?: string;
  customers?: Customer[];
  canStaffKhata?: boolean;
  onRequestKhataAuth?: (onApproved: () => void) => void;
  onRequestCreditLimitOverride?: (customerName: string, amount: number, limit: number, onApproved: () => void) => void;
  onConfirmPayment: (details: {
    customerId: string;
    customerName: string;
    customerPhone: string;
    previousDue: number;
    newTotalDue: number;
  }) => void;
  onAddNewCustomer?: (name: string, phone: string, creditLimit?: number) => Customer | void;
  isSubmitting?: boolean;
}

export const KhataPayment: React.FC<KhataPaymentProps> = ({
  total,
  currencySymbol = '₹',
  customers = [],
  canStaffKhata = true,
  onRequestKhataAuth,
  onRequestCreditLimitOverride,
  onConfirmPayment,
  onAddNewCustomer,
  isSubmitting = false,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [isLimitOverrideApproved, setIsLimitOverrideApproved] = useState<boolean>(false);
  const [isKhataAuthApproved, setIsKhataAuthApproved] = useState<boolean>(false);

  // Quick Inline New Customer Modal/State
  const [isAddingCustomer, setIsAddingCustomer] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>('');
  const [newPhone, setNewPhone] = useState<string>('');
  const [newCreditLimit, setNewCreditLimit] = useState<string>('2000');
  const [pendingSelectionName, setPendingSelectionName] = useState<string | null>(null);

  // Auto-select customer when customers list updates if we just added one
  useEffect(() => {
    if (pendingSelectionName) {
      const match = customers.find(
        (c) => c.name.toLowerCase() === pendingSelectionName.toLowerCase().trim()
      );
      if (match) {
        setSelectedCustomerId(match.id);
        setPendingSelectionName(null);
      }
    }
  }, [customers, pendingSelectionName]);

  // Filtered customer list
  const filteredCustomers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return customers.slice(0, 10);
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q))
    );
  }, [customers, searchQuery]);

  const selectedCustomer = useMemo(() => {
    return customers.find((c) => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  // Credit calculation
  const creditLimit = selectedCustomer?.creditLimit ?? 5000;
  const currentOutstanding = selectedCustomer?.creditBalance || 0;
  const projectedOutstanding = currentOutstanding + total;
  const isOverLimit = selectedCustomer ? projectedOutstanding > creditLimit : false;
  const remainingCredit = Math.max(0, creditLimit - currentOutstanding);

  const handleSelect = (customer: Customer) => {
    posSound?.playTap?.();
    setSelectedCustomerId(customer.id);
  };

  const handleCreateCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim()) return;

    const parsedLimit = parseFloat(newCreditLimit) || 2000;
    const nameToAdd = newName.trim();
    setPendingSelectionName(nameToAdd);

    if (onAddNewCustomer) {
      const created = onAddNewCustomer(nameToAdd, newPhone.trim(), parsedLimit);
      if (created && typeof created === 'object' && 'id' in created) {
        setSelectedCustomerId((created as Customer).id);
        setPendingSelectionName(null);
      }
    }
    posSound?.playTap?.();
    setIsAddingCustomer(false);
    setSearchQuery('');
    setNewName('');
    setNewPhone('');
    setNewCreditLimit('2000');
  };

  return (
    <div className="flex flex-col gap-3 py-1 flex-1 animate-in fade-in duration-150">
      {/* Search Input and Add New Quick Action */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Grahak Khata Search by name or 10-digit mobile..."
            className="w-full h-11 pl-9 pr-3 bg-zinc-50 border border-zinc-200 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 rounded-xl text-xs sm:text-sm font-medium text-zinc-900 outline-hidden transition-all shadow-xs"
          />
        </div>

        {onAddNewCustomer && (
          <button
            type="button"
            onClick={() => {
              posSound?.playTap?.();
              setIsAddingCustomer(true);
            }}
            className="h-11 px-4 bg-zinc-100 hover:bg-zinc-200 active:scale-95 text-zinc-700 text-xs font-medium rounded-xl flex items-center gap-1 shrink-0 transition-all cursor-pointer shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New</span>
          </button>
        )}
      </div>

      {/* Inline Create Customer Form */}
      {isAddingCustomer && (
        <form
          onSubmit={handleCreateCustomerSubmit}
          className="p-3.5 bg-blue-50/50 border border-blue-200 rounded-2xl flex flex-col gap-2.5 animate-in slide-in-from-top-2 duration-150 shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-950">Add Customer to Khata</span>
            <button
              type="button"
              onClick={() => setIsAddingCustomer(false)}
              className="text-[11px] font-medium text-blue-600 hover:underline cursor-pointer"
            >
              Cancel
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              type="text"
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Full Name *"
              className="h-10 px-3 bg-white border border-zinc-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 rounded-xl text-xs font-medium text-zinc-900 outline-hidden"
            />
            <input
              type="tel"
              required
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              placeholder="Mobile Number *"
              className="h-10 px-3 bg-white border border-zinc-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 rounded-xl text-xs font-medium text-zinc-900 outline-hidden"
            />
            <div>
              <input
                type="number"
                required
                min="500"
                step="500"
                value={newCreditLimit}
                onChange={(e) => setNewCreditLimit(e.target.value)}
                placeholder="Udhar Limit (₹) *"
                className="w-full h-10 px-3 bg-white border border-zinc-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 rounded-xl text-xs font-medium text-zinc-900 outline-hidden tabular-nums"
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-blue-700">Default credit ceiling: ₹2,000</span>
            <button
              type="submit"
              className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-xl transition-all cursor-pointer shadow-xs active:scale-[0.98]"
            >
              Save & Select Customer
            </button>
          </div>
        </form>
      )}

      {/* Customer Picker List */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-zinc-700">Select Customer</label>
        <div className="max-h-44 sm:max-h-48 overflow-y-auto flex flex-col gap-1.5 pr-0.5 border border-zinc-200/80 rounded-2xl bg-zinc-50/50 p-2">
          {filteredCustomers.length === 0 ? (
            <div className="py-6 text-center text-xs text-zinc-400">
              No customers match "{searchQuery}"
            </div>
          ) : (
            filteredCustomers.map((cust) => {
            const isSelected = cust.id === selectedCustomerId;
            const custLimit = cust.creditLimit ?? 5000;
            const isCustNearLimit = cust.creditBalance > custLimit * 0.8;

            return (
              <div
                key={cust.id}
                onClick={() => handleSelect(cust)}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                  isSelected
                    ? 'bg-blue-50/60 border-blue-500 shadow-xs'
                    : 'bg-white hover:bg-zinc-50 border-zinc-200/80'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                      isSelected
                        ? 'bg-blue-600 text-white'
                        : 'bg-zinc-100 text-zinc-700'
                    }`}
                  >
                    {cust.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h5 className="text-xs sm:text-sm font-medium text-zinc-900 truncate">
                      {cust.name}
                    </h5>
                    <p className="text-[11px] text-zinc-500 flex items-center gap-1 truncate">
                      <Phone className="w-3 h-3 text-zinc-400 shrink-0" />
                      <span>{cust.phone || 'No phone'}</span>
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="flex items-center justify-end gap-1.5">
                    <span className="text-[10px] text-zinc-400 uppercase font-medium">
                      Due:
                    </span>
                    <span
                      className={`text-xs font-medium tabular-nums tracking-tight ${
                        isCustNearLimit ? 'text-amber-700' : 'text-zinc-800'
                      }`}
                    >
                      {currencySymbol}
                      {cust.creditBalance.toFixed(2)}
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-400 block font-mono tabular-nums tracking-tight">
                    Limit: {currencySymbol}{custLimit.toFixed(2)}
                  </span>
                </div>
              </div>
            );
          })
        )}
        </div>
      </div>

      {/* Selected Customer Credit Ledger Card */}
      {selectedCustomer && (
        <div
          className={`p-3.5 rounded-2xl border flex flex-col gap-2.5 animate-in fade-in duration-150 shadow-xs ${
            isOverLimit
              ? 'bg-rose-50/80 border-rose-300 text-zinc-900'
              : 'bg-white border-zinc-200/80 text-zinc-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <UserCheck className="w-4 h-4 text-blue-600 shrink-0" />
              <div className="min-w-0">
                <span className="text-xs font-semibold text-zinc-900 block truncate">
                  {selectedCustomer.name}
                </span>
                <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-zinc-400" />
                  {selectedCustomer.phone || 'No phone recorded'}
                </span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[10px] font-semibold text-zinc-400 uppercase block">Credit Limit</span>
              <span className="text-xs font-mono font-medium text-zinc-700 tabular-nums tracking-tight">
                {currencySymbol}{creditLimit.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-100 text-center">
            <div>
              <span className="text-[10px] text-zinc-500 uppercase font-medium">Previous Due</span>
              <div className="text-xs sm:text-sm font-medium text-zinc-800 tabular-nums tracking-tight">
                {currencySymbol}{currentOutstanding.toFixed(2)}
              </div>
            </div>
            <div>
              <span className="text-[10px] text-zinc-500 uppercase font-medium">+ This Bill</span>
              <div className="text-xs sm:text-sm font-semibold text-blue-600 tabular-nums tracking-tight">
                {currencySymbol}{total.toFixed(2)}
              </div>
            </div>
            <div>
              <span className="text-[10px] text-zinc-500 uppercase font-medium">Projected Due</span>
              <div
                className={`text-xs sm:text-sm font-bold tabular-nums tracking-tight ${
                  isOverLimit ? 'text-rose-600' : 'text-zinc-900'
                }`}
              >
                {currencySymbol}{projectedOutstanding.toFixed(2)}
              </div>
            </div>
          </div>

          {isOverLimit ? (
            isLimitOverrideApproved ? (
              <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-800 text-xs font-medium flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Manager PIN Approved: Credit limit override authorized for {selectedCustomer.name}.
                </span>
              </div>
            ) : (
              <div className="p-2.5 bg-rose-100/70 border border-rose-300 rounded-xl text-rose-800 text-xs font-medium flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>
                    Credit Limit Exceeded: Total ({currencySymbol}{projectedOutstanding.toFixed(2)}) exceeds limit of {currencySymbol}{creditLimit.toFixed(2)}.
                  </span>
                </div>
                {onRequestCreditLimitOverride && (
                  <button
                    type="button"
                    onClick={() => {
                      onRequestCreditLimitOverride(
                        selectedCustomer.name,
                        projectedOutstanding,
                        creditLimit,
                        () => setIsLimitOverrideApproved(true)
                      );
                    }}
                    className="self-start px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[11px] font-medium transition-colors cursor-pointer shadow-xs active:scale-[0.98]"
                  >
                    Request Manager PIN Override
                  </button>
                )}
              </div>
            )
          ) : (
            <div className="text-[11px] text-zinc-500 flex items-center justify-between px-0.5">
              <span>Remaining Credit Available:</span>
              <span className="font-medium text-emerald-700 tabular-nums tracking-tight">
                {currencySymbol}{Math.max(0, creditLimit - projectedOutstanding).toFixed(2)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Settle Khata CTA */}
      {(() => {
        const isEffectiveOverLimit = isOverLimit && !isLimitOverrideApproved;
        const isDisabled = !selectedCustomer || isEffectiveOverLimit || isSubmitting;
        const needsKhataElevation = !canStaffKhata && !isKhataAuthApproved;

        const handleSettle = () => {
          if (isDisabled) return;
          if (needsKhataElevation && onRequestKhataAuth) {
            onRequestKhataAuth(() => {
              setIsKhataAuthApproved(true);
              if (!selectedCustomer) return;
              posSound?.playTap?.();
              onConfirmPayment({
                customerId: selectedCustomer.id,
                customerName: selectedCustomer.name,
                customerPhone: selectedCustomer.phone,
                previousDue: currentOutstanding,
                newTotalDue: projectedOutstanding,
              });
            });
            return;
          }
          if (!selectedCustomer) return;
          posSound?.playTap?.();
          onConfirmPayment({
            customerId: selectedCustomer.id,
            customerName: selectedCustomer.name,
            customerPhone: selectedCustomer.phone,
            previousDue: currentOutstanding,
            newTotalDue: projectedOutstanding,
          });
        };

        return (
          <button
            type="button"
            disabled={isDisabled}
            onClick={handleSettle}
            className={`w-full h-11 mt-auto rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs ${
              !isDisabled
                ? 'bg-blue-600 hover:bg-blue-700 text-white active:scale-[0.98]'
                : 'bg-zinc-100 text-zinc-400 border border-zinc-200 cursor-not-allowed shadow-none'
            }`}
          >
            {isSubmitting ? (
              <span>Updating Customer Credit...</span>
            ) : !selectedCustomer ? (
              <span>Select a Customer</span>
            ) : isEffectiveOverLimit ? (
              <span>Credit Limit Exceeded</span>
            ) : needsKhataElevation ? (
              <span>Charge to Credit (Manager PIN Required) →</span>
            ) : (
              <span>Charge to Customer Credit →</span>
            )}
          </button>
        );
      })()}
    </div>
  );
};
