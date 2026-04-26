import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { paymentId, amount, description, email } = await req.json();
    if (!paymentId || !amount) {
      return Response.json({ error: 'Mangler påkrevde felter' }, { status: 400 });
    }

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      return Response.json({ error: 'Stripe ikke konfigurert' }, { status: 500 });
    }

    const stripe = new Stripe(stripeKey);

    // Create a price on-the-fly
    const price = await stripe.prices.create({
      currency: 'nok',
      unit_amount: Math.round(amount * 100),
      product_data: {
        name: description || 'KlubbFinans betaling',
      },
    });

    // Create payment link
    const paymentLink = await stripe.paymentLinks.create({
      line_items: [{ price: price.id, quantity: 1 }],
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        payment_requirement_id: paymentId,
      },
      after_completion: {
        type: 'redirect',
        redirect: { url: `${req.headers.get('origin') || 'https://app.base44.com'}/payments?stripe_paid=${paymentId}` },
      },
    });

    console.log(`Stripe payment link created for payment ${paymentId}: ${paymentLink.url}`);

    return Response.json({ ok: true, url: paymentLink.url, linkId: paymentLink.id });
  } catch (error) {
    console.error('createStripePaymentLink error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});