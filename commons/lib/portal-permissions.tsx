"use client";
import { createContext, useContext } from 'react';
export type PortalPermissions = { defaults: string[]; catalog: string[]; publish: 'none'|'department'|'company'; edit_apps: boolean; manage_access: boolean };
export const emptyPermissions: PortalPermissions = { defaults:[],catalog:[],publish:'none',edit_apps:false,manage_access:false };
export const PermissionContext=createContext<PortalPermissions>(emptyPermissions);
export const usePortalPermissions=()=>useContext(PermissionContext);
