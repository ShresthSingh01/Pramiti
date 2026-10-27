import { DashboardData } from '../../lib/api';

let cachedDashboardData: DashboardData | null = null;

export const getCachedDashboardData = (): DashboardData | null => cachedDashboardData;

export const setCachedDashboardData = (data: DashboardData | null): void => {
  cachedDashboardData = data;
};

export const clearDashboardCache = (): void => {
  cachedDashboardData = null;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('dashboard:refresh'));
  }
};
