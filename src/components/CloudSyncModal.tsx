import React from 'react';
import { PrintSettingsModal, PrintSettingsModalProps } from './PrintSettingsModal';
import { ShopSettings, StaffRole } from '../types';

export interface CloudSyncModalProps extends Partial<PrintSettingsModalProps> {
  isOpen: boolean;
  onClose: () => void;
  activeStaffRole?: StaffRole;
}

/**
 * CloudSyncModal is now consolidated under:
 * Settings ➔ Cloud & Backup ➔ Advanced Diagnostics
 * Enforcing that only Store Owner or Manager can view collection health and cloud credentials.
 */
import { DEFAULT_SHOP_SETTINGS } from '../data/catalog';

export const CloudSyncModal: React.FC<CloudSyncModalProps> = (props) => {
  const defaultSettings: ShopSettings = props.settings || DEFAULT_SHOP_SETTINGS;

  return (
    <PrintSettingsModal
      {...props}
      settings={defaultSettings}
      onSaveSettings={props.onSaveSettings || (() => {})}
      initialTab="cloud"
      initialSubView="diagnostics"
    />
  );
};
