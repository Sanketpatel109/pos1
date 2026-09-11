import React from 'react';
import { AddProductModal, AddProductModalProps } from './AddProductModal';

/**
 * EditProductModal alias for AddProductModal to maintain modular interface naming.
 */
export const EditProductModal: React.FC<AddProductModalProps> = (props) => {
  return <AddProductModal {...props} />;
};

export default EditProductModal;
