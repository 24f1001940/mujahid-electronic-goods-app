export function calculatePayment({
  finalPayable,
  paymentMode,
  paidAmountInput,
  cashPaidInput,
  upiPaidInput,
  otherPaidInput
}) {
  const paymentBreakdown = paymentMode === 'SPLIT'
    ? {
        cash: Math.max(0, Number(cashPaidInput) || 0),
        upi: Math.max(0, Number(upiPaidInput) || 0),
        other: Math.max(0, Number(otherPaidInput) || 0)
      }
    : {
        cash: paymentMode === 'CASH' ? (paidAmountInput === '' ? finalPayable : Math.max(0, Number(paidAmountInput) || 0)) : 0,
        upi: paymentMode === 'UPI' ? (paidAmountInput === '' ? finalPayable : Math.max(0, Number(paidAmountInput) || 0)) : 0,
        other: 0
      };

  const paidAmount = Math.min(
    Math.max(0, finalPayable),
    paymentBreakdown.cash + paymentBreakdown.upi + paymentBreakdown.other
  );

  return {
    paymentBreakdown,
    paidAmount,
    udhaarAmount: Math.max(0, finalPayable - paidAmount)
  };
}
