import React, { useState } from 'react';
import {
  KeyRound,
  Plus,
  Check,
  Lock,
  ShieldCheck,
  Trash2,
  UserCheck,
  Sparkles,
} from 'lucide-react';
import { StaffMember, StaffRole, StorePermissions, DEFAULT_STORE_PERMISSIONS } from '../types';
import { normalizeRole, ROLE_DEFINITIONS } from '../utils/permissions';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { ForgotPinRecoveryModal } from './ForgotPinRecoveryModal';
import { cn } from 'cn';

interface StaffManagementScreenProps {
  staffList: StaffMember[];
  activeStaffId: string;
  permissions?: StorePermissions;
  onSelectStaff: (staffId: string) => void;
  onAddStaff: (staff: Omit<StaffMember, 'id'>) => void;
  onUpdatePin: (staffId: string, newPin: string) => void;
  onDeleteStaff?: (staffId: string) => void;
  onUpdatePermissions?: (newPermissions: StorePermissions) => void;
}

export const StaffManagementScreen: React.FC<StaffManagementScreenProps> = ({
  staffList,
  activeStaffId,
  permissions = DEFAULT_STORE_PERMISSIONS,
  onSelectStaff,
  onAddStaff,
  onUpdatePin,
  onDeleteStaff,
  onUpdatePermissions,
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState<StaffRole>('CASHIER');
  const [pin, setPin] = useState('');

  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [selectedStaffForPin, setSelectedStaffForPin] = useState<StaffMember | null>(null);

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
      <div className="bg-muted/30 border-b border-border px-4 sm:px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
            Terminal Access & Cashier Management
          </span>
          <div className="flex items-center gap-2.5 mt-1">
            <h1 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
              {staffList.length} Registered Operators
            </h1>
            <Badge variant="outline" className="text-xs text-muted-foreground py-0.5">
              Active: <strong className="text-foreground ml-1">{activeStaff?.name}</strong>
            </Badge>
          </div>
        </div>

        <Button
          onClick={() => setIsAddModalOpen(true)}
          size="default"
          className="gap-2 shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <Plus className="size-4" />
          <span>Add New Staff</span>
        </Button>
      </div>

      {/* Main Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Active Session Indicator Card */}
          <Card className="border-border shadow-xs bg-card">
            <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <Avatar className="size-12 rounded-xl bg-primary text-primary-foreground font-bold text-lg ring-2 ring-primary/20 shadow-xs">
                  <AvatarFallback className="bg-primary text-primary-foreground text-base font-bold">
                    {activeStaff?.name?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-base text-foreground tracking-tight">
                      {activeStaff?.name}
                    </h2>
                    <Badge
                      variant="outline"
                      className="text-[10px] font-bold uppercase bg-primary/10 text-primary border-primary/20"
                    >
                      {normalizeRole(activeStaff?.role)}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Current active terminal operator • Bills, till collections, and drawer shifts are credited to this cashier
                  </p>
                </div>
              </div>

              <Badge
                variant="outline"
                className="gap-1.5 text-xs font-semibold text-primary bg-primary/10 border-primary/20 py-1.5 px-3 shrink-0"
              >
                <Check className="size-3.5" />
                <span>Terminal Session Active</span>
              </Badge>
            </CardContent>
          </Card>

        {/* Staff Roster Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xs text-foreground uppercase tracking-wider">
              Counter Staff & Cashiers
            </h3>
            <span className="text-xs text-muted-foreground">
              Tap "Switch To Operator" to change cashier session
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {staffList.map((staff) => {
              const isActive = staff.id === activeStaffId;
              const normRole = normalizeRole(staff.role);
              const meta = ROLE_DEFINITIONS[normRole];

              return (
                <Card
                  key={staff.id}
                  className={cn(
                    "flex flex-col justify-between transition-all shadow-xs",
                    isActive
                      ? "border-primary ring-2 ring-primary/20 bg-card"
                      : "hover:border-foreground/25"
                  )}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-10 rounded-lg shrink-0">
                          <AvatarFallback
                            className={cn(
                              "font-bold text-sm",
                              isActive
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            {staff.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-sm font-bold text-foreground">
                            {staff.name}
                          </CardTitle>
                          <Badge
                            variant="secondary"
                            className="text-[9px] px-1.5 py-0.5 font-bold uppercase inline-block mt-0.5"
                          >
                            {meta.label}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-center gap-0.5">
                        {onDeleteStaff && normRole !== 'OWNER' && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to remove operator "${staff.name}"?`)) {
                                onDeleteStaff(staff.id);
                              }
                            }}
                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                            title={`Delete ${staff.name}`}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => {
                            setSelectedStaffForPin(staff);
                            setIsPinModalOpen(true);
                          }}
                          className="text-muted-foreground hover:text-foreground cursor-pointer"
                          title="Change 4-digit PIN"
                        >
                          <KeyRound className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="py-1">
                    <CardDescription className="text-xs text-muted-foreground line-clamp-2">
                      {meta.description}
                    </CardDescription>
                  </CardContent>

                  <CardFooter className="pt-3 border-t border-border flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                      <Lock className="size-3 text-muted-foreground/70" />
                      <span>PIN: ••••</span>
                    </div>

                    {isActive ? (
                      <Badge
                        variant="outline"
                        className="text-xs font-semibold text-primary bg-primary/10 border-primary/20 py-0.5 px-2.5"
                      >
                        Active Cashier
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => onSelectStaff(staff.id)}
                        className="text-xs h-7 px-3 cursor-pointer"
                      >
                        Switch To Operator
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              );
            })}

            {/* Quick Add Operator Card */}
            <Card
              onClick={() => setIsAddModalOpen(true)}
              className="border-dashed border-2 border-border/80 hover:border-primary/50 hover:bg-muted/30 transition-all cursor-pointer flex flex-col items-center justify-center p-6 text-center min-h-[160px] group"
            >
              <div className="size-10 rounded-lg bg-muted group-hover:bg-primary/10 text-muted-foreground group-hover:text-primary flex items-center justify-center transition-colors mb-2">
                <Plus className="size-5" />
              </div>
              <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                Add New Operator
              </span>
              <span className="text-[11px] text-muted-foreground mt-0.5">
                Register cashier or store manager
              </span>
            </Card>
          </div>
        </div>

        {/* Operational Permission Policies */}
        <Card className="shadow-xs">
          <CardHeader className="border-b border-border pb-3.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <ShieldCheck className="size-5" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-foreground">
                    Operational Security & Access Policies
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    Control when billing staff require Manager/Owner PIN authorization
                  </CardDescription>
                </div>
              </div>
              <Badge
                variant="outline"
                className="text-[10px] font-bold text-primary bg-primary/10 border-primary/20 shrink-0"
              >
                Owner Privileged
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {/* Policy 1 */}
            <div className="p-4 flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label htmlFor="policy-khata" className="text-xs font-semibold text-foreground cursor-pointer">
                  1. Allow Cashier to Sell on Khata (Udhar) without PIN
                </Label>
                <p className="text-xs text-muted-foreground">
                  When disabled, counter staff must enter a Manager PIN to complete credit transactions.
                </p>
              </div>
              <Switch
                id="policy-khata"
                checked={permissions.staff.allowKhata}
                onCheckedChange={() => handleTogglePermission('staff', 'allowKhata')}
              />
            </div>

            <Separator />

            {/* Policy 2 */}
            <div className="p-4 flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label htmlFor="policy-price" className="text-xs font-semibold text-foreground cursor-pointer">
                  2. Allow Cashier to Modify Prices / Apply Manual Discounts
                </Label>
                <p className="text-xs text-muted-foreground">
                  When disabled, changing item unit rates or adding discounts on the fly requires Manager authorization.
                </p>
              </div>
              <Switch
                id="policy-price"
                checked={permissions.staff.allowPriceOverride}
                onCheckedChange={() => handleTogglePermission('staff', 'allowPriceOverride')}
              />
            </div>

            <Separator />

            {/* Policy 3 */}
            <div className="p-4 flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label htmlFor="policy-inward" className="text-xs font-semibold text-foreground cursor-pointer">
                  3. Allow Staff to Receive Inward Supplier Stock
                </Label>
                <p className="text-xs text-muted-foreground">
                  Allows cashiers and store assistants to enter supplier purchase invoices and replenish catalog stock.
                </p>
              </div>
              <Switch
                id="policy-inward"
                checked={permissions.staff.allowStockInward}
                onCheckedChange={() => handleTogglePermission('staff', 'allowStockInward')}
              />
            </div>

            <Separator />

            {/* Policy 4 */}
            <div className="p-4 flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label htmlFor="policy-cost" className="text-xs font-semibold text-foreground cursor-pointer">
                  4. Allow Manager to View Buying Rates & Profit Margins
                </Label>
                <p className="text-xs text-muted-foreground">
                  Displays wholesale cost rates and gross margin percentages to store managers in inventory reports.
                </p>
              </div>
              <Switch
                id="policy-cost"
                checked={permissions.manager.viewCostPrice}
                onCheckedChange={() => handleTogglePermission('manager', 'viewCostPrice')}
              />
            </div>

            <Separator />

            {/* Policy 5 */}
            <div className="p-4 flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label htmlFor="policy-void" className="text-xs font-semibold text-foreground cursor-pointer">
                  5. Allow Manager to Cancel / Void Settled Bills
                </Label>
                <p className="text-xs text-muted-foreground">
                  Allows store managers to void completed customer transactions without requiring the Owner PIN.
                </p>
              </div>
              <Switch
                id="policy-void"
                checked={permissions.manager.allowBillVoid}
                onCheckedChange={() => handleTogglePermission('manager', 'allowBillVoid')}
              />
            </div>
          </CardContent>
        </Card>
        </div>
      </div>

      {/* Add Staff Dialog */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Register New Operator</DialogTitle>
            <DialogDescription>
              Add counter staff, cashier or manager with dedicated access PIN.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateStaff} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="staff-name">Operator Full Name *</Label>
              <Input
                id="staff-name"
                type="text"
                required
                placeholder="e.g. Ramesh Kumar"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label>Role Privileges *</Label>
              <div className="grid grid-cols-1 gap-2">
                {(['CASHIER', 'MANAGER', 'OWNER'] as StaffRole[]).map((r) => {
                  const def = ROLE_DEFINITIONS[r];
                  const isSelected = role === r;
                  return (
                    <div
                      key={r}
                      onClick={() => setRole(r)}
                      className={cn(
                        "flex items-start gap-3 p-2.5 border text-left cursor-pointer transition-all",
                        isSelected
                          ? "border-primary bg-primary/5 ring-1 ring-primary/40"
                          : "border-border hover:border-foreground/20 bg-background"
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-foreground">{def.label}</span>
                          {r === 'OWNER' && (
                            <Badge variant="outline" className="text-[9px] py-0 px-1 border-destructive text-destructive">
                              Master
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                          {def.description}
                        </p>
                      </div>
                      {isSelected && <Check className="size-4 text-primary shrink-0 mt-0.5" />}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="staff-pin">4-Digit Security PIN *</Label>
              <Input
                id="staff-pin"
                type="password"
                required
                maxLength={4}
                placeholder="••••"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                className="text-center font-mono text-base tracking-[0.4em]"
              />
              <span className="text-[11px] text-muted-foreground block">
                Used to authorize actions and switch terminal cashier
              </span>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddModalOpen(false)}
                className="cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!name.trim() || pin.length < 4}
                className="cursor-pointer"
              >
                Save Operator
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Change PIN Modal */}
      <ForgotPinRecoveryModal
        isOpen={isPinModalOpen && Boolean(selectedStaffForPin)}
        onClose={() => {
          setIsPinModalOpen(false);
          setSelectedStaffForPin(null);
        }}
        staffList={staffList}
        targetStaffId={selectedStaffForPin?.id}
        onPinReset={(staffId, newPinVal) => {
          onUpdatePin(staffId, newPinVal);
        }}
      />
    </div>
  );
};
