import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

export interface Barcode128Props {
  value: string;
  width?: number;
  height?: number;
  displayValue?: boolean;
  fontSize?: number;
  className?: string;
  lineColor?: string;
  background?: string;
}

/**
 * Standard Code-128 1D Barcode Component.
 * Supports universal scanning with all laser, CCD, and smartphone camera scanners.
 */
export const Barcode128: React.FC<Barcode128Props> = ({
  value,
  width = 1.4,
  height = 36,
  displayValue = true,
  fontSize = 11,
  className = '',
  lineColor = '#000000',
  background = 'transparent',
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current || !value) return;

    try {
      JsBarcode(svgRef.current, value, {
        format: 'CODE128',
        width,
        height,
        displayValue,
        fontSize,
        font: 'monospace',
        textAlign: 'center',
        textPosition: 'bottom',
        textMargin: 2,
        margin: 0,
        lineColor,
        background,
      });
    } catch (err) {
      console.warn('Failed to render Code128 barcode:', err);
    }
  }, [value, width, height, displayValue, fontSize, lineColor, background]);

  if (!value) return null;

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <svg ref={svgRef} className="max-w-full" />
    </div>
  );
};

/**
 * Generates an SVG string representation of Code-128 for direct inclusion in thermal printer HTML.
 */
export const getBarcodeSvgString = (
  value: string,
  options: {
    width?: number;
    height?: number;
    displayValue?: boolean;
    fontSize?: number;
    lineColor?: string;
  } = {}
): string => {
  if (!value || typeof document === 'undefined') {
    return `<div style="font-family: monospace; font-size: 11px; text-align: center; font-weight: bold;">*${value}*</div>`;
  }

  try {
    const svgNode = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    JsBarcode(svgNode, value, {
      format: 'CODE128',
      width: options.width ?? 1.3,
      height: options.height ?? 34,
      displayValue: options.displayValue ?? true,
      fontSize: options.fontSize ?? 10,
      font: 'monospace',
      textAlign: 'center',
      textPosition: 'bottom',
      textMargin: 2,
      margin: 0,
      lineColor: options.lineColor ?? '#000000',
      background: '#ffffff',
    });
    return svgNode.outerHTML;
  } catch (err) {
    console.warn('Failed to generate thermal barcode SVG string:', err);
    return `<div style="font-family: monospace; font-size: 11px; text-align: center; font-weight: bold; letter-spacing: 0.15em;">*${value}*</div>`;
  }
};
