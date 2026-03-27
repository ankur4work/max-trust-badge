import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI || "";
const dbName = process.env.MONGODB_DB || "mx-trust-badges";
const collectionName = "shopify_sessions"; // Collection to store sessions

let client;

export const connectToMongoDB = async () => {
  if (!client) {
    client = new MongoClient(uri);
    await client.connect();
    console.log("Connected to MongoDB for session storage");
  }
  return client.db(dbName).collection(collectionName);
};
