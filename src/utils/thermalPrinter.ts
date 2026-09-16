/**
 * Direct Thermal Printing Utility for MonoPOS
 * Uses an isolated hidden iframe with clean thermal paper styling.
 * Guaranteed to print cleanly across all browsers without parent CSS clipping or dark mode distortion.
 */
export function printThermalHtml(htmlContent: string, title: string = 'MonoPOS Receipt'): boolean {
  try {
    // Remove any previous print iframe
    const existingFrame = document.getElementById('monopos-thermal-print-frame');
    if (existingFrame) {
      existingFrame.remove();
    }

    const iframe = document.createElement('iframe');
    iframe.id = 'monopos-thermal-print-frame';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return false;
    }

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${title}</title>
          <style>
            @page {
              size: auto;
              margin: 0mm;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            body {
              font-family: 'Courier New', Courier, monospace, system-ui;
              font-size: 11px;
              line-height: 1.3;
              color: #000000;
              background: #ffffff;
              width: 100%;
              max-width: 320px;
              margin: 0 auto;
              padding: 10px 8px;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .font-extrabold { font-weight: 800; }
            .uppercase { text-transform: uppercase; }
            .divider { border-bottom: 1px dashed #000000; margin: 6px 0; }
            .double-divider { border-bottom: 2px solid #000000; margin: 6px 0; }
            .dotted-divider { border-bottom: 1px dotted #000000; margin: 5px 0; }
            .row { display: flex; justify-content: space-between; align-items: baseline; }
            table { width: 100%; border-collapse: collapse; table-layout: fixed; }
            th, td { padding: 2px 0; vertical-align: top; }
            .mt-1 { margin-top: 4px; }
            .mb-1 { margin-bottom: 4px; }
            .py-1 { padding: 3px 0; }
          </style>
        </head>
        <body>
          ${htmlContent}
        </body>
      </html>
    `);
    doc.close();

    // Give browser a moment to parse DOM & images before invoking print
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.warn('Iframe print error, falling back to window.print():', err);
        window.print();
      }
    }, 150);

    return true;
  } catch (err) {
    console.error('Thermal print failed:', err);
    window.print();
    return false;
  }
}
