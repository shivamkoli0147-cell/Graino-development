import { useState, useCallback } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SplashScreen } from "@/pages/SplashScreen";
import { CustomerAuth } from "@/pages/CustomerAuth";
import { AddressSetup } from "@/pages/AddressSetup";
import { ProductList } from "@/pages/ProductList";
import { ProductDetail } from "@/pages/ProductDetail";
import { CartPage } from "@/pages/CartPage";
import { OrdersPage } from "@/pages/OrdersPage";
import { CustomerProfile } from "@/pages/CustomerProfile";
import { SellerAuth } from "@/pages/SellerAuth";
import { SellerDashboard } from "@/pages/SellerDashboard";
import { SellerOrders } from "@/pages/SellerOrders";
import { SellerProducts } from "@/pages/SellerProducts";
import { BottomNav } from "@/components/kisan/BottomNav";
import {
  getCustomerSession, setCustomerSession, clearCustomerSession,
  isSellerSession, clearSellerSession,
  type Cart, type CartItem, type CustomerSession,
  getCartCount,
} from "@/lib/utils";
import { useRequestReturn } from "@workspace/api-client-react";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } }
});

type AppMode = "customer" | "seller";
type CustomerTab = "products" | "cart" | "orders";
type SellerTab = "dashboard" | "orders" | "products";

function GrainoApp() {
  const [showSplash, setShowSplash] = useState(true);
  const [mode, setMode] = useState<AppMode>("customer");

  const [customer, setCustomer] = useState<CustomerSession | null>(getCustomerSession);
  const [showAddressSetup, setShowAddressSetup] = useState(() => {
    const s = getCustomerSession();
    return !!s && !s.address;
  });
  const [customerTab, setCustomerTab] = useState<CustomerTab>("products");
  const [viewProductId, setViewProductId] = useState<number | null>(null);
  const [cart, setCart] = useState<Cart>({});
  const [showProfile, setShowProfile] = useState(false);

  const [sellerAuthed, setSellerAuthed] = useState(isSellerSession);
  const [sellerTab, setSellerTab] = useState<SellerTab>("dashboard");

  const requestReturn = useRequestReturn();

  const handleCartChange = useCallback((key: string, item: CartItem | null) => {
    setCart(prev => {
      if (!item) { const next = { ...prev }; delete next[key]; return next; }
      return { ...prev, [key]: item };
    });
  }, []);

  const handleReturnRequest = (orderId: number) => {
    requestReturn.mutate({ id: orderId, data: { note: "Customer ने return request ki hai" } });
  };

  const handleCustomerUpdate = (c: CustomerSession) => {
    setCustomerSession(c);
    setCustomer(c);
  };

  const handleLoginSuccess = (c: CustomerSession) => {
    // session already saved to localStorage inside CustomerAuth — just update React state
    setCustomer(c);
    // show address setup if this is a new user with no address
    if (!c.address) setShowAddressSetup(true);
  };

  const goToSeller = () => {
    setShowProfile(false);
    setMode("seller");
  };

  return (
    <div style={{ display: "flex", justifyContent: "center", background: "#1B4332", minHeight: "100vh" }}>
      <div style={{
        width: "100%", maxWidth: 390, background: "#F4F6F3", height: "100vh",
        display: "flex", flexDirection: "column", position: "relative",
        fontFamily: "'Baloo 2', sans-serif",
        overflow: "hidden",
      }}>
        {showSplash && <SplashScreen onDone={() => setShowSplash(false)} />}

        {mode === "customer" ? (
          <>
            {!customer ? (
              <CustomerAuth onSuccess={handleLoginSuccess} />
            ) : showAddressSetup ? (
              <AddressSetup
                customer={customer}
                onComplete={(updated) => {
                  setCustomer(updated);
                  setShowAddressSetup(false);
                }}
                onSkip={() => setShowAddressSetup(false)}
              />
            ) : viewProductId ? (
              <ProductDetail
                productId={viewProductId} cart={cart}
                onBack={() => setViewProductId(null)}
                onCartChange={handleCartChange}
              />
            ) : (
              <>
                {customerTab === "products" && (
                  <ProductList
                    cart={cart}
                    onAddToCart={() => {}}
                    onViewProduct={id => setViewProductId(id)}
                    customer={customer}
                    onOpenProfile={() => setShowProfile(true)}
                  />
                )}
                {customerTab === "cart" && (
                  <CartPage cart={cart} customer={customer}
                    onCartChange={handleCartChange}
                    onClearCart={() => setCart({})}
                    onOrderSuccess={() => setCustomerTab("orders")}
                  />
                )}
                {customerTab === "orders" && (
                  <OrdersPage customer={customer} onRequestReturn={handleReturnRequest} />
                )}
                <BottomNav
                  active={customerTab}
                  onSelect={id => { setCustomerTab(id as CustomerTab); setViewProductId(null); }}
                  tabs={[
                    { id: "products", icon: "🏠", label: "Home" },
                    { id: "cart", icon: "🛒", label: "Cart", badge: getCartCount(cart) },
                    { id: "orders", icon: "📦", label: "Orders" },
                  ]}
                />
              </>
            )}

            {showProfile && customer && (
              <CustomerProfile
                customer={customer}
                onUpdate={handleCustomerUpdate}
                onLogout={() => {
                  clearCustomerSession();
                  setCustomer(null); setCart({});
                  setShowProfile(false);
                }}
                onClose={() => setShowProfile(false)}
                onGoSeller={goToSeller}
              />
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
                    onLogout={() => {
                      clearSellerSession();
                      setSellerAuthed(false);
                      setMode("customer");
                    }}
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
                <BottomNav
                  active={sellerTab}
                  onSelect={id => setSellerTab(id as SellerTab)}
                  tabs={[
                    { id: "dashboard", icon: "📊", label: "Dashboard" },
                    { id: "orders", icon: "📋", label: "Orders" },
                    { id: "products", icon: "🌾", label: "Products" },
                  ]}
                />
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <GrainoApp />
    </QueryClientProvider>
  );
}
