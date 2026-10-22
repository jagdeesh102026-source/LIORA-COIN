import React from 'react';
import { ComponentStatus } from '../types';

interface BadgeProps {
  status: ComponentStatus | 'Completed' | 'In Progress' | 'Planned' | 'PROVISIONAL' | 'PENDING_APPROVAL' | 'APPROVED';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ status, size = 'sm' }) => {
  const sizeClasses = size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  const getStyle = () => {
    switch (status) {
      case 'Live':
      case 'Completed':
      case 'APPROVED':
        return {
          bg: 'rgba(53, 201, 145, 0.12)',
          border: 'rgba(53, 201, 145, 0.35)',
          text: '#35C991',
          dot: '#35C991',
        };
      case 'In Development':
      case 'In Progress':
        return {
          bg: 'rgba(99, 179, 255, 0.12)',
          border: 'rgba(99, 179, 255, 0.35)',
          text: '#63B3FF',
          dot: '#63B3FF',
        };
      case 'PROVISIONAL':
      case 'Planned':
        return {
          bg: 'rgba(244, 189, 94, 0.12)',
          border: 'rgba(244, 189, 94, 0.35)',
          text: '#F4BD5E',
          dot: '#F4BD5E',
        };
      case 'Not Configured':
      case 'PENDING_APPROVAL':
      default:
        return {
          bg: 'rgba(164, 177, 196, 0.1)',
          border: 'rgba(164, 177, 196, 0.25)',
          text: '#A4B1C4',
          dot: '#A4B1C4',
        };
    }
  };

  const style = getStyle();

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full ${sizeClasses}`}
      style={{
        backgroundColor: style.bg,
        border: `1px solid ${style.border}`,
        color: style.text,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full animate-pulse"
        style={{ backgroundColor: style.dot }}
      />
      {status}
    </span>
  );
};
