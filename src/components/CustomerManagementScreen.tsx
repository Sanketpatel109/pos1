import React, { useState } from 'react';
import {
  Users,
  Search,
  Plus,
  Phone,
  CreditCard,
  Send,
  CheckCircle,
  Clock,
  ArrowDownLeft,
  X,
  FileText,
  Star,
} from '../icons/faIcons';
import { Customer, Order } from '../types';

interface CustomerManagementScreenProps {
  customers: Customer[];
  orders: Order[];
  currencySymbol: string;
  onAddCustomer: (customer: Omit<Customer, 'id' | 'createdAt'>) => void;
  onSettleCredit: (customerId: string, amount: number, note: string) => void;
}

export const CustomerManagementScreen: React.FC<CustomerManagementScreenProps> = ({
  customers,
  orders,
  currencySymbol,
  onAddCustomer,
  onSettleCredit,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    customers.length > 0 ? customers[0].id : ''
  );

  // Add Customer Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newCreditLimit, setNewCreditLimit] = useState('2000');
  const [newInitialCredit, setNewInitialCredit] = useState('');

  // Settle Credit Modal
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [settleAmount, setSettleAmount] = useState('');
  const [settleNote, setSettleNote] = useState('');

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery)
  );

  const activeCustomer =
    customers.find((c) => c.id === selectedCustomerId) || filteredCustomers[0] || null;

  // Orders related to the selected customer
  const customerOrders = activeCustomer
    ? orders.filter(
        (o) =>
          (o.customerPhone && o.customerPhone === activeCustomer.phone) ||
          (o.customerName && o.customerName.toLowerCase() === activeCustomer.name.toLowerCase())
      )
    : [];

  const totalOutstanding = customers.reduce((sum, c) => sum + c.creditBalance, 0);

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim()) return;

    onAddCustomer({
      name: newName.trim(),
      phone: newPhone.trim(),
      creditLimit: parseFloat(newCreditLimit) || 2000,
      creditBalance: parseFloat(newInitialCredit) || 0,
      totalOrders: 0,
    });

    setIsAddModalOpen(false);
    setNewName('');
    setNewPhone('');
    setNewCreditLimit('2000');
    setNewInitialCredit('');
  };

  const handleConfirmSettle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCustomer) return;
    const amt = parseFloat(settleAmount);
    if (isNaN(amt) || amt <= 0) return;

    onSettleCredit(activeCustomer.id, amt, settleNote.trim() || 'Credit repayment');
    setIsSettleModalOpen(false);
    setSettleAmount('');
    setSettleNote('');
  };

  const handleWhatsAppReminder = (customer: Customer) => {
    const text = `Hello ${customer.name}, this is a friendly reminder regarding your outstanding balance of *${currencySymbol}${customer.creditBalance.toFixed(2)}* at our store. Please settle at your convenience. Thank you!`;
    window.open(`https://wa.me/${customer.phone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#fcf8fb] overflow-hidden">
      {/* Top Banner: Total Khata Balance & Quick Action */}
      <div className="bg-[#f6f2f5] border-b border-[#d4d4d8] p-3 sm:p-4 flex items-center justify-between gap-3 shrink-0">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#77767b] block">
            Total Outstanding Khata (Accounts Receivable)
          </span>
          <span className="text-xl sm:text-2xl font-black font-mono text-[#ba1a1a]">
            {currencySymbol}
            {totalOutstanding.toFixed(2)}
          </span>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-3.5 py-2 bg-[#18181b] hover:bg-black text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95 transition-all"
        >
          <Plus className="w-3.5 h-3.5 stroke-[3]" />
          <span>New Customer</span>
        </button>
      </div>

      {/* Responsive Master-Detail Layout */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0">
        {/* Left Column: Customer Directory */}
        <div className="flex-1 md:w-2/5 flex flex-col min-h-0 bg-white md:border-r border-[#d4d4d8]">
          {/* Search Bar */}
          <div className="p-3 bg-white border-b border-[#d4d4d8] shrink-0">
            <div className="bg-[#f6f2f5] border border-[#d4d4d8] rounded-xl px-3 py-2 flex items-center gap-2">
              <Search className="w-4 h-4 text-[#77767b]" />
              <input
                type="text"
                placeholder="Search by customer name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs text-[#1c1b1d] bg-transparent focus:outline-hidden placeholder-[#77767b]"
              />
            </div>
          </div>

          {/* Directory List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 no-scrollbar">
            {filteredCustomers.length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center text-[#77767b] text-xs">
                No customers found matching search
              </div>
            ) : (
              filteredCustomers.map((cust) => {
                const hasDue = cust.creditBalance > 0;
                const isSelected = activeCustomer?.id === cust.id;

                return (
                  <div
                    key={cust.id}
                    onClick={() => setSelectedCustomerId(cust.id)}
                    className={`border rounded-2xl p-3 flex items-center justify-between gap-3 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#f0edf0] border-[#18181b] ring-1 ring-[#18181b]'
                        : 'bg-white border-[#d4d4d8] hover:border-[#18181b] shadow-2xs'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-extrabold text-xs sm:text-sm text-[#1c1b1d] truncate">
                          {cust.name}
                        </h3>
                        <span className="text-[11px] font-mono text-[#77767b]">
                          {cust.phone}
                        </span>
                      </div>

                      <p className="text-[10px] text-[#77767b] mt-0.5 font-mono flex items-center gap-1.5">
                        <span>{cust.totalOrders || 0} Bills</span>
                        <span>•</span>
                        <span className="text-amber-700 font-bold flex items-center gap-1">
                          <Star className="w-2.5 h-2.5 text-amber-500" />
                          {cust.loyaltyPoints || 0} pts
                        </span>
                        <span>•</span>
                        <span>Bal: {currencySymbol}{cust.creditBalance.toFixed(2)}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <span
                          className={`font-mono font-black text-xs sm:text-sm ${
                            hasDue ? 'text-[#ba1a1a]' : 'text-emerald-700'
                          }`}
                        >
                          {currencySymbol}
                          {cust.creditBalance.toFixed(2)}
                        </span>
                      </div>

                      {hasDue && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleWhatsAppReminder(cust);
                          }}
                          title="Send WhatsApp Reminder"
                          className="p-1.5 bg-white hover:bg-[#eae7ea] rounded-lg text-[#1c1b1d] border border-[#d4d4d8]/70 cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column (Tablet View): Customer Detail & Khata Statement */}
        <div className="hidden md:flex md:w-3/5 bg-[#f6f2f5] flex-col min-h-0 p-4 overflow-y-auto">
          {activeCustomer ? (
            <div className="space-y-4">
              {/* Profile Card */}
              <div className="bg-white border border-[#d4d4d8] rounded-2xl p-4 shadow-2xs flex justify-between items-start">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-black text-[#1c1b1d]">
                      {activeCustomer.name}
                    </h2>
                    <span className="text-xs font-mono text-[#77767b] bg-[#f0edf0] px-2 py-0.5 rounded">
                      {activeCustomer.phone}
                    </span>
                    <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                      Udhar Limit: {currencySymbol}{activeCustomer.creditLimit ?? 2000}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#77767b]">
                    Customer registered on: {new Date(activeCustomer.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex gap-2 items-center flex-wrap">
                  <button
                    onClick={() => handleWhatsAppReminder(activeCustomer)}
                    className="px-3 py-2 bg-[#f0edf0] hover:bg-[#eae7ea] text-[#1c1b1d] rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-[#d4d4d8]"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </button>
                  <button
                    onClick={() => {
                      setSettleAmount(String(activeCustomer.creditBalance > 0 ? activeCustomer.creditBalance : ''));
                      setIsSettleModalOpen(true);
                    }}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>+ Collect Cash / Settle Khata</span>
                  </button>
                </div>
              </div>

              {/* Customer Account Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white border border-[#d4d4d8] rounded-2xl p-3 shadow-2xs">
                  <span className="text-[10px] font-bold text-[#77767b] uppercase block">
                    Khata Due
                  </span>
                  <span
                    className={`text-lg sm:text-xl font-black font-mono ${
                      activeCustomer.creditBalance > 0 ? 'text-[#ba1a1a]' : 'text-emerald-700'
                    }`}
                  >
                    {currencySymbol}
                    {activeCustomer.creditBalance.toFixed(2)}
                  </span>
                </div>

                <div className="bg-white border border-[#d4d4d8] rounded-2xl p-3 shadow-2xs">
                  <span className="text-[10px] font-bold text-[#77767b] uppercase block">
                    Loyalty Points
                  </span>
                  <span className="text-lg sm:text-xl font-black font-mono text-amber-700 flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-amber-500" />
                    <span>{activeCustomer.loyaltyPoints || 0}</span>
                  </span>
                </div>

                <div className="bg-white border border-[#d4d4d8] rounded-2xl p-3 shadow-2xs">
                  <span className="text-[10px] font-bold text-[#77767b] uppercase block">
                    Lifetime Spend
                  </span>
                  <span className="text-lg sm:text-xl font-black font-mono text-[#1c1b1d]">
                    {currencySymbol}
                    {customerOrders.reduce((sum, o) => sum + o.total, 0).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Order History Table */}
              <div className="bg-white border border-[#d4d4d8] rounded-2xl p-4 shadow-2xs space-y-3">
                <h3 className="font-extrabold text-xs text-[#1c1b1d] uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-[#18181b]" />
                  <span>Invoice & Payment History ({customerOrders.length})</span>
                </h3>

                {customerOrders.length === 0 ? (
                  <p className="text-xs text-[#77767b] text-center py-6">
                    No orders linked directly with this phone number yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {customerOrders.map((ord) => (
                      <div
                        key={ord.id}
                        className="flex justify-between items-center p-2.5 bg-[#fcf8fb] border border-[#d4d4d8] rounded-xl text-xs font-mono"
                      >
                        <div>
                          <span className="font-bold text-[#1c1b1d]">Bill #{ord.orderNumber}</span>
                          <span className="text-[10px] text-[#77767b] ml-2">
                            {new Date(ord.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] bg-[#eae7ea] px-1.5 py-0.5 rounded font-sans font-bold">
                            {ord.paymentMethod}
                          </span>
                          <span className="font-bold text-[#1c1b1d]">
                            {currencySymbol}
                            {ord.total.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center text-[#77767b]">
              <Users className="w-8 h-8 text-[#c8c5cb] mb-2" />
              <p className="text-xs font-bold text-[#1c1b1d]">No Customer Selected</p>
              <p className="text-[11px] text-[#77767b] mt-0.5">
                Select a customer from the left list to view their ledger statement
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add Customer Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-sm border border-[#d4d4d8] shadow-2xl p-4 space-y-3 text-[#1c1b1d]">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-sm">Create Customer Profile</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-[#77767b] hover:text-[#1c1b1d]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="space-y-2.5">
              <div>
                <label className="text-[10px] font-bold text-[#77767b] block mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Kumar"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-[#fcf8fb] border border-[#d4d4d8] rounded-xl px-3 py-1.5 text-xs text-[#1c1b1d] focus:outline-hidden"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#77767b] block mb-1">
                  10-digit Phone Number *
                </label>
                <input
                  type="tel"
                  placeholder="9876543210"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full bg-[#fcf8fb] border border-[#d4d4d8] rounded-xl px-3 py-1.5 text-xs text-[#1c1b1d] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#77767b] block mb-1">
                  Opening Credit Due (Optional)
                </label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={newInitialCredit}
                  onChange={(e) => setNewInitialCredit(e.target.value)}
                  className="w-full bg-[#fcf8fb] border border-[#d4d4d8] rounded-xl px-3 py-1.5 text-xs font-mono text-[#1c1b1d] focus:outline-hidden"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2 bg-[#f6f2f5] text-[#1c1b1d] rounded-xl text-xs font-bold border border-[#d4d4d8]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-[#18181b] text-white rounded-xl text-xs font-bold hover:bg-black"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settle Credit Modal */}
      {isSettleModalOpen && activeCustomer && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-sm border border-[#d4d4d8] shadow-2xl p-4 space-y-3 text-[#1c1b1d]">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-sm">Settle Customer Khata</h3>
              <button
                onClick={() => setIsSettleModalOpen(false)}
                className="text-[#77767b] hover:text-[#1c1b1d]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#47464b]">
              Customer:{' '}
              <strong className="text-[#1c1b1d]">{activeCustomer.name}</strong>
              <br />
              Current Due:{' '}
              <strong className="text-[#ba1a1a]">
                {currencySymbol}
                {activeCustomer.creditBalance.toFixed(2)}
              </strong>
            </p>

            <form onSubmit={handleConfirmSettle} className="space-y-2.5">
              <div>
                <label className="text-[10px] font-bold text-[#77767b] block mb-1">
                  Repayment Amount Received ({currencySymbol})
                </label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  className="w-full bg-[#fcf8fb] border border-[#d4d4d8] rounded-xl px-3 py-1.5 text-xs font-mono text-[#1c1b1d] focus:outline-hidden"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#77767b] block mb-1">
                  Payment Note (e.g. UPI Ref # / Cash)
                </label>
                <input
                  type="text"
                  placeholder="Cash repayment at counter"
                  value={settleNote}
                  onChange={(e) => setSettleNote(e.target.value)}
                  className="w-full bg-[#fcf8fb] border border-[#d4d4d8] rounded-xl px-3 py-1.5 text-xs text-[#1c1b1d] focus:outline-hidden"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSettleModalOpen(false)}
                  className="flex-1 py-2 bg-[#f6f2f5] text-[#1c1b1d] rounded-xl text-xs font-bold border border-[#d4d4d8]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-[#18181b] text-white rounded-xl text-xs font-bold hover:bg-black"
                >
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
