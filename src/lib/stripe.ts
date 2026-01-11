import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // ✅ Don't set apiVersion here. It avoids TS literal mismatches and uses your Stripe account's default API version.
});