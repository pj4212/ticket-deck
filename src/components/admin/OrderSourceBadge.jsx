import { Badge } from '@/components/ui/badge';

const SOURCE_MAP = {
  online: { label: 'Online', className: 'bg-blue-600/20 text-blue-400 border-blue-500/30' },
  manual: { label: 'Manual', className: 'bg-violet-600/20 text-violet-400 border-violet-500/30' },
  box_office: { label: 'Box Office', className: 'bg-amber-600/20 text-amber-400 border-amber-500/30' },
  complimentary: { label: 'Comp', className: 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30' },
};

export default function OrderSourceBadge({ source }) {
  const config = SOURCE_MAP[source] || SOURCE_MAP.online;
  return <Badge variant="outline" className={`text-xs ${config.className}`}>{config.label}</Badge>;
}