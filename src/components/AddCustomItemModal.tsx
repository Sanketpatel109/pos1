import React from 'react';
import { CustomItemModal, CustomItemModalProps } from './CustomItemModal';

/**
 * AddCustomItemModal alias for CustomItemModal to maintain consistent naming.
 */
export const AddCustomItemModal: React.FC<CustomItemModalProps> = (props) => {
  return <CustomItemModal {...props} />;
};

export default AddCustomItemModal;
