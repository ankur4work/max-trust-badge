import React, { useEffect, useMemo, useState } from "react";
import {
  Page,
  Layout,
  Card,
  Button,
  Frame,
  Icon,
  Banner,
  Stack,
  SkeletonPage,
  SkeletonBodyText,
  Modal,
  TextContainer,
} from "@shopify/polaris";
import { CircleTickMinor, CancelSmallMinor } from "@shopify/polaris-icons";
import { Redirect } from "@shopify/app-bridge/actions";
import { useAppBridge } from "@shopify/app-bridge-react";
import { useAuthenticatedFetch } from "../hooks";

export default function Pricing() {
  const app = useAppBridge();
  const fetchAuth = useAuthenticatedFetch();
  const redirect = Redirect.create(app);

  const [serverTier, setServerTier] = useState(null);
  const [loading, setLoading] = useState({ page: true, action: null });
  const [confirm, setConfirm] = useState({ open: false, target: null, title: "", message: "" });
  const [banner, setBanner] = useState({ msg: "", status: null });

  const planPrices = { free: "0", premium: "149" };

  const selectedPlan = useMemo(() => {
    if (!serverTier) return null;
    return serverTier === "premium" ? "premium" : "free";
  }, [serverTier]);

  async function refreshTier() {
    try {
      setLoading((s) => ({ ...s, page: true }));
      const res = await fetchAuth("/api/hasActiveSubscription");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to fetch subscription");
      if (data?.tier === "premium" || data?.tier === "free") {
        setServerTier(data.tier);
      } else {
        setServerTier(data?.hasActiveSubscription ? "premium" : "free");
      }
    } catch (e) {
      console.error(e);
      setServerTier("free");
      setBanner({ msg: "Couldn't load subscription details.", status: "critical" });
    } finally {
      setLoading((s) => ({ ...s, page: false }));
    }
  }

  useEffect(() => { refreshTier(); }, []);

  const isCurrent = (plan) => selectedPlan === plan;

  const openConfirm = (targetPlan) => {
    if (targetPlan === selectedPlan) {
      setBanner({ msg: `You're already on the ${targetPlan === "free" ? "Free" : "Premium"} plan.`, status: "warning" });
      return;
    }
    if (targetPlan === "free") {
      setConfirm({ open: true, target: "free", title: "Downgrade to Free?", message: "This will cancel your paid subscription. The trust badge block will use the built-in default layout and styling." });
    } else {
      setConfirm({ open: true, target: "premium", title: "Upgrade to Premium?", message: "Get full control over your trust badge layout, colors, icons, and styling directly from the theme editor." });
    }
  };

  const runConfirm = async () => {
    if (!confirm.target) return;
    const target = confirm.target;
    setConfirm((c) => ({ ...c, open: false }));
    await changePlan(target);
  };

  const changePlan = async (targetPlan) => {
    if (!targetPlan) return;
    try {
      setLoading((s) => ({ ...s, action: targetPlan }));
      if (targetPlan === "free") {
        const res = await fetchAuth("/api/cancelSubscription");
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || "Cancel failed");
        setBanner({
          msg: data?.status && data?.status !== "No subscription found"
            ? "Subscription cancelled. You're now on the Free plan."
            : "No active subscription found.",
          status: data?.status && data?.status !== "No subscription found" ? "success" : "warning",
        });
        await refreshTier();
        return;
      }
      const res = await fetchAuth(`/api/createSubscription?plan=premium`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Subscription failed");
      if (data?.isActiveSubscription) {
        await refreshTier();
        setBanner({ msg: "Premium plan is already active.", status: "success" });
      } else if (data?.confirmationUrl) {
        setBanner({ msg: "Opening Shopify billing...", status: "success" });
        redirect.dispatch(Redirect.Action.REMOTE, String(data.confirmationUrl));
      } else {
        throw new Error("No confirmation URL returned.");
      }
    } catch (e) {
      console.error(e);
      setBanner({
        msg: targetPlan === "free"
          ? "Couldn't cancel subscription. Please try again."
          : "Couldn't start Premium plan. Please try again.",
        status: "critical",
      });
    } finally {
      setLoading((s) => ({ ...s, action: null }));
    }
  };

  if (loading.page && !selectedPlan) {
    return (
      <Frame>
        <SkeletonPage title="Plans & Pricing">
          <Layout>
            {[1, 2].map((k) => (
              <Layout.Section oneHalf key={k}>
                <Card sectioned><SkeletonBodyText lines={8} /></Card>
              </Layout.Section>
            ))}
          </Layout>
        </SkeletonPage>
      </Frame>
    );
  }

  const Feature = ({ enabled, children }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0" }}>
      <Icon source={enabled ? CircleTickMinor : CancelSmallMinor} color={enabled ? "success" : "subdued"} />
      <span style={{ fontSize: 14, color: enabled ? "#1a1a1a" : "#9ca3af" }}>{children}</span>
    </div>
  );

  return (
    <Frame>
      <Modal
        open={confirm.open}
        onClose={() => setConfirm((c) => ({ ...c, open: false }))}
        title={confirm.title}
        primaryAction={{
          content: confirm.target === "free" ? "Yes, downgrade" : `Subscribe for $${planPrices.premium}/mo`,
          onAction: runConfirm,
          loading: loading.action === confirm.target,
          destructive: confirm.target === "free",
        }}
        secondaryActions={[{ content: "Cancel", onAction: () => setConfirm((c) => ({ ...c, open: false })) }]}
      >
        <Modal.Section>
          <TextContainer><p>{confirm.message}</p></TextContainer>
        </Modal.Section>
      </Modal>

      <Page
        title="Plans & Pricing"
        subtitle="Choose the plan that works best for your store."
        breadcrumbs={[{ content: "Home", url: "/" }]}
      >
        {!!banner.msg && !!banner.status && (
          <div style={{ marginBottom: 16 }}>
            <Banner status={banner.status} onDismiss={() => setBanner({ msg: "", status: null })}>
              {banner.msg}
            </Banner>
          </div>
        )}

        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            {/* FREE PLAN */}
            <div
              style={{
                borderRadius: 16,
                border: isCurrent("free") ? "2px solid #4f46e5" : "1px solid #e5e7eb",
                background: "#fff",
                overflow: "hidden",
                boxShadow: isCurrent("free") ? "0 8px 30px rgba(79,70,229,0.12)" : "0 2px 8px rgba(0,0,0,0.04)",
                transition: "all 0.2s ease",
              }}
            >
              <div style={{ padding: "28px 24px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <span style={{ fontSize: 18, fontWeight: 700, color: "#1a1a1a" }}>Free</span>
                  {isCurrent("free") && (
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#fff", background: "#4f46e5", padding: "3px 12px", borderRadius: 999 }}>
                      Current plan
                    </span>
                  )}
                </div>

                <div style={{ marginBottom: 20 }}>
                  <span style={{ fontSize: 40, fontWeight: 800, color: "#1a1a1a" }}>$0</span>
                  <span style={{ fontSize: 14, color: "#6b7280", marginLeft: 4 }}>/month</span>
                </div>

                <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 20, lineHeight: 1.5 }}>
                  Basic trust badges with default styling. Great for getting started.
                </p>

                <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: 16, marginBottom: 20 }}>
                  <Feature enabled>Show trust badges on product pages</Feature>
                  <Feature enabled>Built-in badge icons & text</Feature>
                  <Feature enabled={false}>Custom layout from theme editor</Feature>
                  <Feature enabled={false}>Custom colors & background</Feature>
                  <Feature enabled={false}>Adjust icon size & border radius</Feature>
                </div>

                <Button
                  fullWidth
                  onClick={() => openConfirm("free")}
                  disabled={isCurrent("free") || loading.action === "free"}
                  loading={loading.action === "free"}
                >
                  {isCurrent("free") ? "Current plan" : "Downgrade to Free"}
                </Button>
              </div>
            </div>

            {/* PREMIUM PLAN */}
            <div
              style={{
                borderRadius: 16,
                border: isCurrent("premium") ? "2px solid #4f46e5" : "1px solid #e5e7eb",
                background: "linear-gradient(180deg, #fafaff 0%, #fff 40%)",
                overflow: "hidden",
                boxShadow: isCurrent("premium") ? "0 8px 30px rgba(79,70,229,0.12)" : "0 2px 8px rgba(0,0,0,0.04)",
                transition: "all 0.2s ease",
                position: "relative",
              }}
            >
              {/* Popular badge */}
              <div style={{
                position: "absolute",
                top: 16,
                right: 16,
                fontSize: 11,
                fontWeight: 600,
                color: "#92400e",
                background: "#fef3c7",
                padding: "3px 10px",
                borderRadius: 999,
              }}>
                Most popular
              </div>

              <div style={{ padding: "28px 24px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <span style={{ fontSize: 18, fontWeight: 700, color: "#1a1a1a" }}>Premium</span>
                  {isCurrent("premium") && (
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#fff", background: "#4f46e5", padding: "3px 12px", borderRadius: 999 }}>
                      Current plan
                    </span>
                  )}
                </div>

                <div style={{ marginBottom: 20 }}>
                  <span style={{ fontSize: 40, fontWeight: 800, color: "#1a1a1a" }}>$149</span>
                  <span style={{ fontSize: 14, color: "#6b7280", marginLeft: 4 }}>/month</span>
                </div>

                <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 20, lineHeight: 1.5 }}>
                  Full customization with theme editor controls for layout, colors, and styling.
                </p>

                <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: 16, marginBottom: 20 }}>
                  <Feature enabled>Show trust badges on product pages</Feature>
                  <Feature enabled>Custom or default badge icons & text</Feature>
                  <Feature enabled>Change layout from theme editor</Feature>
                  <Feature enabled>Customize colors & background</Feature>
                  <Feature enabled>Adjust icon size, font & border radius</Feature>
                </div>

                <Button
                  primary
                  fullWidth
                  onClick={() => openConfirm("premium")}
                  disabled={isCurrent("premium") || loading.action === "premium"}
                  loading={loading.action === "premium"}
                >
                  {isCurrent("premium") ? "Premium active" : "Upgrade to Premium"}
                </Button>
              </div>
            </div>
          </div>

          {/* FAQ Section */}
          <div style={{ marginTop: 32 }}>
            <Card title="Frequently asked questions" sectioned>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {[
                  { q: "Can I switch plans anytime?", a: "Yes, you can upgrade or downgrade at any time. Changes take effect immediately." },
                  { q: "What happens when I downgrade?", a: "Your trust badges will switch to the default layout and styling. No data is lost." },
                  { q: "Is there a free trial for Premium?", a: "The billing is handled through Shopify. You can cancel anytime from this page." },
                ].map((faq, i) => (
                  <div key={i} style={{ padding: "12px 0", borderBottom: i < 2 ? "1px solid #f3f4f6" : "none" }}>
                    <p style={{ fontWeight: 600, fontSize: 14, color: "#1a1a1a", margin: "0 0 6px" }}>{faq.q}</p>
                    <p style={{ fontSize: 13, color: "#6b7280", margin: 0, lineHeight: 1.5 }}>{faq.a}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </Page>
    </Frame>
  );
}
