import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { memberCount, successUrl, cancelUrl } = await req.json();

    if (!memberCount || memberCount < 1) {
      return Response.json({ error: 'Ugyldig antall medlemmer' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: 'price_1TP6IUGsNCRfcbAZxqMwiN7k',
          quantity: memberCount,
        },
      ],
      success_url: successUrl || `${req.headers.get('origin')}/settings?subscription=success`,
      cancel_url: cancelUrl || `${req.headers.get('origin')}/settings?subscription=cancelled`,
      customer_email: user.email,
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        user_email: user.email,
        member_count: memberCount,
      },
      subscription_data: {
        metadata: {
          base44_app_id: Deno.env.get('BASE44_APP_ID'),
          user_email: user.email,
        },
      },
    });

    console.log(`Created subscription session for ${user.email}, members: ${memberCount}`);
    return Response.json({ url: session.url });
  } catch (error) {
    console.error('Stripe error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});