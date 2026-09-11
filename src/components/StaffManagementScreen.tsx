import React, { useState } from 'react';
import { Shield, KeyRound, Plus, Check, X, Lock, ShieldCheck, UserCheck, Settings2 } from 'lucide-react';
import { StaffMember, StaffRole, StorePermissions, DEFAULT_STORE_PERMISSIONS } from '../types';
import { normalizeRole, ROLE_DEFINITIONS } from '../utils/permissions';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface StaffManagementScreenProps {
  staffList: StaffMember[];
  activeStaffId: string;
  permissions?: StorePermissions;
  onSelectStaff: (staffId: string) => void;
  onAddStaff: (staff: Omit<StaffMember, 'id'>) => void;
  onUpdatePin: (staffId: string, newPin: string) => void;
  onUpdatePermissions?: (newPermissions: StorePermissions) => void;
}

export const StaffManagementScreen: React.FC<StaffManagementScreenProps> = ({
  staffList,
  activeStaffId,
  permissions = DEFAULT_STORE_PERMISSIONS,
  onSelectStaff,
  onAddStaff,
  onUpdatePin,
  onUpdatePermissions,
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState<StaffRole>('CASHIER');
  const [pin, setPin] = useState('');

  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [selectedStaffForPin, setSelectedStaffForPin] = useState<StaffMember | null>(null);
  const [newPin, setNewPin] = useState('');

  const activeStaff = staffList.find((s) => s.id === activeStaffId) || staffList[0];

  const handleCreateStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || pin.length < 4) return;

    onAddStaff({
      name: name.trim(),
      role,
      pin,
      active: true,
    });

    setIsAddModalOpen(false);
    setName('');
    setPin('');
    setRole('CASHIER');
  };

  const handleSavePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffForPin || newPin.length < 4) return;

    onUpdatePin(selectedStaffForPin.id, newPin);
    setIsPinModalOpen(false);
    setNewPin('');
    setSelectedStaffForPin(null);
  };

  const handleTogglePermission = (group: 'staff' | 'manager', key: string) => {
    if (!onUpdatePermissions) return;
    const current = { ...permissions };
    if (group === 'staff') {
      current.staff = {
        ...current.staff,
        [key]: !current.staff[key as keyof typeof current.staff],
      };
    } else {
      current.manager = {
        ...current.manager,
        [key]: !current.manager[key as keyof typeof current.manager],
      };
    }
    onUpdatePermissions(current);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background overflow-hidden">
      {/* Top Header Bar */}
      <div className="bg-muted/40 border-b border-border p-3.5 sm:p-4 flex justify-between items-center shrink-0">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
            Terminal Access & Cashier Management
          </span>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-sm sm:text-base font-bold text-foreground">
              {staffList.length} Registered Operators
            </span>
            <span className="text-xs text-muted-foreground">• Active: <strong className="text-foreground">{activeStaff?.name}</strong></span>
          </div>
        </div>

        <Button
          onClick={() => setIsAddModalOpen(true)}
          size="sm"
          className="gap-1.5 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Staff</span>
        </Button>
      </div>

      {/* Main Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {/* Active Session Indicator */}
        <Card className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
              {activeStaff?.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-foreground">{activeStaff?.name}</h3>
                <Badge variant="outline" className="text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">
                  {normalizeRole(activeStaff?.role)}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Current active terminal operator • Bills and drawer entries are credited to this cashier
              </p>
            </div>
          </div>
          <Badge variant="outline" className="gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20 py-1 px-2.5">
            <Check className="w-3.5 h-3.5" />
            <span>Terminal Session Active</span>
          </Badge>
        </Card>

        {/* Staff Roster Grid */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-bold text-xs text-foreground uppercase tracking-wider">
              Counter Staff & Cashiers
            </h4>
            <span className="text-[11px] text-muted-foreground">
              Tap "Switch To Operator" to change cashier session
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {staffList.map((staff) => {
              const isActive = staff.id === activeStaffId;
              const normRole = normalizeRole(staff.role);
              const meta = ROLE_DEFINITIONS[normRole];

              return (
                <Card
                  key={staff.id}
                  className={`p-4 flex flex-col justify-between transition-all shadow-xs ${
                    isActive
                      ? 'border-primary ring-2 ring-primary/20 bg-card'
                      : 'hover:border-muted-foreground/30'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 ${
                            isActive
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {staff.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-foreground">{staff.name}</h3>
                          <Badge
                            variant="secondary"
                            className="text-[9px] px-2 py-0.5 font-bold uppercase inline-block mt-0.5"
                          >
                            {meta.label}
                          </Badge>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedStaffForPin(staff);
                          setIsPinModalOpen(true);
                        }}
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        title="Change 4-digit PIN"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    <p className="text-[11px] text-muted-foreground mt-2 line-clamp-2">
                      {meta.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-border">
                    <span className="text-[11px] text-muted-foreground ">
                      PIN: ••••
                    </span>

                    {isActive ? (
                      <Badge variant="outline" className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20">
                        Active Cashier
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => onSelectStaff(staff.id)}
                        className="text-xs h-7 px-3"
                      >
                        Switch To Operator
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Operational Permission Toggles */}
        <Card className="p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-primary" />
              <div>
                <h4 className="font-bold text-sm text-foreground">
                  Operational Security & Access Policies
                </h4>
                <p className="text-xs text-muted-foreground">
                  Control when billing staff require Manager/Owner PIN authorization
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-[10px] font-bold text-primary bg-primary/10 border-primary/20">
              Owner Privileged
            </Badge>
          </div>

          <div className="divide-y divide-border">
            {/* Toggle 1 */}
            <div className="py-3 flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-semibold text-foreground">
                  1. Allow Cashier to Sell on Khata (Udhar) without PIN
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  When disabled, counter staff must enter a Manager PIN to complete credit transactions.
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={permissions.staff.allowKhata}
                onClick={() => handleTogglePermission('staff', 'allowKhata')}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                  permissions.staff.allowKhata ? 'bg-primary' : 'bg-muted'
                }`}
              >
                <div
                  className={`bg-background w-4 h-4 rounded-full shadow-xs transform transition-transform ${
                    permissions.staff.allowKhata ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Toggle 2 */}
            <div className="py-3 flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-semibold text-foreground">
                  2. Allow Cashier to Modify Prices / Apply Manual Discounts
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  When disabled, changing item unit rates or adding discounts on the fly requires Manager authorization.
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={permissions.staff.allowPriceOverride}
                onClick={() => handleTogglePermission('staff', 'allowPriceOverride')}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                  permissions.staff.allowPriceOverride ? 'bg-primary' : 'bg-muted'
                }`}
              >
                <div
                  className={`bg-background w-4 h-4 rounded-full shadow-xs transform transition-transform ${
                    permissions.staff.allowPriceOverride ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Toggle 3 */}
            <div className="py-3 flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-semibold text-foreground">
                  3. Allow Staff to Receive Inward Supplier Stock
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  Allows cashiers and store assistants to enter supplier purchase invoices and replenish catalog stock.
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={permissions.staff.allowStockInward}
                onClick={() => handleTogglePermission('staff', 'allowStockInward')}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                  permissions.staff.allowStockInward ? 'bg-primary' : 'bg-muted'
                }`}
              >
                <div
                  className={`bg-background w-4 h-4 rounded-full shadow-xs transform transition-transform ${
                    permissions.staff.allowStockInward ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Toggle 4 */}
            <div className="py-3 flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-semibold text-foreground">
                  4. Allow Manager to View Buying Rates & Profit Margins
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  Displays wholesale cost rates and gross margin percentages to store managers in inventory reports.
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={permissions.manager.viewCostPrice}
                onClick={() => handleTogglePermission('manager', 'viewCostPrice')}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                  permissions.manager.viewCostPrice ? 'bg-primary' : 'bg-muted'
                }`}
              >
                <div
                  className={`bg-background w-4 h-4 rounded-full shadow-xs transform transition-transform ${
                    permissions.manager.viewCostPrice ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Toggle 5 */}
            <div className="py-3 flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-semibold text-foreground">
                  5. Allow Manager to Cancel / Void Settled Bills
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  Allows store managers to void completed customer transactions without requiring the Owner PIN.
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={permissions.manager.allowBillVoid}
                onClick={() => handleTogglePermission('manager', 'allowBillVoid')}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                  permissions.manager.allowBillVoid ? 'bg-primary' : 'bg-muted'
                }`}
              >
                <div
                  className={`bg-background w-4 h-4 rounded-full shadow-xs transform transition-transform ${
                    permissions.manager.allowBillVoid ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </Card>
      </div>

      {/* Add Staff Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-background/80 backdrop-blur-xs animate-in fade-in duration-150">
          <Card className="w-full max-w-sm shadow-xl p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-border pb-2.5">
              <div>
                <h3 className="font-bold text-sm text-foreground">Register New Operator</h3>
                <p className="text-[11px] text-muted-foreground">Add counter staff, cashier or manager</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsAddModalOpen(false)}
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-3">
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground block mb-1">
                  Operator Full Name *
                </label>
                <Input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-muted-foreground block mb-1">
                  Role Privileges *
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as StaffRole)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs font-medium shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
                >
                  <option value="CASHIER" className="bg-background text-foreground">STAFF / CASHIER (Fast POS Billing & Receipts)</option>
                  <option value="MANAGER" className="bg-background text-foreground">MANAGER (Approvals, Inward Stock & Cash Close)</option>
                  <option value="OWNER" className="bg-background text-foreground">STORE OWNER (Master Admin & Policy Access)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-muted-foreground block mb-1">
                  4-Digit Security PIN *
                </label>
                <Input
                  type="password"
                  required
                  maxLength={4}
                  placeholder="••••"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="text-sm text-center tracking-widest"
                />
                <span className="text-[10px] text-muted-foreground block mt-1">
                  Used to authorize actions and switch terminal cashier
                </span>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                >
                  Save Operator
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Change PIN Modal */}
      {isPinModalOpen && selectedStaffForPin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-background/80 backdrop-blur-xs animate-in fade-in duration-150">
          <Card className="w-full max-w-sm shadow-xl p-4 space-y-3">
            <div className="flex justify-between items-center border-b border-border pb-2">
              <h3 className="font-bold text-sm text-foreground">
                Change PIN: {selectedStaffForPin.name}
              </h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsPinModalOpen(false)}
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <form onSubmit={handleSavePin} className="space-y-3">
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground block mb-1">
                  Enter New 4-Digit PIN
                </label>
                <Input
                  type="password"
                  required
                  maxLength={4}
                  placeholder="••••"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  className="text-sm text-center tracking-widest"
                  autoFocus
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsPinModalOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                >
                  Update PIN
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};
