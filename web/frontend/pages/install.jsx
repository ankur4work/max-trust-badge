import React, { useState } from "react";
import {
  Card,
  Page,
  Layout,
  Frame,
  Button,
  Icon,
  Banner,
} from "@shopify/polaris";
import { getEmbeddedAppShop, withEmbeddedAppParams } from "../utils";

export default function Installation() {
  const [error, setError] = useState(null);

  const openThemeEditor = async () => {
    setError(null);
    try {
      const shop = getEmbeddedAppShop();
      if (!shop) throw new Error("Shop domain is missing");
      window.open(
        `https://${shop}/admin/themes/current/editor?context=apps&activateAppId=b355dba7-d415-49dc-8399-11206b10c9ca/trust-badges-embed`,
        "_blank"
      );
    } catch (err) {
      setError(err.message || "Failed to open theme editor.");
    }
  };

  const steps = [
    {
      step: "1",
      title: "Open the theme editor",
      desc: "Click the button below to open your current theme's editor. Navigate to a product template.",
      color: "#4f46e5",
    },
    {
      step: "2",
      title: "Add the Trust Badges block",
      desc: "In the theme editor sidebar, click 'Add block' and search for 'Trust Badges'. Add it to your product page template.",
      color: "#0891b2",
    },
    {
      step: "3",
      title: "Configure your badges",
      desc: "Click on the Trust Badges block to customize badge text, icons, and styling. Premium users get full layout and color controls.",
      color: "#059669",
    },
    {
      step: "4",
      title: "Save and publish",
      desc: "Click 'Save' in the theme editor. Your trust badges will now appear on all product pages automatically.",
      color: "#d97706",
    },
  ];

  return (
    <Frame>
      <Page
        title="Installation Guide"
        subtitle="Follow these steps to add trust badges to your store."
        breadcrumbs={[{ content: "Home", url: withEmbeddedAppParams("/") }]}
      >
        {error && (
          <div style={{ marginBottom: 16 }}>
            <Banner status="critical" onDismiss={() => setError(null)}>
              {error}
            </Banner>
          </div>
        )}

        <Layout>
          <Layout.Section>
            <Card sectioned>
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {steps.map((item) => (
                  <div
                    key={item.step}
                    style={{
                      display: "flex",
                      gap: 16,
                      padding: 20,
                      borderRadius: 12,
                      border: "1px solid #e5e7eb",
                      background: "#fafafa",
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        minWidth: 36,
                        borderRadius: "50%",
                        background: item.color,
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: 15,
                      }}
                    >
                      {item.step}
                    </div>
                    <div>
                      <h3 style={{ fontWeight: 600, fontSize: 15, margin: "0 0 6px", color: "#1a1a1a" }}>
                        {item.title}
                      </h3>
                      <p style={{ color: "#6b7280", fontSize: 13, margin: 0, lineHeight: 1.5 }}>
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 24, display: "flex", gap: 12 }}>
                <Button primary onClick={openThemeEditor}>
                  Open theme editor
                </Button>
              </div>
            </Card>
          </Layout.Section>

          <Layout.Section>
            <Card title="Need help?" sectioned>
              <p style={{ color: "#6b7280", fontSize: 14, margin: 0, lineHeight: 1.6 }}>
                If you're having trouble installing the trust badges block, make sure you're using a
                Shopify Online Store 2.0 theme. The block won't appear in older (vintage) themes.
                For further assistance, reach out to our support team.
              </p>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    </Frame>
  );
}
