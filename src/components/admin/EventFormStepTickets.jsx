import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Ticket, Plus, Trash2, GripVertical, Monitor, MapPin } from 'lucide-react';

export default function EventFormStepTickets({ form, ticketTypes, setTicketTypes }) {
  const isHybrid = form.event_mode === 'hybrid';

  const addTicketType = (mode) => {
    setTicketTypes(prev => [...prev, {
      name: '', attendance_mode: mode || 'in_person', price: 0,
      capacity_limit: '', is_active: true, sort_order: prev.length, description: '',
      per_order_limit: '',
    }]);
  };

  const updateTicketType = (index, field, value) => {
    setTicketTypes(prev => prev.map((tt, i) => i === index ? { ...tt, [field]: value } : tt));
  };

  const removeTicketType = (index) => {
    setTicketTypes(prev => prev.filter((_, i) => i !== index));
  };

  const onlineTypes = ticketTypes.filter(tt => tt.attendance_mode === 'online');
  const inPersonTypes = ticketTypes.filter(tt => tt.attendance_mode === 'in_person');

  const renderTicketCard = (tt, globalIndex) => {
    const isOnline = tt.attendance_mode === 'online';
    return (
      <div key={globalIndex} className={`border rounded-xl p-4 space-y-3 ${tt.is_active === false ? 'opacity-50' : ''}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Ticket {globalIndex + 1}</span>
            <Badge variant="outline" className="text-xs gap-1">
              {isOnline ? <><Monitor className="h-3 w-3" />Online</> : <><MapPin className="h-3 w-3" />In-Person</>}
            </Badge>
          </div>
          <Button variant="ghost" size="icon" onClick={() => removeTicketType(globalIndex)} className="h-8 w-8">
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Ticket Name <span className="text-destructive">*</span></Label>
            <Input value={tt.name} onChange={e => updateTicketType(globalIndex, 'name', e.target.value)} placeholder="e.g. General Admission" />
          </div>
          <div>
            <Label className="text-xs">Description</Label>
            <Input value={tt.description || ''} onChange={e => updateTicketType(globalIndex, 'description', e.target.value)} placeholder="Brief ticket description" />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <Label className="text-xs">Price (AUD)</Label>
            <Input type="number" min="0" step="0.01" value={tt.price} onChange={e => updateTicketType(globalIndex, 'price', e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Capacity</Label>
            <Input type="number" min="0" value={tt.capacity_limit || ''} onChange={e => updateTicketType(globalIndex, 'capacity_limit', e.target.value)} placeholder="∞" />
          </div>
          <div>
            <Label className="text-xs">Per-Order Limit</Label>
            <Input type="number" min="1" value={tt.per_order_limit || ''} onChange={e => updateTicketType(globalIndex, 'per_order_limit', e.target.value)} placeholder="10" />
          </div>
          <div>
            <Label className="text-xs">Sort Order</Label>
            <Input type="number" className="w-full" value={tt.sort_order || 0} onChange={e => updateTicketType(globalIndex, 'sort_order', e.target.value)} />
          </div>
        </div>

        {/* Mode selector for non-hybrid */}
        {!isHybrid && (
          <div>
            <Label className="text-xs">Attendance Mode</Label>
            <Select value={tt.attendance_mode} onValueChange={v => updateTicketType(globalIndex, 'attendance_mode', v)}>
              <SelectTrigger className="max-w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="in_person">In-Person</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex items-center gap-3">
          <Switch checked={tt.is_active !== false} onCheckedChange={v => updateTicketType(globalIndex, 'is_active', v)} />
          <Label className="text-xs">Active</Label>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <Ticket className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold">Ticket Types</h2>
      </div>

      {isHybrid ? (
        <>
          {/* In-Person tickets */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-emerald-500" />
                <h3 className="text-sm font-semibold">In-Person Tickets</h3>
                <Badge variant="outline" className="text-xs">{inPersonTypes.length}</Badge>
              </div>
              <Button variant="outline" size="sm" onClick={() => addTicketType('in_person')} className="gap-1">
                <Plus className="h-3 w-3" />Add
              </Button>
            </div>
            <div className="space-y-3">
              {ticketTypes.map((tt, i) => tt.attendance_mode === 'in_person' ? renderTicketCard(tt, i) : null)}
              {inPersonTypes.length === 0 && <p className="text-xs text-muted-foreground text-center py-3 border border-dashed rounded-lg">No in-person tickets</p>}
            </div>
          </div>

          {/* Online tickets */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Monitor className="h-4 w-4 text-blue-500" />
                <h3 className="text-sm font-semibold">Online Tickets</h3>
                <Badge variant="outline" className="text-xs">{onlineTypes.length}</Badge>
              </div>
              <Button variant="outline" size="sm" onClick={() => addTicketType('online')} className="gap-1">
                <Plus className="h-3 w-3" />Add
              </Button>
            </div>
            <div className="space-y-3">
              {ticketTypes.map((tt, i) => tt.attendance_mode === 'online' ? renderTicketCard(tt, i) : null)}
              {onlineTypes.length === 0 && <p className="text-xs text-muted-foreground text-center py-3 border border-dashed rounded-lg">No online tickets</p>}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => addTicketType(form.event_mode === 'online_stream' ? 'online' : 'in_person')} className="gap-1">
              <Plus className="h-4 w-4" />Add Ticket Type
            </Button>
          </div>
          <div className="space-y-3">
            {ticketTypes.map((tt, i) => renderTicketCard(tt, i))}
            {ticketTypes.length === 0 && (
              <div className="text-center py-8 border border-dashed rounded-xl">
                <Ticket className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No ticket types yet. Add one to get started.</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}