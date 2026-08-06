'use client';

type CardStatusBadgeProps = {
  status: string;
};

export const CardStatusBadge = ({ status }: CardStatusBadgeProps) => {
  const getStatusClasses = () => {
    switch (status) {
      case 'active':
        return 'bg-blue-100 text-blue-700';
      case 'inactive':
        return 'bg-yellow-100 text-yellow-800';
      case 'canceled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${getStatusClasses()}`}
    >
      {status}
    </span>
  );
};

