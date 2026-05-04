import { BillingInterval, LATEST_API_VERSION } from "@shopify/shopify-api";
import { shopifyApp } from "@shopify/shopify-app-express";
import {MongoDBSessionStorage} from '@shopify/shopify-app-session-storage-mongodb';
import { restResources } from "@shopify/shopify-api/rest/admin/2023-04";
import dotenv from "dotenv";


dotenv.config();


// The transactions with Shopify will always be marked as test transactions, unless NODE_ENV is production.
// See the ensureBilling helper to learn more about billing in this template.
const billingConfig = {
  Premium: {
    amount: 149.0,
    currencyCode: "USD",
    interval: BillingInterval.Every30Days,
  },
};

const HOST = process.env.HOST || "";
if (!HOST) {
  console.error("FATAL: HOST environment variable is required");
  process.exit(1);
}

const shopify = shopifyApp({
  api: {
    apiVersion: LATEST_API_VERSION,
    restResources,
    apiKey: process.env.SHOPIFY_API_KEY,
    apiSecretKey: process.env.SHOPIFY_API_SECRET,
    hostName: HOST.replace(/https?:\/\//, ""),
    scopes: (process.env.SCOPES || "write_products,read_products").split(","),
    billing: billingConfig, // or replace with billingConfig above to enable example billing
  },
  auth: {
    path: "/api/auth",
    callbackPath: "/api/auth/callback",
  },
  webhooks: {
    path: "/api/webhooks",
  },
  // This should be replaced with your preferred storage strategy
  sessionStorage: new MongoDBSessionStorage(
    process.env.MONGODB_URI,
    process.env.MONGODB_DB || "mx-trust-badges"
  ),
});

export default shopify;
