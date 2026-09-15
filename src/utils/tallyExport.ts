import { Order } from '../types';

/**
 * Formats date to Tally standard format: YYYYMMDD
 */
function formatTallyDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}${mm}${dd}`;
  } catch {
    return '20260101';
  }
}

/**
 * Sanitizes XML string values
 */
function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generates official Tally Prime / ERP 9 compliant XML for Sales Vouchers
 */
export function generateTallySalesXml(orders: Order[], shopName = 'MonoPOS Retail'): string {
  const validOrders = orders.filter((o) => (o.status as string) !== 'cancelled' && (o.status as string) !== 'refunded' && (o.status as string) !== 'VOID');

  let vouchersXml = '';

  for (const order of validOrders) {
    const tallyDate = formatTallyDate(order.createdAt);
    const voucherNo = escapeXml(
      order.orderNumberFormatted || String(order.orderNumber || order.id.slice(-6))
    );
    const partyName = escapeXml(
      order.customerName ||
        (order.paymentMethod === 'CASH'
          ? 'Cash'
          : order.paymentMethod === 'ONLINE'
          ? 'Bank / UPI'
          : 'Sundry Debtors')
    );
    const totalAmount = Number(order.total || 0).toFixed(2);
    const taxAmount = Number(order.taxAmount || 0).toFixed(2);
    const subtotal = (Number(totalAmount) - Number(taxAmount)).toFixed(2);

    // Ledger entries
    vouchersXml += `
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <VOUCHER VCHTYPE="Sales" ACTION="Create">
            <DATE>${tallyDate}</DATE>
            <GUID>MONOPOS-${order.id}</GUID>
            <VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>
            <VOUCHERNUMBER>${voucherNo}</VOUCHERNUMBER>
            <PARTYLEDGERNAME>${partyName}</PARTYLEDGERNAME>
            <NARRATION>MonoPOS Sale Invoice #${voucherNo} via ${order.paymentMethod} - ${escapeXml(shopName)}</NARRATION>
            <EFFECTIVEDATE>${tallyDate}</EFFECTIVEDATE>
            <ISINVOICE>Yes</ISINVOICE>

            <!-- Debit Entry: Party or Cash/Bank -->
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${partyName}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <AMOUNT>-${totalAmount}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>

            <!-- Credit Entry: Sales Account -->
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Sales Account</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>${subtotal}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
`;

    // Add GST Output Tax Ledgers if tax applies
    if (Number(taxAmount) > 0) {
      const halfTax = (Number(taxAmount) / 2).toFixed(2);
      vouchersXml += `
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Output CGST</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>${halfTax}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Output SGST</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>${halfTax}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
`;
    }

    vouchersXml += `          </VOUCHER>
        </TALLYMESSAGE>`;
  }

  return `<?xml version="1.0" encoding="utf-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${escapeXml(shopName)}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>${vouchersXml}
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
}

/**
 * Downloads Tally XML file directly in browser
 */
export function downloadTallyXml(orders: Order[], shopName = 'MonoPOS Retail'): void {
  const xmlContent = generateTallySalesXml(orders, shopName);
  const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const dateStr = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.setAttribute('download', `Tally_Sales_Vouchers_${dateStr}.xml`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
