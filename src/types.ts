/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type MovementType = 'Carico' | 'Scarico';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  location: string;
}

export interface Movement {
  id: string; // e.g., C-1 or S-1
  type: MovementType;
  productName: string;
  brand: string;
  quantity: number;
  isNew: boolean;
  date: string;
  notes: string;
  // Fields for Carico
  supplier?: string;
  // Fields for Scarico
  assignee?: string;
}

export interface InventoryItem {
  productName: string;
  brand: string;
  total: number;
  newCount: number;
  usedCount: number;
}

export interface ProductType {
  id: string;
  name: string;
}
