import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { paymentId, phone, amount, description } = await req.json();
    if (!paymentId || !phone || !amount) {
      return Response.json({ error: 'Mangler påkrevde felter' }, { status: 400 });
    }

    const clientId = Deno.env.get('VIPPS_CLIENT_ID');
    const clientSecret = Deno.env.get('VIPPS_CLIENT_SECRET');
    const subscriptionKey = Deno.env.get('VIPPS_SUBSCRIPTION_KEY');
    const msn = Deno.env.get('VIPPS_MERCHANT_SERIAL_NUMBER');

    const hasVippsCredentials = clientId && clientSecret && subscriptionKey && msn;

    if (hasVippsCredentials) {
      // --- Real Vipps ePayment API flow ---
      // 1. Get access token
      const tokenRes = await fetch('https://api.vipps.no/accesstoken/get', {
        method: 'POST',
        headers: {
          'client_id': clientId,
          'client_secret': clientSecret,
          'Ocp-Apim-Subscription-Key': subscriptionKey,
          'Merchant-Serial-Number': msn,
        },
      });
      const tokenData = await tokenRes.json();
      const accessToken = tokenData.access_token;
      if (!accessToken) {
        console.error('Vipps token error:', tokenData);
        return Response.json({ error: 'Kunne ikke hente Vipps-token' }, { status: 502 });
      }

      // 2. Initiate ePayment
      const orderId = `klubbfinans-${paymentId}-${Date.now()}`;
      const payRes = await fetch('https://api.vipps.no/epayment/v1/payments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Ocp-Apim-Subscription-Key': subscriptionKey,
          'Merchant-Serial-Number': msn,
          'Content-Type': 'application/json',
          'Idempotency-Key': orderId,
        },
        body: JSON.stringify({
          amount: { currency: 'NOK', value: Math.round(amount * 100) },
          paymentMethod: { type: 'WALLET' },
          customer: { phoneNumber: phone.replace(/\s/g, '') },
          reference: orderId,
          returnUrl: `${req.headers.get('origin') || 'https://app.base44.com'}/payments?vipps_order=${orderId}`,
          userFlow: 'PUSH_MESSAGE',
          paymentDescription: description || 'KlubbFinans betaling',
        }),
      });
      const payData = await payRes.json();
      console.log('Vipps payment initiated:', payData);

      if (!payRes.ok) {
        return Response.json({ error: payData?.detail || 'Vipps-feil' }, { status: 502 });
      }

      // Mark as pending (webhook will confirm later)
      return Response.json({ ok: true, mode: 'vipps', orderId, redirectUrl: payData.redirectUrl });

    } else {
      // --- Simulation mode (no credentials set) ---
      console.log(`[SIMULERT] Vipps betaling: ${amount} kr til tlf ${phone} for krav ${paymentId}`);

      // Mark payment as paid directly in simulation
      const payment = await base44.asServiceRole.entities.PaymentRequirement.filter({ id: paymentId });
      if (payment && payment.length > 0) {
        const p = payment[0];
        await base44.asServiceRole.entities.PaymentRequirement.update(paymentId, {
          amount_paid: p.total_amount,
          status: 'paid',
        });
      }

      return Response.json({ ok: true, mode: 'simulated', message: 'Betaling registrert (simulert modus)' });
    }
  } catch (error) {
    console.error('vippsPayment error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});