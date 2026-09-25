import { loadStripe, type Stripe } from "@stripe/stripe-js";

let stripePromise: Promise<Stripe | null> | null = null;

export function getStripePublishableKey(): string | null {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();
  return key || null;
}

export function getStripe(): Promise<Stripe | null> {
  const key = getStripePublishableKey();
  if (!key) {
    return Promise.resolve(null);
  }
  if (!stripePromise) {
    stripePromise = loadStripe(key);
  }
  return stripePromise;
}

export async function confirmCardPaymentIfNeeded(clientSecret: string) {
  const stripe = await getStripe();
  if (!stripe) {
    throw new Error("Stripe is not configured.");
  }
  const returnUrl =
    typeof window !== "undefined"
      ? window.location.href
      : undefined;
  const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
    ...(returnUrl ? { return_url: returnUrl } : {}),
  });
  if (error) {
    throw new Error(error.message ?? "Card authentication failed.");
  }
  if (!paymentIntent?.id) {
    throw new Error("Payment could not be confirmed.");
  }
  return paymentIntent.id;
}
