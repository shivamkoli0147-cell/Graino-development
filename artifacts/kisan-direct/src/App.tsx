import { useState, useCallback } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CustomerAuth } from "@/pages/CustomerAuth";
import { ProductList } from "@/pages/ProductList";
import { ProductDetail } from "@/pages/ProductDetail";
import { CartPage } from "@/pages/CartPage";
import { OrdersPage } from "@/pages/OrdersPage";
import { SellerAuth } from "@/pages/SellerAuth";
import { SellerDashboard } from "@/pages/SellerDashboard";
import { SellerOrders } from "@/pages/SellerOrders";
import { SellerProducts } from "@/pages/SellerProducts";
import { BottomNav } from "@/components/kisan/BottomNav";
import {
  getCustomerSession, setCustomerSession, clearCustomerSession,
  isSellerSession, clearSellerSession,
  type Cart, type CartItem, type CustomerSession,
  getCartCount, getCartTotal,
} from "@/lib/utils";
import { useRequestReturn } from "@workspace/api-client-react";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } }
});

type AppMode = "customer" | "seller";
type CustomerTab = "products" | "cart" | "orders";
type SellerTab = "dashboard" | "orders" | "products";

function KisanApp() {
  const [mode, setMode] = useState<AppMode>("customer");

  // ── Customer state ──────────────────────────────────────────────────────────
  const [customer, setCustomer] = useState<CustomerSession | null>(getCustomerSession);
  const [customerTab, setCustomerTab] = useState<CustomerTab>("products");
  const [viewProductId, setViewProductId] = useState<number | null>(null);
  const [cart, setCart] = useState<Cart>({});

  // ── Seller state ────────────────────────────────────────────────────────────
  const [sellerAuthed, setSellerAuthed] = useState(isSellerSession);
  const [sellerTab, setSellerTab] = useState<SellerTab>("dashboard");

  const requestReturn = useRequestReturn();

  const handleCartChange = useCallback((key: string, item: CartItem | null) => {
    setCart(prev => {
      if (!item) { const next = { ...prev }; delete next[key]; return next; }
      return { ...prev, [key]: item };
    });
  }, []);

  const toggleMode = () => {
    setMode(prev => prev === "customer" ? "seller" : "customer");
  };

  const handleReturnRequest = (orderId: number) => {
    requestReturn.mutate({ id: orderId, data: { note: "Customer ने return request ki hai" } });
  };

  // ── Wrapper ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", justifyContent: "center", background: "#1a3d1a", minHeight: "100vh" }}>
      <div style={{
        width: "100%", maxWidth: 390, background: "#F7F4EF", minHeight: "100vh",
        display: "flex", flexDirection: "column", position: "relative", fontFamily: "'Baloo 2', sans-serif",
      }}>
        {mode === "customer" ? (
          <>
            {!customer ? (
              <CustomerAuth onSuccess={c => { setCustomerSession(c); setCustomer(c); }} />
            ) : viewProductId ? (
              <ProductDetail
                productId={viewProductId} cart={cart}
                onBack={() => setViewProductId(null)}
                onCartChange={handleCartChange}
              />
            ) : (
              <>
                {customerTab === "products" && (
                  <ProductList cart={cart} onAddToCart={() => {}} onViewProduct={id => { setViewProductId(id); }} />
                )}
                {customerTab === "cart" && (
                  <CartPage cart={cart} customer={customer}
                    onCartChange={handleCartChange}
                    onClearCart={() => setCart({})}
                    onOrderSuccess={() => { setCustomerTab("orders"); }}
                  />
                )}
                {customerTab === "orders" && (
                  <OrdersPage customer={customer} onRequestReturn={handleReturnRequest} />
                )}
                <BottomNav
                  active={customerTab}
                  onSelect={id => { setCustomerTab(id as CustomerTab); setViewProductId(null); }}
                  tabs={[
                    { id: "products", icon: "🌾", label: "Products" },
                    { id: "cart", icon: "🛒", label: "Cart", badge: getCartCount(cart) },
                    { id: "orders", icon: "📋", label: "Orders" },
                  ]}
                />
              </>
            )}
          </>
        ) : (
          <>
            {!sellerAuthed ? (
              <SellerAuth onSuccess={() => setSellerAuthed(true)} />
            ) : (
              <>
                {sellerTab === "dashboard" && (
                  <SellerDashboard
                    onLogout={() => { clearSellerSession(); setSellerAuthed(false); }}
                    onManageOrders={() => setSellerTab("orders")}
                    onManageProducts={() => setSellerTab("products")}
                  />
                )}
                {sellerTab === "orders" && (
                  <SellerOrders onBack={() => setSellerTab("dashboard")} />
                )}
                {sellerTab === "products" && (
                  <SellerProducts onBack={() => setSellerTab("dashboard")} />
                )}
                {sellerTab === "dashboard" && (
                  <BottomNav
                    active={sellerTab}
                    onSelect={id => setSellerTab(id as SellerTab)}
                    tabs={[
                      { id: "dashboard", icon: "📊", label: "Dashboard" },
                      { id: "orders", icon: "📋", label: "Orders" },
                      { id: "products", icon: "🌾", label: "Products" },
                    ]}
                  />
                )}
              </>
            )}
          </>
        )}

        {/* Mode toggle button */}
        <button
          onClick={toggleMode}
          className="btn-press"
          style={{
            position: "fixed",
            bottom: customer && mode === "customer" ? 80 : 24,
            right: "max(12px, calc(50% - 183px))",
            zIndex: 999,
            background: mode === "seller" ? "#F59E0B" : "#1C1C1C",
            color: "white",
            border: "none",
            borderRadius: 30,
            padding: "9px 16px",
            fontFamily: "'Baloo 2', sans-serif",
            fontWeight: 700,
            fontSize: 12,
            cursor: "pointer",
            boxShadow: "0 4px 20px rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {mode === "customer" ? "🌾 Seller" : "👤 Customer"}
        </button>

        {/* Logout customer button (top right) */}
        {mode === "customer" && customer && !viewProductId && (
          <button
            onClick={() => { clearCustomerSession(); setCustomer(null); setCart({}); }}
            style={{
              position: "absolute", top: 12, right: 12, zIndex: 100,
              background: "rgba(0,0,0,0.15)", border: "none", borderRadius: 8,
              padding: "4px 10px", color: "white", fontFamily: "'Baloo 2', sans-serif",
              fontWeight: 600, fontSize: 11, cursor: "pointer",
            }}
          >
            {customer.name.split(" ")[0]} ✕
          </button>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <KisanApp />
    </QueryClientProvider>
  );
}
