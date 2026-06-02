"use client";
import { useEffect, useState } from "react";
import {
  Link,
  useCustomer,
  useOrders,
  useCustomerActions,
  useCustomerAddresses,
  type CustomerAddress,
} from "@numueg/theme-sdk";
import {
  ArrowRight,
  LogOut,
  User,
  Loader2,
  MapPin,
  Package,
  Settings,
  Plus,
  Trash2,
  Home,
  Briefcase,
  X,
} from "lucide-react";
import { asString, type SectionRenderProps } from "./_shared";

/**
 * Neo-brutalism account / profile section.
 *
 * Faithful port of the shared V2 profile page re-plumbed on the V3 SDK, styled
 * with the neo-brutalism palette via the vn-* token block in theme.css.
 *
 * Data/actions are SDK-native:
 *  - useCustomer()         → identity (null ⇒ logged-out auth guard)
 *  - useOrders()           → order history (gated on the customer)
 *  - useCustomerAddresses()→ address book + CRUD mutations
 *  - useCustomerActions()  → logout + updateProfile + changePassword
 *
 * Never blank / never crashes: logged-out renders the auth guard; logged-in but
 * empty renders empty states (orders/addresses); loading shows spinners.
 */

type Tab = "orders" | "addresses" | "settings";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

const LABEL_ICON: Record<string, typeof Home> = { home: Home, work: Briefcase, other: MapPin };
const LABEL_NAME: Record<string, string> = { home: "Home", work: "Work", other: "Other" };

const EMPTY_ADDRESS: Partial<CustomerAddress> = {
  first_name: "",
  last_name: "",
  address_line1: "",
  city: "",
  country: "EG",
  label: "home",
};

export default function NBProfile({ instance }: SectionRenderProps) {
  const s = instance.settings ?? {};
  const title = asString(s.title) || "My account";
  const ordersTitle = asString(s.orders_title) || "My orders";
  const addressesTitle = asString(s.addresses_title) || "My addresses";
  const settingsTitle = asString(s.settings_title) || "Settings";
  const showStats = s.show_stats ?? true;

  const customer = useCustomer();
  const { orders, loading: loadingOrders } = useOrders();
  const {
    addresses,
    loading: loadingAddresses,
    addAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
  } = useCustomerAddresses();
  const { logout, updateProfile, changePassword } = useCustomerActions();

  const [activeTab, setActiveTab] = useState<Tab>("orders");

  // ── Settings form ───────────────────────────────────────────────
  const [firstName, setFirstName] = useState(customer?.first_name ?? "");
  const [lastName, setLastName] = useState(customer?.last_name ?? "");
  const [phone, setPhone] = useState(customer?.phone ?? "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [changingPw, setChangingPw] = useState(false);

  useEffect(() => {
    if (customer) {
      setFirstName(customer.first_name ?? "");
      setLastName(customer.last_name ?? "");
      setPhone(customer.phone ?? "");
    }
  }, [customer]);

  // ── Address form ─────────────────────────────────────────────────
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<CustomerAddress>>(EMPTY_ADDRESS);
  const [savingAddress, setSavingAddress] = useState(false);

  // ── Logged-out auth guard (matches V2) ──────────────────────────
  if (!customer) {
    return (
      <div className="bg-background">
        <div className="container mx-auto px-4 py-20 text-center">
          <div className="w-14 h-14 nb-img-frame flex items-center justify-center mx-auto mb-5 rounded-full bg-card">
            <User size={22} className="text-[var(--vn-muted)]" />
          </div>
          <p className="vn-heading text-lg text-[var(--vn-ink)] mb-1">
            Login to view your account
          </p>
          <p className="text-xs text-[var(--vn-muted)] mb-6">
            Track orders, manage addresses and settings
          </p>
          <Link
            to="/auth?redirect=/profile"
            className="vn-btn vn-btn-filled inline-flex"
          >
            Login
          </Link>
        </div>
      </div>
    );
  }

  const fullName =
    [customer.first_name, customer.last_name].filter(Boolean).join(" ") || customer.email;
  const initial = (customer.first_name?.[0] || customer.email?.[0] || "?").toUpperCase();
  const totalSpent = (customer.total_spent ?? 0) / 100;

  const openNewAddress = () => {
    setEditingId(null);
    setForm({
      ...EMPTY_ADDRESS,
      first_name: customer.first_name ?? "",
      last_name: customer.last_name ?? "",
    });
    setShowAddressForm(true);
  };

  const openEditAddress = (addr: CustomerAddress) => {
    setEditingId(addr.id);
    setForm({ ...addr });
    setShowAddressForm(true);
  };

  const closeAddressForm = () => {
    setShowAddressForm(false);
    setEditingId(null);
  };

  const handleSaveAddress = async () => {
    if (!form.first_name || !form.address_line1 || !form.city) return;
    setSavingAddress(true);
    try {
      const payload = {
        first_name: form.first_name,
        last_name: form.last_name ?? "",
        address_line1: form.address_line1,
        address_line2: form.address_line2 ?? null,
        city: form.city,
        state: form.state ?? null,
        postal_code: form.postal_code ?? null,
        country: form.country ?? "EG",
        phone: form.phone ?? null,
        label: form.label ?? "home",
      };
      if (editingId) {
        await updateAddress(editingId, payload);
      } else {
        await addAddress({ ...payload, is_default: addresses.length === 0 });
      }
      closeAddressForm();
      setForm(EMPTY_ADDRESS);
    } finally {
      setSavingAddress(false);
    }
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      await updateProfile({ first_name: firstName, last_name: lastName, phone: phone || undefined });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPw.length < 8) return;
    setChangingPw(true);
    try {
      await changePassword({ current_password: currentPw, new_password: newPw });
      setCurrentPw("");
      setNewPw("");
    } finally {
      setChangingPw(false);
    }
  };

  const tabs: { key: Tab; label: string; icon: typeof Package; count?: number }[] = [
    { key: "orders", label: "Orders", icon: Package, count: orders.length },
    { key: "addresses", label: "Addresses", icon: MapPin, count: addresses.length },
    { key: "settings", label: "Settings", icon: Settings },
  ];

  const inputClass =
    "w-full h-10 px-3 nb-input bg-card text-sm rounded-lg focus:outline-none transition-colors";
  const labelClass = "vn-label text-[10px] text-[var(--vn-muted)] block mb-1";
  const headingClass = "vn-heading text-xl text-[var(--vn-ink)] mb-5";

  return (
    <div className="bg-background" data-testid="storefront-profile">
      <div className="container mx-auto px-4 py-8 md:py-12">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 vn-label text-[10px] text-[var(--vn-muted)] mb-8">
          <Link to="/" className="hover:text-[var(--vn-ink)] transition-colors">
            Home
          </Link>
          <ArrowRight size={10} className="rtl:rotate-180" />
          <span className="text-[var(--vn-ink)]">{title}</span>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          {/* ═══ Sidebar ═══ */}
          <div className="lg:w-64 shrink-0">
            <div className="mb-6">
              <div className="w-12 h-12 rounded-full nb-img-frame bg-primary flex items-center justify-center text-[var(--vn-ink)] text-lg font-black mb-3">
                {initial}
              </div>
              <h1 className="vn-heading text-base text-[var(--vn-ink)]">{fullName}</h1>
              <p className="text-xs text-[var(--vn-muted)]">{customer.email}</p>
            </div>

            {showStats && (
              <div className="flex gap-4 mb-6 pb-6 border-b-[3px] border-[var(--vn-border)]">
                <div>
                  <p className="text-lg font-black text-[var(--vn-ink)]">{orders.length}</p>
                  <p className="text-[10px] text-[var(--vn-muted)]">Orders</p>
                </div>
                <div>
                  <p className="text-lg font-black text-[var(--vn-ink)]">
                    {totalSpent.toLocaleString("en-US")}
                  </p>
                  <p className="text-[10px] text-[var(--vn-muted)]">EGP</p>
                </div>
              </div>
            )}

            <nav className="space-y-1.5 mb-6">
              {tabs.map((item) => {
                const active = activeTab === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setActiveTab(item.key)}
                    className={
                      "w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-colors " +
                      (active
                        ? "text-[var(--vn-ink)] font-black nb-chip-active nb-chip"
                        : "text-[var(--vn-muted)] hover:text-[var(--vn-ink)]")
                    }
                  >
                    <item.icon size={15} />
                    <span className="flex-1 text-start">{item.label}</span>
                    {item.count !== undefined && (
                      <span className="text-[10px] text-[var(--vn-muted)]">{item.count}</span>
                    )}
                  </button>
                );
              })}
            </nav>

            <button
              type="button"
              onClick={() => logout()}
              className="flex items-center gap-2 px-3 py-2 text-xs text-[var(--vn-muted)] hover:text-[var(--vn-ink)] transition-colors"
            >
              <LogOut size={13} />
              Logout
            </button>
          </div>

          {/* ═══ Content ═══ */}
          <div className="flex-1 min-w-0">
            {/* ─── Orders ─── */}
            {activeTab === "orders" && (
              <div>
                <h2 className={headingClass}>{ordersTitle}</h2>
                {loadingOrders ? (
                  <div className="flex justify-center py-16">
                    <Loader2 className="h-5 w-5 animate-spin text-[var(--vn-muted)]" />
                  </div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-16 nb-card rounded-lg">
                    <div className="w-10 h-1 bg-[var(--vn-border)] mx-auto mb-5" />
                    <p className="text-sm text-[var(--vn-muted)] mb-1 font-black">No orders yet</p>
                    <p className="text-xs text-[var(--vn-muted)] mb-5">
                      Your orders will appear here after your first purchase
                    </p>
                    <Link
                      to="/products"
                      className="text-xs font-black border-b-2 border-[var(--vn-ink)] pb-0.5 hover:opacity-70 transition-opacity"
                    >
                      Browse products
                    </Link>
                  </div>
                ) : (
                  <div className="nb-card rounded-lg overflow-hidden">
                    {orders.map((order, i) => (
                      <div
                        key={order.id}
                        className={
                          "px-5 py-4 hover:bg-[var(--vn-band)]/60 transition-colors " +
                          (i > 0 ? "border-t-[3px] border-[var(--vn-border)]" : "")
                        }
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <span className="text-[13px] font-mono font-black text-[var(--vn-ink)] block" dir="ltr">
                              {order.order_number}
                            </span>
                            <span className="text-[11px] text-[var(--vn-muted)]">
                              {order.created_at
                                ? new Date(order.created_at).toLocaleDateString("en-US", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  })
                                : ""}
                              {order.item_count
                                ? ` · ${order.item_count} item${order.item_count > 1 ? "s" : ""}`
                                : ""}
                            </span>
                          </div>
                          <div className="text-end">
                            <span className="text-[13px] font-black text-[var(--vn-ink)] block">
                              {(order.total / 100).toLocaleString("en-US")} EGP
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded nb-badge-yellow">
                              {STATUS_LABELS[order.status] || order.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ─── Addresses ─── */}
            {activeTab === "addresses" && (
              <div>
                <div className="flex items-center justify-between mb-5">
                  <h2 className={headingClass + " mb-0"}>{addressesTitle}</h2>
                  {!showAddressForm && (
                    <button
                      type="button"
                      onClick={openNewAddress}
                      className="flex items-center gap-1.5 text-xs font-black text-[var(--vn-ink)] hover:opacity-70 transition-opacity"
                    >
                      <Plus size={13} />
                      Add address
                    </button>
                  )}
                </div>

                {showAddressForm && (
                  <div className="nb-card rounded-lg p-5 mb-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-black text-[var(--vn-ink)]">
                        {editingId ? "Edit address" : "New address"}
                      </h3>
                      <button
                        type="button"
                        onClick={closeAddressForm}
                        className="text-[var(--vn-muted)] hover:text-[var(--vn-ink)]"
                        aria-label="Close"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className={labelClass}>First name</label>
                        <input
                          value={form.first_name ?? ""}
                          onChange={(e) => setForm((p) => ({ ...p, first_name: e.target.value }))}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Last name</label>
                        <input
                          value={form.last_name ?? ""}
                          onChange={(e) => setForm((p) => ({ ...p, last_name: e.target.value }))}
                          className={inputClass}
                        />
                      </div>
                    </div>
                    <div className="mb-3">
                      <label className={labelClass}>Address</label>
                      <input
                        value={form.address_line1 ?? ""}
                        onChange={(e) => setForm((p) => ({ ...p, address_line1: e.target.value }))}
                        placeholder="Street, building, apt"
                        className={inputClass}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className={labelClass}>City</label>
                        <input
                          value={form.city ?? ""}
                          onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Phone</label>
                        <input
                          value={form.phone ?? ""}
                          onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                          placeholder="01xxxxxxxxx"
                          dir="ltr"
                          className={inputClass}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 mb-4">
                      {(["home", "work", "other"] as const).map((l) => {
                        const Icon = LABEL_ICON[l];
                        const active = form.label === l;
                        return (
                          <button
                            key={l}
                            type="button"
                            onClick={() => setForm((p) => ({ ...p, label: l }))}
                            className={
                              "flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors " +
                              (active ? "nb-chip-active nb-chip" : "nb-chip text-[var(--vn-muted)]")
                            }
                          >
                            <Icon size={12} />
                            {LABEL_NAME[l]}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleSaveAddress}
                        disabled={savingAddress}
                        className="vn-btn vn-btn-filled disabled:opacity-50"
                      >
                        {savingAddress ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : editingId ? (
                          "Update"
                        ) : (
                          "Save"
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={closeAddressForm}
                        className="px-5 py-2 text-xs text-[var(--vn-muted)] hover:text-[var(--vn-ink)] transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {loadingAddresses ? (
                  <div className="flex justify-center py-16">
                    <Loader2 className="h-5 w-5 animate-spin text-[var(--vn-muted)]" />
                  </div>
                ) : addresses.length === 0 && !showAddressForm ? (
                  <div className="text-center py-16 nb-card rounded-lg">
                    <div className="w-10 h-1 bg-[var(--vn-border)] mx-auto mb-5" />
                    <p className="text-sm text-[var(--vn-muted)] mb-1 font-black">No saved addresses</p>
                    <p className="text-xs text-[var(--vn-muted)] mb-5">
                      Add an address to speed up checkout
                    </p>
                    <button
                      type="button"
                      onClick={openNewAddress}
                      className="text-xs font-black border-b-2 border-[var(--vn-ink)] pb-0.5 hover:opacity-70 transition-opacity"
                    >
                      Add address
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {addresses.map((addr) => {
                      const LabelIcon = LABEL_ICON[addr.label ?? "other"] || MapPin;
                      return (
                        <div
                          key={addr.id}
                          className="nb-card rounded-lg p-4"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <LabelIcon size={13} className="text-[var(--vn-muted)]" />
                              <span className="text-xs font-black text-[var(--vn-ink)]">
                                {LABEL_NAME[addr.label ?? "other"] || "Other"}
                              </span>
                              {addr.is_default && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded nb-badge-yellow">
                                  Default
                                </span>
                              )}
                            </div>
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => openEditAddress(addr)}
                                className="text-[10px] text-[var(--vn-muted)] hover:text-[var(--vn-ink)] transition-colors px-1 font-black"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteAddress(addr.id)}
                                className="text-[var(--vn-muted)] hover:text-[var(--vn-sale)] transition-colors px-1"
                                aria-label="Delete address"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                          <p className="text-[13px] text-[var(--vn-ink)] mb-0.5 font-bold">
                            {[addr.first_name, addr.last_name].filter(Boolean).join(" ")}
                          </p>
                          <p className="text-xs text-[var(--vn-muted)]">{addr.address_line1}</p>
                          {addr.address_line2 && (
                            <p className="text-xs text-[var(--vn-muted)]">{addr.address_line2}</p>
                          )}
                          <p className="text-xs text-[var(--vn-muted)]">
                            {addr.city}
                            {addr.state ? `, ${addr.state}` : ""}
                          </p>
                          {addr.phone && (
                            <p className="text-xs text-[var(--vn-muted)] mt-1" dir="ltr">
                              {addr.phone}
                            </p>
                          )}
                          {!addr.is_default && (
                            <button
                              type="button"
                              onClick={() => setDefaultAddress(addr.id)}
                              className="text-[10px] text-[var(--vn-muted)] hover:text-[var(--vn-ink)] transition-colors mt-2 border-b border-current pb-px font-black"
                            >
                              Set as default
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ─── Settings ─── */}
            {activeTab === "settings" && (
              <div className="space-y-8">
                <div>
                  <h2 className={headingClass}>{settingsTitle}</h2>
                  <div className="nb-card rounded-lg p-5 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>First name</label>
                        <input
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Last name</label>
                        <input
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          className={inputClass}
                        />
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>Email</label>
                      <input
                        value={customer.email}
                        disabled
                        dir="ltr"
                        className={inputClass + " opacity-60 cursor-not-allowed"}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Phone</label>
                      <input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="01xxxxxxxxx"
                        dir="ltr"
                        className={inputClass}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleSaveProfile}
                      disabled={savingProfile}
                      className="vn-btn vn-btn-filled disabled:opacity-50"
                    >
                      {savingProfile ? <Loader2 size={14} className="animate-spin" /> : "Save changes"}
                    </button>
                  </div>
                </div>

                <div>
                  <h2 className={headingClass}>Change password</h2>
                  <div className="nb-card rounded-lg p-5 space-y-3">
                    <div>
                      <label className={labelClass}>Current password</label>
                      <input
                        type="password"
                        value={currentPw}
                        onChange={(e) => setCurrentPw(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>New password</label>
                      <input
                        type="password"
                        value={newPw}
                        onChange={(e) => setNewPw(e.target.value)}
                        placeholder="Min 8 characters"
                        className={inputClass}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleChangePassword}
                      disabled={changingPw || !currentPw || !newPw}
                      className="vn-btn vn-btn-filled disabled:opacity-50"
                    >
                      {changingPw ? <Loader2 size={14} className="animate-spin" /> : "Change password"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
