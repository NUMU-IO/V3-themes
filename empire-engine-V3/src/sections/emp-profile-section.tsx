"use client";

import { useEffect, useState } from "react";
import {
  Link,
  useCustomer,
  useOrders,
  useCustomerActions,
  useCustomerAddresses,
  useLocale,
  useResolvedSettings,
  type CustomerAddress,
} from "@numueg/theme-sdk";
import {
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
import { asString, localized, type SectionRenderProps } from "./_shared";

/**
 * emp-profile-section — Empire account / profile dashboard.
 *
 * Ported from the proven luxury-minimal V3 profile section (sidebar with avatar
 * + stats + Orders/Addresses/Settings nav + logout; content area with the three
 * tabs — order history, address book CRUD, profile + password forms; logged-out
 * auth guard) and re-skinned to Empire's V2 identity: off-white page, white
 * rounded cards, black ink + `font-black uppercase` display headings, black
 * pill buttons, electric-blue (#0099FF) accent.
 *
 * Data/actions are SDK-native (useCustomer / useOrders / useCustomerAddresses /
 * useCustomerActions). Never blank / never crashes: logged-out → auth guard,
 * logged-in but empty → empty states, loading → spinners. Settings come from
 * useResolvedSettings(instance) like every other Empire section.
 */

type Tab = "orders" | "addresses" | "settings";

const statusLabels = (locale: string): Record<string, string> => ({
  pending: localized(locale, "Pending", "قيد الانتظار"),
  confirmed: localized(locale, "Confirmed", "مؤكد"),
  processing: localized(locale, "Processing", "قيد التجهيز"),
  shipped: localized(locale, "Shipped", "تم الشحن"),
  delivered: localized(locale, "Delivered", "تم التوصيل"),
  cancelled: localized(locale, "Cancelled", "ملغي"),
  refunded: localized(locale, "Refunded", "مسترد"),
});

const LABEL_ICON: Record<string, typeof Home> = { home: Home, work: Briefcase, other: MapPin };
const labelName = (locale: string): Record<string, string> => ({
  home: localized(locale, "Home", "المنزل"),
  work: localized(locale, "Work", "العمل"),
  other: localized(locale, "Other", "آخر"),
});

const EMPTY_ADDRESS: Partial<CustomerAddress> = {
  first_name: "",
  last_name: "",
  address_line1: "",
  city: "",
  country: "EG",
  label: "home",
};

// Empire input styling — Empire has NO `emp-input` class, so mirror the
// emp-cart / emp-search-results inputs: white field, hairline ink border,
// rounded, electric-blue focus ring.
const inputClass =
  "w-full h-11 px-4 rounded-lg bg-white border border-[hsl(var(--foreground))]/15 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--emp-blue))] focus:border-[hsl(var(--emp-blue))] transition-colors";
const labelClass = "emp-label block mb-1.5";

export default function EmpProfileSection({ instance, sectionId }: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const locale = useLocale();
  const STATUS_LABELS = statusLabels(locale);
  const LABEL_NAME = labelName(locale);
  const title = asString(s.title) || localized(locale, "My Account", "حسابي");
  const ordersTitle = asString(s.orders_title) || localized(locale, "My Orders", "طلباتي");
  const addressesTitle = asString(s.addresses_title) || localized(locale, "My Addresses", "عناويني");
  const settingsTitle = asString(s.settings_title) || localized(locale, "Settings", "الإعدادات");
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

  // ── Logged-out auth guard ────────────────────────────────────────
  if (!customer) {
    return (
      <section
        className="min-h-[70vh] bg-[hsl(var(--background))] flex items-center justify-center"
        data-emp-section={sectionId}
        data-testid="storefront-profile"
      >
        <div className="text-center px-6 py-16">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[hsl(var(--emp-blue))]/15 flex items-center justify-center">
            <User size={26} className="text-[hsl(var(--emp-blue))]" aria-hidden="true" />
          </div>
          <h1 className="font-black uppercase tracking-tight text-3xl md:text-4xl text-[hsl(var(--foreground))] mb-3">
            {localized(locale, "Sign in to view your account", "سجّل الدخول لعرض حسابك")}
          </h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mb-8 max-w-sm mx-auto">
            {localized(locale, "Track orders and manage addresses and settings", "تتبع الطلبات وإدارة العناوين والإعدادات")}
          </p>
          <Link
            to="/auth?redirect=/profile"
            className="inline-flex items-center justify-center px-8 py-3.5 bg-black text-white text-xs font-semibold uppercase tracking-wider rounded-full hover:bg-black/90 transition-colors"
          >
            {localized(locale, "Sign in", "تسجيل الدخول")}
          </Link>
        </div>
      </section>
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
    { key: "orders", label: localized(locale, "Orders", "الطلبات"), icon: Package, count: orders.length },
    { key: "addresses", label: localized(locale, "Addresses", "العناوين"), icon: MapPin, count: addresses.length },
    { key: "settings", label: localized(locale, "Settings", "الإعدادات"), icon: Settings },
  ];

  const headingClass = "font-black uppercase tracking-tight text-2xl md:text-3xl text-[hsl(var(--foreground))] mb-6";

  return (
    <section
      className="min-h-[70vh] bg-[hsl(var(--background))]"
      data-emp-section={sectionId}
      data-testid="storefront-profile"
    >
      <div className="container mx-auto px-4 py-8 md:py-12">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 emp-label mb-8">
          <Link to="/" className="hover:text-[hsl(var(--emp-blue))] transition-colors">
            {localized(locale, "Home", "الرئيسية")}
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-[hsl(var(--foreground))]">{title}</span>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          {/* ═══ Sidebar ═══ */}
          <div className="lg:w-64 shrink-0">
            <div className="rounded-2xl bg-white p-6 border border-[hsl(var(--foreground))]/10 mb-5">
              <div className="w-14 h-14 rounded-full bg-[hsl(var(--emp-blue))] flex items-center justify-center text-[#ffffff] text-xl font-bold mb-3">
                {initial}
              </div>
              <h1 className="font-black uppercase tracking-tight text-lg text-[hsl(var(--foreground))] truncate">{fullName}</h1>
              <p className="text-xs text-[hsl(var(--muted-foreground))] truncate" dir="ltr">{customer.email}</p>

              {showStats && (
                <div className="flex gap-6 mt-5 pt-5 border-t border-[hsl(var(--foreground))]/10">
                  <div>
                    <p className="font-black uppercase tracking-tight text-2xl text-[hsl(var(--foreground))]">{orders.length}</p>
                    <p className="emp-label">{localized(locale, "Orders", "طلبات")}</p>
                  </div>
                  <div>
                    <p className="font-black uppercase tracking-tight text-2xl text-[hsl(var(--foreground))]">
                      {totalSpent.toLocaleString("en-US")}
                    </p>
                    <p className="emp-label">{localized(locale, "EGP", "ج.م")}</p>
                  </div>
                </div>
              )}
            </div>

            <nav className="space-y-1 mb-5">
              {tabs.map((item) => {
                const active = activeTab === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setActiveTab(item.key)}
                    className={
                      "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors " +
                      (active
                        ? "bg-[hsl(var(--foreground))] text-[#ffffff] font-semibold"
                        : "text-[hsl(var(--foreground))]/70 hover:bg-white hover:text-[hsl(var(--foreground))]")
                    }
                  >
                    <item.icon size={16} aria-hidden="true" />
                    <span className="flex-1 text-start">{item.label}</span>
                    {item.count !== undefined && (
                      <span
                        className={
                          "text-[10px] font-bold " +
                          (active ? "text-[#ffffff]/70" : "text-[hsl(var(--muted-foreground))]")
                        }
                      >
                        {item.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            <button
              type="button"
              onClick={() => logout()}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-[0.06em] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
            >
              <LogOut size={14} aria-hidden="true" />
              {localized(locale, "Sign out", "تسجيل الخروج")}
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
                    <Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--emp-blue))]" aria-hidden="true" />
                  </div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-16 rounded-2xl bg-white border border-[hsl(var(--foreground))]/10">
                    <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-[hsl(var(--emp-blue))]/15 flex items-center justify-center">
                      <Package size={22} className="text-[hsl(var(--emp-blue))]" aria-hidden="true" />
                    </div>
                    <p className="font-black uppercase tracking-tight text-lg text-[hsl(var(--foreground))] mb-1">{localized(locale, "No orders yet", "لا توجد طلبات بعد")}</p>
                    <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6 max-w-xs mx-auto">
                      {localized(locale, "Your orders will appear here after your first purchase", "ستظهر طلباتك هنا بعد أول عملية شراء")}
                    </p>
                    <Link to="/products" className="inline-flex items-center justify-center px-8 py-3.5 bg-black text-white text-xs font-semibold uppercase tracking-wider rounded-full hover:bg-black/90 transition-colors">
                      {localized(locale, "Browse products", "تصفح المنتجات")}
                    </Link>
                  </div>
                ) : (
                  <div className="rounded-2xl bg-white border border-[hsl(var(--foreground))]/10 overflow-hidden">
                    {orders.map((order, i) => (
                      <div
                        key={order.id}
                        className={
                          "px-5 py-4 hover:bg-[hsl(var(--background))]/60 transition-colors " +
                          (i > 0 ? "border-t border-[hsl(var(--foreground))]/10" : "")
                        }
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <span className="emp-mono font-medium text-[hsl(var(--foreground))] block" dir="ltr">
                              {order.order_number}
                            </span>
                            <span className="text-xs text-[hsl(var(--muted-foreground))]">
                              {order.created_at
                                ? new Date(order.created_at).toLocaleDateString("en-US", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  })
                                : ""}
                              {order.item_count
                                ? ` · ${order.item_count} ${localized(locale, "items", "منتج")}`
                                : ""}
                            </span>
                          </div>
                          <div className="text-end">
                            <span className="font-black uppercase tracking-tight text-base text-[hsl(var(--foreground))] block">
                              {(order.total / 100).toLocaleString("en-US")} {localized(locale, "EGP", "ج.م")}
                            </span>
                            <span className="inline-block mt-1 text-[10px] font-semibold uppercase tracking-[0.06em] px-2 py-0.5 rounded-full bg-[hsl(var(--emp-blue))]/15 text-[hsl(var(--emp-blue))]">
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
                <div className="flex items-center justify-between mb-6">
                  <h2 className={headingClass + " mb-0"}>{addressesTitle}</h2>
                  {!showAddressForm && (
                    <button
                      type="button"
                      onClick={openNewAddress}
                      className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.06em] text-[hsl(var(--emp-blue))] hover:text-[hsl(var(--emp-blue))] transition-colors"
                    >
                      <Plus size={14} aria-hidden="true" />
                      {localized(locale, "Add address", "إضافة عنوان")}
                    </button>
                  )}
                </div>

                {showAddressForm && (
                  <div className="rounded-2xl bg-white border border-[hsl(var(--foreground))]/10 p-5 mb-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-black uppercase tracking-tight text-base text-[hsl(var(--foreground))]">
                        {editingId ? localized(locale, "Edit address", "تعديل العنوان") : localized(locale, "New address", "عنوان جديد")}
                      </h3>
                      <button
                        type="button"
                        onClick={closeAddressForm}
                        className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
                        aria-label={localized(locale, "Close", "إغلاق")}
                      >
                        <X size={18} aria-hidden="true" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className={labelClass}>{localized(locale, "First name", "الاسم الأول")}</label>
                        <input
                          value={form.first_name ?? ""}
                          onChange={(e) => setForm((p) => ({ ...p, first_name: e.target.value }))}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>{localized(locale, "Last name", "اسم العائلة")}</label>
                        <input
                          value={form.last_name ?? ""}
                          onChange={(e) => setForm((p) => ({ ...p, last_name: e.target.value }))}
                          className={inputClass}
                        />
                      </div>
                    </div>
                    <div className="mb-3">
                      <label className={labelClass}>{localized(locale, "Address", "العنوان")}</label>
                      <input
                        value={form.address_line1 ?? ""}
                        onChange={(e) => setForm((p) => ({ ...p, address_line1: e.target.value }))}
                        placeholder={localized(locale, "Street, building, apartment", "الشارع، المبنى، الشقة")}
                        className={inputClass}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className={labelClass}>{localized(locale, "City", "المدينة")}</label>
                        <input
                          value={form.city ?? ""}
                          onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>{localized(locale, "Phone", "الهاتف")}</label>
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
                              "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-[0.06em] border transition-colors " +
                              (active
                                ? "border-[hsl(var(--foreground))] bg-[hsl(var(--foreground))] text-[#ffffff]"
                                : "border-[hsl(var(--foreground))]/15 text-[hsl(var(--foreground))]/70 hover:border-[hsl(var(--foreground))]")
                            }
                          >
                            <Icon size={13} aria-hidden="true" />
                            {LABEL_NAME[l]}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex gap-3 items-center">
                      <button
                        type="button"
                        onClick={handleSaveAddress}
                        disabled={savingAddress}
                        className="inline-flex items-center justify-center px-8 py-3 bg-black text-white text-xs font-semibold uppercase tracking-wider rounded-full hover:bg-black/90 transition-colors disabled:opacity-50"
                      >
                        {savingAddress ? (
                          <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                        ) : editingId ? (
                          localized(locale, "Update", "تحديث")
                        ) : (
                          localized(locale, "Save", "حفظ")
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={closeAddressForm}
                        className="text-xs font-semibold uppercase tracking-[0.06em] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
                      >
                        {localized(locale, "Cancel", "إلغاء")}
                      </button>
                    </div>
                  </div>
                )}

                {loadingAddresses ? (
                  <div className="flex justify-center py-16">
                    <Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--emp-blue))]" aria-hidden="true" />
                  </div>
                ) : addresses.length === 0 && !showAddressForm ? (
                  <div className="text-center py-16 rounded-2xl bg-white border border-[hsl(var(--foreground))]/10">
                    <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-[hsl(var(--emp-blue))]/15 flex items-center justify-center">
                      <MapPin size={22} className="text-[hsl(var(--emp-blue))]" aria-hidden="true" />
                    </div>
                    <p className="font-black uppercase tracking-tight text-lg text-[hsl(var(--foreground))] mb-1">{localized(locale, "No saved addresses", "لا توجد عناوين محفوظة")}</p>
                    <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6 max-w-xs mx-auto">
                      {localized(locale, "Add an address to speed up checkout", "أضف عنواناً لتسريع عملية الدفع")}
                    </p>
                    <button
                      type="button"
                      onClick={openNewAddress}
                      className="inline-flex items-center justify-center px-8 py-3.5 bg-black text-white text-xs font-semibold uppercase tracking-wider rounded-full hover:bg-black/90 transition-colors"
                    >
                      {localized(locale, "Add address", "إضافة عنوان")}
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {addresses.map((addr) => {
                      const LabelIcon = LABEL_ICON[addr.label ?? "other"] || MapPin;
                      return (
                        <div
                          key={addr.id}
                          className={
                            "rounded-2xl bg-white p-5 transition-colors border " +
                            (addr.is_default ? "border-[hsl(var(--emp-blue))]" : "border-[hsl(var(--foreground))]/10")
                          }
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <LabelIcon size={14} className="text-[hsl(var(--emp-blue))]" aria-hidden="true" />
                              <span className="text-xs font-semibold uppercase tracking-[0.06em] text-[hsl(var(--foreground))]">
                                {LABEL_NAME[addr.label ?? "other"] || localized(locale, "Other", "آخر")}
                              </span>
                              {addr.is_default && (
                                <span className="text-[9px] font-semibold uppercase tracking-[0.06em] px-2 py-0.5 rounded-full bg-[hsl(var(--emp-blue))]/15 text-[hsl(var(--emp-blue))]">
                                  {localized(locale, "Default", "افتراضي")}
                                </span>
                              )}
                            </div>
                            <div className="flex gap-2 items-center">
                              <button
                                type="button"
                                onClick={() => openEditAddress(addr)}
                                className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
                              >
                                {localized(locale, "Edit", "تعديل")}
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteAddress(addr.id)}
                                className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
                                aria-label={localized(locale, "Delete address", "حذف العنوان")}
                              >
                                <Trash2 size={13} aria-hidden="true" />
                              </button>
                            </div>
                          </div>
                          <p className="text-sm font-medium text-[hsl(var(--foreground))] mb-0.5">
                            {[addr.first_name, addr.last_name].filter(Boolean).join(" ")}
                          </p>
                          <p className="text-xs text-[hsl(var(--muted-foreground))]">{addr.address_line1}</p>
                          {addr.address_line2 && (
                            <p className="text-xs text-[hsl(var(--muted-foreground))]">{addr.address_line2}</p>
                          )}
                          <p className="text-xs text-[hsl(var(--muted-foreground))]">
                            {addr.city}
                            {addr.state ? `, ${addr.state}` : ""}
                          </p>
                          {addr.phone && (
                            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1" dir="ltr">
                              {addr.phone}
                            </p>
                          )}
                          {!addr.is_default && (
                            <button
                              type="button"
                              onClick={() => setDefaultAddress(addr.id)}
                              className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[hsl(var(--emp-blue))] hover:text-[hsl(var(--emp-blue))] transition-colors mt-3"
                            >
                              {localized(locale, "Set as default", "تعيين كافتراضي")}
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
                  <div className="rounded-2xl bg-white border border-[hsl(var(--foreground))]/10 p-5 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>{localized(locale, "First name", "الاسم الأول")}</label>
                        <input
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>{localized(locale, "Last name", "اسم العائلة")}</label>
                        <input
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          className={inputClass}
                        />
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>{localized(locale, "Email", "البريد الإلكتروني")}</label>
                      <input
                        value={customer.email}
                        disabled
                        dir="ltr"
                        className={inputClass + " opacity-60 cursor-not-allowed"}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>{localized(locale, "Phone", "الهاتف")}</label>
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
                      className="inline-flex items-center justify-center px-8 py-3 bg-black text-white text-xs font-semibold uppercase tracking-wider rounded-full hover:bg-black/90 transition-colors disabled:opacity-50"
                    >
                      {savingProfile ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : localized(locale, "Save changes", "حفظ التغييرات")}
                    </button>
                  </div>
                </div>

                <div>
                  <h2 className={headingClass}>{localized(locale, "Change password", "تغيير كلمة المرور")}</h2>
                  <div className="rounded-2xl bg-white border border-[hsl(var(--foreground))]/10 p-5 space-y-3">
                    <div>
                      <label className={labelClass}>{localized(locale, "Current password", "كلمة المرور الحالية")}</label>
                      <input
                        type="password"
                        value={currentPw}
                        onChange={(e) => setCurrentPw(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>{localized(locale, "New password", "كلمة المرور الجديدة")}</label>
                      <input
                        type="password"
                        value={newPw}
                        onChange={(e) => setNewPw(e.target.value)}
                        placeholder={localized(locale, "Min 8 characters", "8 أحرف على الأقل")}
                        className={inputClass}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleChangePassword}
                      disabled={changingPw || !currentPw || !newPw}
                      className="inline-flex items-center justify-center px-8 py-3 bg-black text-white text-xs font-semibold uppercase tracking-wider rounded-full hover:bg-black/90 transition-colors disabled:opacity-50"
                    >
                      {changingPw ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : localized(locale, "Change password", "تغيير كلمة المرور")}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
