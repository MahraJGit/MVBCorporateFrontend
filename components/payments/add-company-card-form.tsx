"use client";

import { useEffect, useState } from "react";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createOrgSetupIntent } from "@/features/billing/api";
import { t } from "@/lib/i18n";
import { getStripe } from "@/lib/stripe";

function SetupForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => void;
  onCancel?: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || submitting) return;
    setSubmitting(true);
    try {
      const { error } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: "if_required",
      });
      if (error) {
        toast.error(error.message ?? t("events.cardSaveError"));
        return;
      }
      toast.success(t("events.cardSaved"));
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("events.cardSaveError"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
      <PaymentElement
        onReady={() => setReady(true)}
        options={{
          layout: "tabs",
          wallets: { applePay: "never", googlePay: "never" },
        }}
      />
      <div className="flex gap-2">
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="inline-flex h-10 flex-1 items-center justify-center rounded-xl border border-border text-sm font-medium hover:bg-accent disabled:opacity-50"
          >
            {t("events.cancel")}
          </button>
        ) : null}
        <button
          type="submit"
          disabled={!stripe || !elements || !ready || submitting}
          className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {t("events.saveCard")}
        </button>
      </div>
    </form>
  );
}

export function AddCompanyCardForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => void;
  onCancel?: () => void;
}) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void createOrgSetupIntent()
      .then((res) => {
        if (!cancelled) setClientSecret(res.data.clientSecret);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t("events.cardInitError"));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <p className="inline-flex items-center gap-2 py-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {t("events.cardPreparing")}
      </p>
    );
  }

  if (error || !clientSecret) {
    return <p className="text-sm text-destructive">{error ?? t("events.cardInitError")}</p>;
  }

  const dark =
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark");

  return (
    <Elements
      stripe={getStripe()}
      options={{
        clientSecret,
        appearance: {
          theme: dark ? "night" : "stripe",
        },
      }}
    >
      <SetupForm onSuccess={onSuccess} onCancel={onCancel} />
    </Elements>
  );
}
