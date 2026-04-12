import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Monitor, MapPin, Download } from "lucide-react";

export default function TicketCard({ ticket, event }) {
  const qrUrl = ticket.qr_code_url || `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(ticket.qr_code_hash)}`;
  const isOnline = ticket.attendance_mode === 'online';
  const validQr = ticket.qr_code_hash && ticket.qr_code_hash !== 'pending' && ticket.qr_code_hash !== 'temp';

  const handleDownloadQr = () => {
    const a = document.createElement('a');
    a.href = qrUrl;
    a.download = `ticket-${ticket.attendee_first_name}-${ticket.attendee_last_name}.png`;
    a.target = '_blank';
    a.click();
  };

  return (
    <div className="border rounded-xl p-4 bg-card">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-semibold">{ticket.attendee_first_name} {ticket.attendee_last_name}</p>
          <p className="text-sm text-muted-foreground">{ticket.attendee_email}</p>
        </div>
        <Badge variant={isOnline ? 'secondary' : 'default'}>
          {isOnline ? <><Monitor className="h-3 w-3 mr-1" />Online</> : <><MapPin className="h-3 w-3 mr-1" />In-Person</>}
        </Badge>
      </div>

      <p className="text-sm mb-1"><span className="text-muted-foreground">Type:</span> {ticket.ticket_type_name || 'General'}</p>

      {isOnline && ticket.zoom_join_url && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mt-3">
          <p className="text-sm font-medium text-foreground">Join Online</p>
          <a href={ticket.zoom_join_url} target="_blank" rel="noopener noreferrer"
             className="inline-block bg-primary text-primary-foreground text-sm font-medium px-4 py-2 rounded-md mt-2 hover:opacity-90 transition-opacity">
            Join Webinar →
          </a>
        </div>
      )}

      {isOnline && !ticket.zoom_join_url && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mt-3">
          <p className="text-sm font-medium text-foreground">Online Event</p>
          <p className="text-xs text-muted-foreground">Join link will be emailed before the event.</p>
        </div>
      )}

      {!isOnline && event?.venue_details && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 mt-3">
          <p className="text-sm font-medium text-foreground">Venue</p>
          <p className="text-sm text-muted-foreground">{event.venue_details}</p>
        </div>
      )}

      {!isOnline && validQr && (
        <div className="mt-4 text-center">
          <img src={qrUrl} alt="QR Code" className="w-44 h-44 mx-auto rounded-lg" />
          <p className="text-xs text-muted-foreground mt-2">Present at door for entry</p>
          <Button variant="ghost" size="sm" className="mt-1" onClick={handleDownloadQr}>
            <Download className="h-3.5 w-3.5 mr-1" />Download QR
          </Button>
        </div>
      )}

      {ticket.check_in_status === 'checked_in' && (
        <Badge className="mt-3" variant="default">✓ Checked In</Badge>
      )}
    </div>
  );
}