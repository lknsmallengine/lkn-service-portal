import Stripe from 'stripe';

export function getStripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

export async function createInvoicePaymentLink(opts: {
  requestNumber: string;
  amountDollars: number;
  customerEmail?: string;
}) {
  const stripe = getStripeClient();
  if (!stripe) {
    return {
      url: '#',
      mode: 'demo'
    };
  }

  const price = await stripe.prices.create({
    currency: 'usd',
    unit_amount: Math.round(opts.amountDollars * 100),
    product_data: {
      name: `LKN Service Invoice ${opts.requestNumber}`
    }
  });

  const paymentLink = await stripe.paymentLinks.create({
    line_items: [{ price: price.id, quantity: 1 }],
    metadata: { request_number: opts.requestNumber },
    customer_creation: 'if_required'
  });

  return {
    url: paymentLink.url,
    mode: 'live'
  };
}
