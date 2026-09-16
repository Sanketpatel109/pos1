import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

export interface Barcode128Props {
  value: string;
  width?: number;
  height?: number;
  displayValue?: boolean;
  fontSize?: number;
  margin?: number;
  className?: string;
}

export const Barcode128: React.FC<Barcode128Props> = ({
  value,
  width = 1.6,
  height = 40,
  displayValue = true,
  fontSize = 11,
  margin = 2,
  className = '',
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format: 'CODE128',
          width,
          height,
          displayValue,
          fontSize,
          margin,
          background: 'transparent',
          lineColor: '#000000',
          font: 'monospace',
          textMargin: 2,
        });
      } catch (err) {
        console.warn('Barcode128 render warning:', err);
      }
    }
  }, [value, width, height, displayValue, fontSize, margin]);

  if (!value) return null;

  return (
    <svg
      ref={svgRef}
      className={`max-w-full inline-block ${className}`}
      style={{ display: 'block', margin: '0 auto' }}
    />
  );
};

/**
 * Synchronously generates an SVG string for a Code-128 barcode.
 * Suitable for embedding directly into thermal HTML print receipts.
 */
export function generateBarcode128SvgString(
  value: string,
  options?: { width?: number; height?: number; displayValue?: boolean; fontSize?: number }
): string {
  if (typeof document === 'undefined' || !value) {
    return `<div style="font-family: monospace; font-weight: bold; border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 2px 0; text-align: center;">*${value}*</div>`;
  }
  try {
    const svgNode = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    JsBarcode(svgNode, value, {
      format: 'CODE128',
      width: options?.width ?? 1.5,
      height: options?.height ?? 34,
      displayValue: options?.displayValue ?? true,
      fontSize: options?.fontSize ?? 10,
      margin: 2,
      background: 'transparent',
      lineColor: '#000000',
      font: 'monospace',
      textMargin: 2,
    });
    return svgNode.outerHTML;
  } catch (err) {
    console.warn('Failed to generate barcode SVG string:', err);
    return `<div style="font-family: monospace; font-weight: bold; border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 2px 0; text-align: center;">*${value}*</div>`;
  }
}

export default Barcode128;
