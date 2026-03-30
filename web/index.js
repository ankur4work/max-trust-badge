// @ts-check
import { join } from "path";
import { readFileSync } from "fs";
import express from "express";
import serveStatic from "serve-static";

import shopify from "./shopify.js";
import cancelSubscription from "./cancel-subscription.js";
import GDPRWebhookHandlers from "./gdpr.js";
import dotenv from "dotenv";

import { connectToMongoDB } from "./mongodb.js";

dotenv.config();

/* ------------------------------------------------ */
/*                    CONFIG                         */
/* ------------------------------------------------ */

const PORT = parseInt(process.env.BACKEND_PORT || process.env.PORT || "3000", 10);

const STATIC_PATH =
  process.env.NODE_ENV === "production"
    ? `${process.cwd()}/frontend/dist`
    : `${process.cwd()}/frontend/`;

const PREMIUM_PLAN = "Premium";

const APP_NAMESPACE = "custom";
const SHOP_META_KEY = "trust-badges";
const APP_META_KEY = "mx-trust-badges-premium";

const IS_BILLING_TEST =
  process.env.SHOPIFY_BILLING_TEST === "true" ||
  process.env.NODE_ENV !== "production";

const HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  INTERNAL_SERVER_ERROR: 500,
};

/* ------------------------------------------------ */
/*                 EXPRESS SERVER                    */
/* ------------------------------------------------ */

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ------------------------------------------------ */
/*           SHOPIFY AUTH + WEBHOOK ROUTES           */
/* ------------------------------------------------ */

app.get(shopify.config.auth.path, shopify.auth.begin());

app.get(
  shopify.config.auth.callbackPath,
  shopify.auth.callback(),
  shopify.redirectToShopifyOrAppRoot()
);

app.post(
  shopify.config.webhooks.path,
  shopify.processWebhooks({ webhookHandlers: GDPRWebhookHandlers })
);

/* ------------------------------------------------ */
/*                  HELPER METHODS                   */
/* ------------------------------------------------ */

const getSession = (res) => res.locals.shopify.session;

const createGraphQLClient = (session) =>
  new shopify.api.clients.Graphql({ session });

const handleError = (res, status, message) => {
  console.error(message);
  res.status(status).send({ error: message });
};

/* ------------------------------------------------ */
/*                BILLING SERVICE                    */
/* ------------------------------------------------ */

const BillingService = {
  async hasActivePlan(session) {
    return await shopify.api.billing.check({
      session,
      plans: [PREMIUM_PLAN],
      isTest: IS_BILLING_TEST,
    });
  },

  async createSubscription(session) {
    return await shopify.api.billing.request({
      session,
      plan: PREMIUM_PLAN,
      isTest: IS_BILLING_TEST,
      returnUrl: `${process.env.HOST}?shop=${session.shop}`,
    });
  },

  async cancel(session) {
    return await cancelSubscription(session);
  },
};

/* ------------------------------------------------ */
/*               SESSION REPOSITORY                  */
/* ------------------------------------------------ */

const SessionRepository = {
  async findByShop(shop) {
    const collection = await connectToMongoDB();
    return await collection.findOne({ shop });
  },
};

const getStoredSessionForShop = async (shop) => {
  if (!shop) {
    throw new Error("Missing shop parameter");
  }

  const session = await SessionRepository.findByShop(shop);

  if (!session) {
    throw new Error("Session not found");
  }

  return session;
};

/* ------------------------------------------------ */
/*               SUBSCRIPTION SERVICE                */
/* ------------------------------------------------ */

const SubscriptionService = {
  async getTier(session) {
    try {
      const active = await BillingService.hasActivePlan(session);
      return active ? "premium" : "free";
    } catch (err) {
      console.error("Subscription check failed:", err);
      return "free";
    }
  },
};

/* ------------------------------------------------ */
/*               METAFIELD SERVICE                   */
/* ------------------------------------------------ */

const MetafieldService = {
  async getShopId(session) {
    const client = createGraphQLClient(session);

    const result = await client.request(`
      {
        shop { id }
      }
    `);

    const shopId = result?.shop?.id ?? result?.data?.shop?.id;

    if (!shopId) throw new Error("Shop ID not found");

    return shopId;
  },

  async updateShopMetafield(session, tier) {
    const client = createGraphQLClient(session);
    const ownerId = await this.getShopId(session);

    const value = tier === "premium" ? "premium" : "free";

    await client.request(CREATE_APP_DATA_METAFIELD, {
      variables: {
        metafieldsSetInput: [
          {
            ownerId,
            namespace: APP_NAMESPACE,
            key: SHOP_META_KEY,
            type: "single_line_text_field",
            value,
          },
        ],
      },
    });
  },

  async ensureAppMetafield(session) {
    const client = createGraphQLClient(session);

    const install = await client.request(CURRENT_APP_INSTALLATION, {
      variables: { namespace: APP_NAMESPACE, key: APP_META_KEY },
    });

    const ownerId = install?.currentAppInstallation?.id;
    const existing = install?.currentAppInstallation?.metafield;

    if (!existing && ownerId) {
      await client.request(CREATE_APP_DATA_METAFIELD, {
        variables: {
          metafieldsSetInput: [
            {
              namespace: APP_NAMESPACE,
              key: APP_META_KEY,
              type: "boolean",
              value: "true",
              ownerId,
            },
          ],
        },
      });
    }
  },

  async deleteAppMetafield(session) {
    const client = createGraphQLClient(session);

    const install = await client.request(CURRENT_APP_INSTALLATION, {
      variables: { namespace: APP_NAMESPACE, key: APP_META_KEY },
    });

    const ownerId = install?.currentAppInstallation?.id;
    const existing = install?.currentAppInstallation?.metafield;

    if (ownerId && existing) {
      await client.request(APP_OWNED_METAFIELD_DELETE, {
        variables: {
          ownerId,
          namespace: APP_NAMESPACE,
          key: APP_META_KEY,
        },
      });
    }
  },
};

/* ------------------------------------------------ */
/*         PUBLIC SUBSCRIPTION CHECK ROUTE           */
/* ------------------------------------------------ */

app.get("/api/scroll-to-top/hasSubscription", async (req, res) => {
  try {
    const { shop } = req.query;

    if (!shop) {
      return handleError(res, HTTP_STATUS.BAD_REQUEST, "Missing shop parameter");
    }

    const session = await SessionRepository.findByShop(shop);

    if (!session) {
      return handleError(res, HTTP_STATUS.UNAUTHORIZED, "Session not found");
    }

    const tier = await SubscriptionService.getTier(session);

    await MetafieldService.updateShopMetafield(session, tier);

    res.send({
      hasActiveSubscription: tier !== "free",
      tier,
    });
  } catch (err) {
    handleError(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, err.message);
  }
});

app.get("/api/hasActiveSubscription", async (req, res) => {
  try {
    const { shop } = req.query;

    if (!shop) {
      return handleError(res, HTTP_STATUS.BAD_REQUEST, "Missing shop parameter");
    }

    const session = await SessionRepository.findByShop(shop);

    if (!session) {
      return handleError(res, HTTP_STATUS.UNAUTHORIZED, "Session not found");
    }

    const tier = await SubscriptionService.getTier(session);

    if (tier === "free") {
      await MetafieldService.updateShopMetafield(session, "free");

      return res.send({
        hasActiveSubscription: false,
        tier,
      });
    }

    await MetafieldService.ensureAppMetafield(session);
    await MetafieldService.updateShopMetafield(session, "premium");

    res.send({
      hasActiveSubscription: true,
      tier,
    });
  } catch (err) {
    handleError(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, err.message);
  }
});

app.get("/api/createSubscription", async (req, res) => {
  try {
    const session = await getStoredSessionForShop(req.query.shop);

    const active = await BillingService.hasActivePlan(session);

    if (active) {
      await MetafieldService.updateShopMetafield(session, "premium");

      return res.send({
        isActiveSubscription: true,
        plan: PREMIUM_PLAN,
      });
    }

    const confirmationUrl = await BillingService.createSubscription(session);

    res.send({
      isActiveSubscription: false,
      plan: PREMIUM_PLAN,
      confirmationUrl,
    });
  } catch (err) {
    console.error("Create subscription failed:", {
      message: err.message,
      stack: err.stack,
      response: err.response,
      errorData: err.errorData,
    });

    const status =
      err.message === "Missing shop parameter"
        ? HTTP_STATUS.BAD_REQUEST
        : err.message === "Session not found"
          ? HTTP_STATUS.UNAUTHORIZED
          : HTTP_STATUS.INTERNAL_SERVER_ERROR;

    handleError(res, status, err.message);
  }
});

app.get("/api/cancelSubscription", async (req, res) => {
  try {
    const session = await getStoredSessionForShop(req.query.shop);

    const active = await BillingService.hasActivePlan(session);

    if (!active) {
      return res.send({ status: "No subscription found" });
    }

    const status = await BillingService.cancel(session);

    await MetafieldService.deleteAppMetafield(session);
    await MetafieldService.updateShopMetafield(session, "free");

    res.send({
      status,
      cancelledPlan: PREMIUM_PLAN,
    });
  } catch (err) {
    const status =
      err.message === "Missing shop parameter"
        ? HTTP_STATUS.BAD_REQUEST
        : err.message === "Session not found"
          ? HTTP_STATUS.UNAUTHORIZED
          : HTTP_STATUS.INTERNAL_SERVER_ERROR;

    handleError(res, status, err.message);
  }
});

/* ------------------------------------------------ */
/*            PROTECTED ROUTES (AUTH)                */
/* ------------------------------------------------ */

app.use("/api/*", shopify.validateAuthenticatedSession());

/* ------------------------------------------------ */
/*                FRONTEND SERVING                   */
/* ------------------------------------------------ */

app.use(shopify.cspHeaders());

app.use(serveStatic(STATIC_PATH, { index: false }));

app.use("/*", shopify.ensureInstalledOnShop(), async (_req, res) => {
  res
    .status(200)
    .set("Content-Type", "text/html")
    .send(readFileSync(join(STATIC_PATH, "index.html")));
});

app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);

/* ------------------------------------------------ */
/*                    GRAPHQL                        */
/* ------------------------------------------------ */

const CURRENT_APP_INSTALLATION = `
query appSubscription($namespace: String!, $key: String!) {
  currentAppInstallation {
    id
    metafield(namespace: $namespace, key: $key) {
      namespace
      key
      value
      id
    }
  }
}
`;

const CREATE_APP_DATA_METAFIELD = `
mutation CreateAppDataMetafield($metafieldsSetInput: [MetafieldsSetInput!]!) {
  metafieldsSet(metafields: $metafieldsSetInput) {
    metafields { id namespace key }
    userErrors { field message }
  }
}
`;

const APP_OWNED_METAFIELD_DELETE = `
mutation appOwnedMetafieldDelete($ownerId: ID!, $namespace: String!, $key: String!) {
  appOwnedMetafieldDelete(ownerId: $ownerId, namespace: $namespace, key: $key) {
    deletedId
    userErrors { field message }
  }
}
`;
