import test from 'node:test';
import assert from 'node:assert/strict';
import { calculatePayment } from '../src/lib/finance.js';

test('calculates a fully paid cash invoice', () => {
  assert.deepEqual(
    calculatePayment({ finalPayable: 1800, paymentMode: 'CASH', paidAmountInput: '' }),
    {
      paymentBreakdown: { cash: 1800, upi: 0, other: 0 },
      paidAmount: 1800,
      udhaarAmount: 0
    }
  );
});

test('calculates split cash and UPI payment with remaining credit', () => {
  assert.deepEqual(
    calculatePayment({
      finalPayable: 2000,
      paymentMode: 'SPLIT',
      cashPaidInput: '500',
      upiPaidInput: '1000',
      otherPaidInput: '0'
    }),
    {
      paymentBreakdown: { cash: 500, upi: 1000, other: 0 },
      paidAmount: 1500,
      udhaarAmount: 500
    }
  );
});

test('does not allow payment to exceed the bill', () => {
  const result = calculatePayment({
    finalPayable: 1000,
    paymentMode: 'SPLIT',
    cashPaidInput: '900',
    upiPaidInput: '900',
    otherPaidInput: '0'
  });
  assert.equal(result.paidAmount, 1000);
  assert.equal(result.udhaarAmount, 0);
});
