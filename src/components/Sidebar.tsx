import React from 'react';
import { NavigationDrawer, NavigationDrawerProps } from './NavigationDrawer';

export type SidebarProps = NavigationDrawerProps;
export const Sidebar: React.FC<SidebarProps> = (props) => {
  return <NavigationDrawer {...props} />;
};

export { NavigationDrawer };
