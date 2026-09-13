import React, { useState } from 'react';
import {
  Users,
  Search,
  Plus,
  Phone,
  CreditCard,
  CheckCircle,
  Clock,
  ArrowDownLeft,
  X,
  FileText,
  Star,
} from 'lucide-react';
import { Customer, Order } from '../types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const WhatsAppIcon: React.FC<{ className?: string }> = ({ className = 'w-3.5 h-3.5' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
  </svg>
);

interface CustomerManagementScreenProps {
  customers: Customer[];
  orders: Order[];
  currencySymbol: string;
  enableLoyaltyPoints?: boolean;
  onAddCustomer: (customer: Omit<Customer, 'id' | 'createdAt'>) => void;
  onSettleCredit: (customerId: string, amount: number, note: string) => void;
}

export const CustomerManagementScreen: React.FC<CustomerManagementScreenProps> = ({
  customers,
  orders,
  currencySymbol,
  enableLoyaltyPoints = true,
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
    <div className="flex-1 flex flex-col min-h-0 bg-background text-foreground overflow-hidden">
      {/* Top Banner: Total Khata Balance & Quick Action */}
      <div className="bg-card border-b border-border p-3 sm:p-4 flex items-center justify-between gap-3 shrink-0">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
            Total Outstanding Khata (Accounts Receivable)
          </span>
          <span className="text-xl sm:text-2xl font-bold text-destructive tabular-nums tracking-tight font-medium">
            {currencySymbol}
            {totalOutstanding.toFixed(2)}
          </span>
        </div>

        <Button
          onClick={() => setIsAddModalOpen(true)}
          variant="default"
          className="h-8 px-3 text-xs font-medium gap-1.5 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Customer</span>
        </Button>
      </div>

      {/* Responsive Master-Detail Layout */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0">
        {/* Left Column: Customer Directory */}
        <div className="flex-1 md:w-2/5 flex flex-col min-h-0 bg-muted/30 md:border-r border-border">
          {/* Search Bar */}
          <div className="p-3 bg-card border-b border-border shrink-0">
            <div className="relative">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                type="text"
                placeholder="Search by customer name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 h-8 text-xs bg-muted/40"
              />
            </div>
          </div>

          {/* Directory List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 no-scrollbar">
            {filteredCustomers.length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center text-muted-foreground text-xs">
                No customers found matching search
              </div>
            ) : (
              filteredCustomers.map((cust) => {
                const hasDue = cust.creditBalance > 0;
                const isSelected = activeCustomer?.id === cust.id;

                return (
                  <Card
                    key={cust.id}
                    onClick={() => setSelectedCustomerId(cust.id)}
                    className={`p-3 flex flex-row items-center justify-between gap-3 transition-all cursor-pointer shadow-xs ${
                      isSelected
                        ? 'bg-accent/60 border-primary shadow-xs'
                        : 'border-border hover:bg-muted/40 hover:border-border'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-xs sm:text-sm text-foreground truncate">
                          {cust.name}
                        </h3>
                        <span className="text-[11px] text-muted-foreground tabular-nums">
                          {cust.phone}
                        </span>
                      </div>

                      <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1.5 tabular-nums">
                        <span>{cust.totalOrders || 0} Bills</span>
                        {enableLoyaltyPoints !== false && (
                          <>
                            <span>•</span>
                            <span className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                              <Star className="w-2.5 h-2.5 text-amber-500" />
                              {cust.loyaltyPoints || 0} pts
                            </span>
                          </>
                        )}
                        <span>•</span>
                        <span className="tracking-tight font-medium">Bal: {currencySymbol}{cust.creditBalance.toFixed(2)}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <span
                          className={`font-bold text-xs sm:text-sm tabular-nums tracking-tight ${
                            hasDue ? 'text-destructive' : 'text-foreground'
                          }`}
                        >
                          {currencySymbol}
                          {cust.creditBalance.toFixed(2)}
                        </span>
                      </div>

                      {hasDue && (
                        <Button
                          size="icon-xs"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleWhatsAppReminder(cust);
                          }}
                          title="Send WhatsApp Reminder"
                          className="cursor-pointer hover:bg-emerald-50 hover:border-emerald-300 dark:hover:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400"
                        >
                          <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column (Tablet View): Customer Detail & Khata Statement */}
        <div className="hidden md:flex md:w-3/5 bg-muted/20 flex-col min-h-0 p-4 overflow-y-auto">
          {activeCustomer ? (
            <div className="space-y-4">
              {/* Profile Card */}
              <Card className="p-4 shadow-xs flex justify-between items-start border-border bg-card">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-bold text-foreground">
                      {activeCustomer.name}
                    </h2>
                    <Badge variant="secondary" className="text-xs">
                      {activeCustomer.phone}
                    </Badge>
                    <Badge variant="outline" className="text-xs font-medium text-primary bg-primary/10 border-primary/20">
                      Udhar Limit: {currencySymbol}{activeCustomer.creditLimit ?? 2000}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Customer registered on: {new Date(activeCustomer.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex gap-2 items-center flex-wrap">
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => handleWhatsAppReminder(activeCustomer)}
                    className="h-8 px-3 text-xs font-medium gap-1.5 cursor-pointer hover:bg-emerald-50 hover:border-emerald-300 dark:hover:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400"
                  >
                    <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>WhatsApp</span>
                  </Button>
                  <Button
                    variant="default"
                    size="xs"
                    onClick={() => {
                      setSettleAmount(String(activeCustomer.creditBalance > 0 ? activeCustomer.creditBalance : ''));
                      setIsSettleModalOpen(true);
                    }}
                    className="h-8 px-3 text-xs font-medium gap-1.5 cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>+ Collect Cash / Settle Khata</span>
                  </Button>
                </div>
              </Card>

              {/* Customer Account Stats */}
              <div className={`grid ${enableLoyaltyPoints !== false ? 'grid-cols-3' : 'grid-cols-2'} gap-3`}>
                <Card className="p-3 shadow-xs border-border bg-card">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">
                    Khata Due
                  </span>
                  <span
                    className={`text-lg sm:text-xl font-bold tabular-nums tracking-tight font-medium ${
                      activeCustomer.creditBalance > 0 ? 'text-destructive' : 'text-primary'
                    }`}
                  >
                    {currencySymbol}
                    {activeCustomer.creditBalance.toFixed(2)}
                  </span>
                </Card>

                {enableLoyaltyPoints !== false && (
                  <Card className="p-3 shadow-xs border-border bg-card">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase block">
                      Loyalty Points
                    </span>
                    <span className="text-lg sm:text-xl font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5 tabular-nums">
                      <Star className="w-4 h-4 text-amber-500" />
                      <span>{activeCustomer.loyaltyPoints || 0}</span>
                    </span>
                  </Card>
                )}

                <Card className="p-3 shadow-xs border-border bg-card">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">
                    Lifetime Spend
                  </span>
                  <span className="text-lg sm:text-xl font-bold text-foreground tabular-nums tracking-tight font-medium">
                    {currencySymbol}
                    {customerOrders.reduce((sum, o) => sum + o.total, 0).toFixed(2)}
                  </span>
                </Card>
              </div>

              {/* Order History Table */}
              <Card className="p-4 shadow-xs space-y-3 border-border bg-card">
                <h3 className="font-bold text-xs text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-primary" />
                  <span>Invoice & Payment History ({customerOrders.length})</span>
                </h3>

                {customerOrders.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">
                    No orders linked directly with this phone number yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {customerOrders.map((ord) => (
                      <div
                        key={ord.id}
                        className="flex justify-between items-center p-2.5 bg-muted/40 border border-border rounded-md text-xs "
                      >
                        <div>
                          <span className="font-bold text-foreground tabular-nums">Bill #{ord.orderNumber}</span>
                          <span className="text-[10px] text-muted-foreground ml-2">
                            {new Date(ord.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-[10px] py-0 font-sans font-medium">
                            {ord.paymentMethod}
                          </Badge>
                          <span className="font-bold text-foreground tabular-nums tracking-tight font-medium">
                            {currencySymbol}
                            {ord.total.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground">
              <Users className="w-8 h-8 text-muted-foreground/40 mb-2" />
              <p className="text-xs font-bold text-foreground">No Customer Selected</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Select a customer from the left list to view their ledger statement
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add Customer Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-black/40 backdrop-blur-xs">
          <Card className="w-full max-w-sm border-border shadow-2xl p-4 space-y-3 text-foreground bg-card">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-sm">Create Customer Profile</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="space-y-2.5">
              <div>
                <label className="text-[10px] font-bold text-muted-foreground block mb-1">
                  Customer Name *
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Ramesh Kumar"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full h-8 text-xs bg-background"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-muted-foreground block mb-1">
                  10-digit Phone Number *
                </label>
                <Input
                  type="tel"
                  placeholder="9876543210"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full h-8 text-xs bg-background"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-muted-foreground block mb-1">
                  Opening Credit Due (Optional)
                </label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={newInitialCredit}
                  onChange={(e) => setNewInitialCredit(e.target.value)}
                  className="w-full h-8 text-xs bg-background"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 h-8 text-xs font-medium cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="default"
                  className="flex-1 h-8 text-xs font-medium cursor-pointer"
                >
                  Save Customer
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Settle Credit Modal */}
      {isSettleModalOpen && activeCustomer && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-black/40 backdrop-blur-xs">
          <Card className="w-full max-w-sm border-border shadow-2xl p-4 space-y-3 text-foreground bg-card">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-sm">Settle Customer Khata</h3>
              <button
                onClick={() => setIsSettleModalOpen(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              Customer:{' '}
              <strong className="text-foreground">{activeCustomer.name}</strong>
              <br />
              Current Due:{' '}
              <strong className="text-destructive tabular-nums tracking-tight font-medium">
                {currencySymbol}
                {activeCustomer.creditBalance.toFixed(2)}
              </strong>
            </p>

            <form onSubmit={handleConfirmSettle} className="space-y-2.5">
              <div>
                <label className="text-[10px] font-bold text-muted-foreground block mb-1">
                  Repayment Amount Received ({currencySymbol})
                </label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  className="w-full h-8 text-xs bg-background"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-muted-foreground block mb-1">
                  Payment Note (e.g. UPI Ref # / Cash)
                </label>
                <Input
                  type="text"
                  placeholder="Cash repayment at counter"
                  value={settleNote}
                  onChange={(e) => setSettleNote(e.target.value)}
                  className="w-full h-8 text-xs bg-background"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsSettleModalOpen(false)}
                  className="flex-1 h-8 text-xs font-medium cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="default"
                  className="flex-1 h-8 text-xs font-medium cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  Record Payment
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};
