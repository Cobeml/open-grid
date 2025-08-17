import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatUsage(kwh: number): string {
  if (kwh >= 1000000) return `${(kwh / 1000000).toFixed(1)}M kWh`;
  if (kwh >= 1000) return `${(kwh / 1000).toFixed(1)}k kWh`;
  return `${kwh.toFixed(1)} kWh`;
}

export function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString();
}

export function getUsageColor(usage: number): string {
  if (usage > 5000) return 'text-red-400';
  if (usage > 2000) return 'text-yellow-400';
  return 'text-green-400';
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'active': return 'text-green-400';
    case 'inactive': return 'text-gray-400';
    case 'maintenance': return 'text-yellow-400';
    case 'error': return 'text-red-400';
    default: return 'text-gray-400';
  }
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}