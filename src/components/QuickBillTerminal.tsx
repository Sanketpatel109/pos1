import React from 'react';
import { QuickBillPOS, QuickBillPOSProps } from './QuickBillPOS';

export type QuickBillTerminalProps = QuickBillPOSProps;

export const QuickBillTerminal: React.FC<QuickBillTerminalProps> = (props) => {
  return <QuickBillPOS {...props} />;
};

export default QuickBillTerminal;
