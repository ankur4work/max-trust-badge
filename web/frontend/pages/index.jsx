import React, { useState, useCallback, useMemo } from "react";
import {
  Card,
  Page,
  Layout,
  TextContainer,
  Button,
  Frame,
  DisplayText,
  Toast,
  SkeletonBodyText,
  Banner,
  Stack,
  Badge,
  Icon,
} from "@shopify/polaris";
import {
  CircleTickMinor,
  ExternalMinor,
  PlayCircleMajor,
} from "@shopify/polaris-icons";
import { useAppQuery, useAuthenticatedFetch } from "../hooks";
import { useAppBridge } from "@shopify/app-bridge-react";
import { Redirect } from "@shopify/app-bridge/actions";
import { useNavigate } from "react-router-dom";

export default function HomePage() {
  const [toastProps, setToastProps] = useState({ content: null, error: false });
  const [activateError, setActivateError] = useState(null);

  const app = useAppBridge();
  const fetch = useAuthenticatedFetch();
  const redirect = Redirect.create(app);
  const navigate = useNavigate();

  const {
    data: subscriptionData,
    isLoading,
    isFetching,
  } = useAppQuery({
    url: "/api/hasActiveSubscription",
    reactQueryOptions: {
      refetchOnMount: "always",
      staleTime: 0,
      cacheTime: 0,
    },
  });

  const currentPlan = useMemo(() => {
    if (!subscriptionData) return "free";
    if (subscriptionData.tier === "premium") return "premium";
    if (subscriptionData.tier === "free") return "free";
    if (typeof subscriptionData.hasActiveSubscription !== "undefined") {
      return subscriptionData.hasActiveSubscription ? "premium" : "free";
    }
    return "free";
  }, [subscriptionData]);

  const isPremium = currentPlan === "premium";
  const isPlanLoading = isLoading || isFetching;

  const openThemeEditor = async () => {
    setActivateError(null);
    try {
      const response = await fetch("/api/getshop");
      if (!response.ok) throw new Error("Could not detect shop domain");
      const data = await response.json();
      if (!data.shop) throw new Error("Shop domain is missing");
      window.open(
        `https://${data.shop}/admin/themes/current/editor?context=apps&activateAppId=b355dba7-d415-49dc-8399-11206b10c9ca/trust-badges-embed`,
        "_blank"
      );
    } catch (error) {
      setActivateError(error.message || "Failed to open theme editor.");
    }
  };

  const toastMarkup = toastProps.content && (
    <Toast
      {...toastProps}
      onDismiss={() => setToastProps({ content: null, error: false })}
    />
  );

  const Tick = () => (
    <span style={{ marginRight: 8, display: "inline-flex" }}>
      <Icon source={CircleTickMinor} color="success" />
    </span>
  );

  const features = [
    { text: "Display trust badges on product pages", free: true },
    { text: "Use built-in default icons & text", free: true },
    { text: "Change layout from theme editor", free: false },
    { text: "Customize colors & background", free: false },
    { text: "Adjust icon size, font size & border radius", free: false },
  ];

  return (
    <Frame>
      <Page title="Trust Badges" subtitle="Build customer confidence with professional trust badges">
        {toastMarkup}

        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <Layout>
            {/* Plan Status */}
            <Layout.Section>
              <Card sectioned>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 15, fontWeight: 600, color: "#1a1a1a" }}>Current plan</span>
                        {isPlanLoading ? (
                          <div style={{ width: 60 }}><SkeletonBodyText lines={1} /></div>
                        ) : (
                          <Badge status={isPremium ? "success" : "info"}>
                            {isPremium ? "Premium" : "Free"}
                          </Badge>
                        )}
                      </div>
                      <p style={{ color: "#6b7280", fontSize: 13, margin: 0 }}>
                        {isPremium
                          ? "You have full access to all customization features."
                          : "Upgrade to Premium to unlock all theme editor controls."}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Button onClick={() => navigate("/pricing")}>
                      {isPremium ? "Manage plan" : "Upgrade to Premium"}
                    </Button>
                    <Button primary onClick={openThemeEditor}>
                      Open theme editor
                    </Button>
                  </div>
                </div>
              </Card>
            </Layout.Section>

            {/* Error banner */}
            {activateError && (
              <Layout.Section>
                <Banner status="critical" onDismiss={() => setActivateError(null)}>
                  {activateError}
                </Banner>
              </Layout.Section>
            )}

            {/* Setup Steps */}
            <Layout.Section>
              <Card title="Get started in 3 steps" sectioned>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20, marginTop: 8 }}>
                  {[
                    {
                      step: "1",
                      title: "Add the block",
                      desc: "Open your theme editor and add the Trust Badges block to your product template.",
                      color: "#4f46e5",
                    },
                    {
                      step: "2",
                      title: "Customize badges",
                      desc: "Edit badge texts, icons, and styling options from the block settings panel.",
                      color: "#0891b2",
                    },
                    {
                      step: "3",
                      title: "Save & publish",
                      desc: "Save your theme changes. Trust badges will appear on all product pages.",
                      color: "#059669",
                    },
                  ].map((item) => (
                    <div
                      key={item.step}
                      style={{
                        padding: 20,
                        borderRadius: 12,
                        border: "1px solid #e5e7eb",
                        background: "#fafafa",
                        position: "relative",
                      }}
                    >
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          background: item.color,
                          color: "#fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 700,
                          fontSize: 14,
                          marginBottom: 12,
                        }}
                      >
                        {item.step}
                      </div>
                      <h3 style={{ fontWeight: 600, fontSize: 15, margin: "0 0 6px", color: "#1a1a1a" }}>
                        {item.title}
                      </h3>
                      <p style={{ color: "#6b7280", fontSize: 13, margin: 0, lineHeight: 1.5 }}>
                        {item.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            </Layout.Section>

            {/* Features Overview */}
            <Layout.Section oneHalf>
              <Card title="Features" sectioned>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {features.map((f, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Icon
                        source={CircleTickMinor}
                        color={f.free || isPremium ? "success" : "subdued"}
                      />
                      <span style={{ fontSize: 14, color: f.free || isPremium ? "#1a1a1a" : "#9ca3af" }}>
                        {f.text}
                        {!f.free && !isPremium && (
                          <span style={{
                            fontSize: 11,
                            color: "#6366f1",
                            background: "#eef2ff",
                            padding: "2px 8px",
                            borderRadius: 999,
                            marginLeft: 8,
                          }}>
                            Premium
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            </Layout.Section>

            {/* Quick Actions */}
            <Layout.Section oneHalf>
              <Card title="Quick actions" sectioned>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <Button fullWidth onClick={openThemeEditor}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Icon source={ExternalMinor} color="base" />
                      <span>Open theme editor</span>
                    </div>
                  </Button>
                  <Button fullWidth onClick={() => navigate("/pricing")}>
                    View pricing plans
                  </Button>
                </div>

                <div style={{ marginTop: 20, padding: 16, background: "#f0fdf4", borderRadius: 10, border: "1px solid #bbf7d0" }}>
                  <p style={{ fontSize: 13, color: "#15803d", margin: 0, fontWeight: 500 }}>
                    Tip: After adding the block in your theme editor, you can customize badge text, icons, and layout directly from the block settings.
                  </p>
                </div>
              </Card>
            </Layout.Section>
          </Layout>
        </div>
      </Page>
    </Frame>
  );
}
