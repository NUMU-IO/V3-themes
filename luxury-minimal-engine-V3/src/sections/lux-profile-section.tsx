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
 * Luxury Minimal account / profile section.
 *
 * Ported from the proven Vionne V3 profile section (sidebar with avatar +
 * stats + Orders/Addresses/Settings nav + logout; content area with the three
 * tabs — order history, address book CRUD, profile + password forms; logged-out
 * auth guard) and re-skinned to luxury-minimal: sharp edges, uppercase tracked
 * headings, `lux-input` / `lux-btn` controls, hairline borders.
 *
 * Data/actions are SDK-native (useCustomer / useOrders / useCustomerAddresses /
 * useCustomerActions). Never blank / never crashes: logged-out → auth guard,
 * logged-in but empty → empty states, loading → spinners.
 */

type Tab = "orders" | "addresses" | "settings";

const STATUS_LABELS: Record<string, string> = {
  pending: "قيد الانتظار",
  confirmed: "مؤكد",
  processing: "قيد التجهيز",
  shipped: "تم الشحن",
  delivered: "تم التوصيل",
  cancelled: "ملغي",
  refunded: "مسترد",
};

const LABEL_ICON: Record<string, typeof Home> = { home: Home, work: Briefcase, other: MapPin };
const LABEL_NAME: Record<string, string> = { home: "المنزل", work: "العمل", other: "آخر" };

const EMPTY_ADDRESS: Partial<CustomerAddress> = {
  first_name: "",
  last_name: "",
  address_line1: "",
  city: "",
  country: "EG",
  label: "home",
};

export default function LuxProfileSection({ instance }: SectionRenderProps) {
  const s = instance.settings ?? {};
  const title = asString(s.title) || "حسابي";
  const ordersTitle = asString(s.orders_title) || "طلباتي";
  const addressesTitle = asString(s.addresses_title) || "عناويني";
  const settingsTitle = asString(s.settings_title) || "الإعدادات";
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
      <div className="bg-background">
        <div className="container mx-auto px-4 py-20 text-center">
          <div className="w-14 h-14 border border-border flex items-center justify-center mx-auto mb-5">
            <User size={22} className="text-muted-foreground" />
          </div>
          <p className="lux-heading text-lg text-foreground mb-1">سجّل الدخول لعرض حسابك</p>
          <p className="text-xs text-muted-foreground mb-6">
            تتبع الطلبات وإدارة العناوين والإعدادات
          </p>
          <Link to="/auth?redirect=/profile" className="lux-btn inline-flex">
            تسجيل الدخول
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
    { key: "orders", label: "الطلبات", icon: Package, count: orders.length },
    { key: "addresses", label: "العناوين", icon: MapPin, count: addresses.length },
    { key: "settings", label: "الإعدادات", icon: Settings },
  ];

  const inputClass = "w-full h-10 px-3 text-sm lux-input";
  const labelClass = "text-[10px] uppercase tracking-[0.2em] text-muted-foreground block mb-1";
  const headingClass = "text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-5";

  return (
    <div className="bg-background" data-testid="storefront-profile">
      <div className="container mx-auto px-4 py-8 md:py-12">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-8">
          <Link to="/" className="hover:text-foreground transition-colors">
            الرئيسية
          </Link>
          <span>/</span>
          <span className="text-foreground">{title}</span>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          {/* ═══ Sidebar ═══ */}
          <div className="lg:w-64 shrink-0">
            <div className="mb-6">
              <div className="w-12 h-12 bg-[hsl(var(--lux-gray))] flex items-center justify-center text-foreground text-lg font-medium mb-3">
                {initial}
              </div>
              <h1 className="lux-heading text-base text-foreground">{fullName}</h1>
              <p className="text-xs text-muted-foreground" dir="ltr">{customer.email}</p>
            </div>

            {showStats && (
              <div className="flex gap-4 mb-6 pb-6 border-b border-border">
                <div>
                  <p className="text-lg font-medium text-foreground">{orders.length}</p>
                  <p className="text-[10px] text-muted-foreground">طلبات</p>
                </div>
                <div>
                  <p className="text-lg font-medium text-foreground">
                    {totalSpent.toLocaleString("en-US")}
                  </p>
                  <p className="text-[10px] text-muted-foreground">ج.م</p>
                </div>
              </div>
            )}

            <nav className="space-y-0.5 mb-6">
              {tabs.map((item) => {
                const active = activeTab === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setActiveTab(item.key)}
                    className={
                      "w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors " +
                      (active
                        ? "text-foreground font-medium bg-[hsl(var(--lux-gray))]"
                        : "text-muted-foreground hover:text-foreground")
                    }
                  >
                    <item.icon size={15} />
                    <span className="flex-1 text-start">{item.label}</span>
                    {item.count !== undefined && (
                      <span className="text-[10px] text-muted-foreground">{item.count}</span>
                    )}
                  </button>
                );
              })}
            </nav>

            <button
              type="button"
              onClick={() => logout()}
              className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <LogOut size={13} />
              تسجيل الخروج
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
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-16 border border-border">
                    <div className="w-10 h-px bg-border mx-auto mb-5" />
                    <p className="text-sm text-muted-foreground mb-1">لا توجد طلبات بعد</p>
                    <p className="text-xs text-muted-foreground mb-5">
                      ستظهر طلباتك هنا بعد أول عملية شراء
                    </p>
                    <Link
                      to="/products"
                      className="text-xs font-medium border-b border-foreground pb-0.5 hover:opacity-70 transition-opacity"
                    >
                      تصفح المنتجات
                    </Link>
                  </div>
                ) : (
                  <div className="border border-border overflow-hidden">
                    {orders.map((order, i) => (
                      <div
                        key={order.id}
                        className={
                          "px-5 py-4 hover:bg-[hsl(var(--lux-gray))]/60 transition-colors " +
                          (i > 0 ? "border-t border-border" : "")
                        }
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <span className="text-[13px] font-mono font-medium text-foreground block" dir="ltr">
                              {order.order_number}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {order.created_at
                                ? new Date(order.created_at).toLocaleDateString("en-US", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  })
                                : ""}
                              {order.item_count
                                ? ` · ${order.item_count} منتج`
                                : ""}
                            </span>
                          </div>
                          <div className="text-end">
                            <span className="text-[13px] font-medium text-foreground block">
                              {(order.total / 100).toLocaleString("en-US")} ج.م
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 bg-[hsl(var(--lux-gray))] text-foreground/70">
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
                      className="flex items-center gap-1.5 text-xs font-medium text-foreground hover:opacity-70 transition-opacity"
                    >
                      <Plus size={13} />
                      إضافة عنوان
                    </button>
                  )}
                </div>

                {showAddressForm && (
                  <div className="border border-border p-5 mb-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-medium text-foreground">
                        {editingId ? "تعديل العنوان" : "عنوان جديد"}
                      </h3>
                      <button
                        type="button"
                        onClick={closeAddressForm}
                        className="text-muted-foreground hover:text-foreground"
                        aria-label="Close"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className={labelClass}>الاسم الأول</label>
                        <input
                          value={form.first_name ?? ""}
                          onChange={(e) => setForm((p) => ({ ...p, first_name: e.target.value }))}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>اسم العائلة</label>
                        <input
                          value={form.last_name ?? ""}
                          onChange={(e) => setForm((p) => ({ ...p, last_name: e.target.value }))}
                          className={inputClass}
                        />
                      </div>
                    </div>
                    <div className="mb-3">
                      <label className={labelClass}>العنوان</label>
                      <input
                        value={form.address_line1 ?? ""}
                        onChange={(e) => setForm((p) => ({ ...p, address_line1: e.target.value }))}
                        placeholder="الشارع، المبنى، الشقة"
                        className={inputClass}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className={labelClass}>المدينة</label>
                        <input
                          value={form.city ?? ""}
                          onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>الهاتف</label>
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
                              "flex items-center gap-1.5 px-3 py-1.5 text-xs border transition-colors " +
                              (active
                                ? "border-foreground text-foreground"
                                : "border-border text-muted-foreground")
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
                        className="lux-btn disabled:opacity-50"
                      >
                        {savingAddress ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : editingId ? (
                          "تحديث"
                        ) : (
                          "حفظ"
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={closeAddressForm}
                        className="px-5 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                )}

                {loadingAddresses ? (
                  <div className="flex justify-center py-16">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : addresses.length === 0 && !showAddressForm ? (
                  <div className="text-center py-16 border border-border">
                    <div className="w-10 h-px bg-border mx-auto mb-5" />
                    <p className="text-sm text-muted-foreground mb-1">لا توجد عناوين محفوظة</p>
                    <p className="text-xs text-muted-foreground mb-5">
                      أضف عنواناً لتسريع عملية الدفع
                    </p>
                    <button
                      type="button"
                      onClick={openNewAddress}
                      className="text-xs font-medium border-b border-foreground pb-0.5 hover:opacity-70 transition-opacity"
                    >
                      إضافة عنوان
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
                            "border p-4 transition-colors " +
                            (addr.is_default ? "border-foreground/30" : "border-border")
                          }
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <LabelIcon size={13} className="text-muted-foreground" />
                              <span className="text-xs font-medium text-foreground">
                                {LABEL_NAME[addr.label ?? "other"] || "آخر"}
                              </span>
                              {addr.is_default && (
                                <span className="text-[9px] px-1.5 py-0.5 bg-[hsl(var(--lux-gray))] text-foreground/60">
                                  افتراضي
                                </span>
                              )}
                            </div>
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => openEditAddress(addr)}
                                className="text-[10px] text-muted-foreground hover:text-foreground transition-colors px-1"
                              >
                                تعديل
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteAddress(addr.id)}
                                className="text-muted-foreground hover:text-destructive transition-colors px-1"
                                aria-label="Delete address"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                          <p className="text-[13px] text-foreground mb-0.5">
                            {[addr.first_name, addr.last_name].filter(Boolean).join(" ")}
                          </p>
                          <p className="text-xs text-muted-foreground">{addr.address_line1}</p>
                          {addr.address_line2 && (
                            <p className="text-xs text-muted-foreground">{addr.address_line2}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {addr.city}
                            {addr.state ? `, ${addr.state}` : ""}
                          </p>
                          {addr.phone && (
                            <p className="text-xs text-muted-foreground mt-1" dir="ltr">
                              {addr.phone}
                            </p>
                          )}
                          {!addr.is_default && (
                            <button
                              type="button"
                              onClick={() => setDefaultAddress(addr.id)}
                              className="text-[10px] text-muted-foreground hover:text-foreground transition-colors mt-2 border-b border-current pb-px"
                            >
                              تعيين كافتراضي
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
                  <div className="border border-border p-5 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>الاسم الأول</label>
                        <input
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>اسم العائلة</label>
                        <input
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          className={inputClass}
                        />
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>البريد الإلكتروني</label>
                      <input
                        value={customer.email}
                        disabled
                        dir="ltr"
                        className={inputClass + " opacity-60 cursor-not-allowed"}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>الهاتف</label>
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
                      className="lux-btn disabled:opacity-50"
                    >
                      {savingProfile ? <Loader2 size={14} className="animate-spin" /> : "حفظ التغييرات"}
                    </button>
                  </div>
                </div>

                <div>
                  <h2 className={headingClass}>تغيير كلمة المرور</h2>
                  <div className="border border-border p-5 space-y-3">
                    <div>
                      <label className={labelClass}>كلمة المرور الحالية</label>
                      <input
                        type="password"
                        value={currentPw}
                        onChange={(e) => setCurrentPw(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>كلمة المرور الجديدة</label>
                      <input
                        type="password"
                        value={newPw}
                        onChange={(e) => setNewPw(e.target.value)}
                        placeholder="8 أحرف على الأقل"
                        className={inputClass}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleChangePassword}
                      disabled={changingPw || !currentPw || !newPw}
                      className="lux-btn disabled:opacity-50"
                    >
                      {changingPw ? <Loader2 size={14} className="animate-spin" /> : "تغيير كلمة المرور"}
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
