import { NextRequest, NextResponse } from 'next/server';
import { createInvoicePaymentLink } from '@/lib/payments';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body?.requestNumber || !body?.amount) {
    return NextResponse.json({ ok: false, error: 'requestNumber and amount are required.' }, { status: 400 });
  }

  const link = await createInvoicePaymentLink({
    requestNumber: body.requestNumber,
    amountDollars: Number(body.amount),
    customerEmail: body.customerEmail
  });

  return NextResponse.json({ ok: true, ...link });
}
