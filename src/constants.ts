/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Movement } from './types';

export const INITIAL_PRODUCT_TYPES = [
  'Monitor',
  'Laptop',
  'Docking Station',
  'Mouse',
  'Tastiera',
  'Cuffie'
];

export const STORAGE_KEYS = {
  MOVEMENTS: 'warehouse_movements',
  PRODUCT_TYPES: 'warehouse_product_types',
  BRANDS: 'warehouse_brands',
  USERS: 'warehouse_users',
};

export const INITIAL_BRANDS = [
  'Dell',
  'HP',
  'Lenovo',
  'Apple',
  'Logitech',
  'Microsoft'
];

export const INITIAL_LOCATIONS = [
  'Milano',
  'Madrid',
  'Barcellona',
  'Roma',
  'Parigi',
  'Londra'
];

export const exportToCSV = (data: any[], filename: string) => {
  const csvRows = [];
  const headers = Object.keys(data[0]);
  csvRows.push(headers.join(','));

  for (const row of data) {
    const values = headers.map(header => {
      const escaped = ('' + row[header]).replace(/"/g, '\\"');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  }

  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.setAttribute('hidden', '');
  a.setAttribute('href', url);
  a.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};
