import { Badge } from '@/components/ui/badge';

const ORDER_STATUS_MAP = {
  confirmed: { label: 'Confirmed', variant: 'default', className: 'bg-emerald-600' },
  cancelled: { label: 'Cancelled', variant: 'destructive', className: '' },
  refund_requested: { label: 'Refund Requested', variant: 'outline', className: 'border-amber-500 text-amber-500' },
};

const PAYMENT_STATUS_MAP = {
  pending: { label: 'Pending', variant: 'secondary', className: 'bg-yellow-600/20 text-yellow-400' },
  completed: { label: 'Paid', variant: 'default', className: 'bg-emerald-600' },
  free: { label: 'Free', variant: 'secondary', className: '' },
  failed: { label: 'Failed', variant: 'destructive', className: '' },
  refunded: { label: 'Refunded', variant: 'outline', className: 'border-purple-500 text-purple-400' },
  partially_refunded: { label: 'Partial Refund', variant: 'outline', className: 'border-purple-500 text-purple-400' },
};

const TICKET_STATUS_MAP = {
  active: { label: 'Active', variant: 'default', className: 'bg-emerald-600' },
  cancelled: { label: 'Cancelled', variant: 'destructive', className: '' },
  refunded: { label: 'Refunded', variant: 'outline', className: 'border-purple-500 text-purple-400' },
  rescheduled: { label: 'Rescheduled', variant: 'outline', className: 'border-blue-500 text-blue-400' },
};

export function OrderStatusBadge({ status }) {
  const config = ORDER_STATUS_MAP[status] || { label: status, variant: 'secondary', className: '' };
  return <Badge variant={config.variant} className={`text-xs ${config.className}`}>{config.label}</Badge>;
}

export function PaymentStatusBadge({ status }) {
  const config = PAYMENT_STATUS_MAP[status] || { label: status, variant: 'secondary', className: '' };
  return <Badge variant={config.variant} className={`text-xs ${config.className}`}>{config.label}</Badge>;
}

export function TicketStatusBadge({ status }) {
  const config = TICKET_STATUS_MAP[status] || { label: status, variant: 'secondary', className: '' };
  return <Badge variant={config.variant} className={`text-xs ${config.className}`}>{config.label}</Badge>;
}