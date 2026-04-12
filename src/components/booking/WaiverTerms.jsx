import { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Shield, FileText, Megaphone } from 'lucide-react';

export default function WaiverTerms({
  waiverText,
  termsText,
  showMarketingOptIn,
  marketingLabel,
  waiverAccepted,
  termsAccepted,
  marketingOptIn,
  onWaiverChange,
  onTermsChange,
  onMarketingChange,
  errors,
}) {
  const [waiverExpanded, setWaiverExpanded] = useState(false);

  const hasWaiver = !!waiverText;
  const hasTerms = !!termsText;
  if (!hasWaiver && !hasTerms && !showMarketingOptIn) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">Terms & Agreements</h2>
      </div>

      {/* Waiver */}
      {hasWaiver && (
        <div className={`border rounded-xl overflow-hidden ${errors?.waiver ? 'border-destructive/50' : 'border-border'}`}>
          <div className="px-4 py-3 bg-muted/50 border-b border-border flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">Participant Waiver</span>
            <span className="text-destructive text-xs ml-1">Required</span>
          </div>
          <div className="px-4 py-3">
            {waiverText.length > 300 ? (
              <>
                <ScrollArea className={`${waiverExpanded ? 'max-h-64' : 'max-h-24'} transition-all`}>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{waiverText}</p>
                </ScrollArea>
                <button
                  type="button"
                  onClick={() => setWaiverExpanded(!waiverExpanded)}
                  className="text-xs text-primary hover:underline mt-1"
                >
                  {waiverExpanded ? 'Show less' : 'Read full waiver...'}
                </button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{waiverText}</p>
            )}
            <label className="flex items-start gap-2.5 cursor-pointer mt-3 pt-3 border-t border-border">
              <input
                type="checkbox"
                checked={waiverAccepted}
                onChange={e => onWaiverChange(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-input accent-primary shrink-0"
              />
              <span className="text-sm font-medium">
                I have read and agree to the waiver above <span className="text-destructive">*</span>
              </span>
            </label>
            {errors?.waiver && <p className="text-xs text-destructive mt-1 ml-6">{errors.waiver}</p>}
          </div>
        </div>
      )}

      {/* Terms & Conditions */}
      {hasTerms && (
        <div className={`border rounded-xl p-4 ${errors?.terms ? 'border-destructive/50' : 'border-border'}`}>
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={e => onTermsChange(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-input accent-primary shrink-0"
            />
            <div className="text-sm">
              <span className="font-medium">
                I agree to the{' '}
                <button
                  type="button"
                  className="text-primary hover:underline inline"
                  onClick={() => {
                    const w = window.open('', '_blank', 'width=600,height=500');
                    if (w) {
                      w.document.write(`<html><head><title>Terms & Conditions</title><style>body{font-family:system-ui;padding:24px;max-width:640px;margin:0 auto;color:#333;line-height:1.6;font-size:14px}</style></head><body><h1>Terms & Conditions</h1><pre style="white-space:pre-wrap">${termsText.replace(/</g, '&lt;')}</pre></body></html>`);
                      w.document.close();
                    }
                  }}
                >
                  Terms &amp; Conditions
                </button>
                {' '}<span className="text-destructive">*</span>
              </span>
            </div>
          </label>
          {errors?.terms && <p className="text-xs text-destructive mt-1 ml-6">{errors.terms}</p>}
        </div>
      )}

      {/* Marketing opt-in */}
      {showMarketingOptIn && (
        <div className="border border-border rounded-xl p-4">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={marketingOptIn}
              onChange={e => onMarketingChange(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-input accent-primary shrink-0"
            />
            <div className="flex items-start gap-2">
              <Megaphone className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <span className="text-sm text-muted-foreground">
                {marketingLabel || 'Yes, I\'d like to receive updates and news from the event organiser.'}
              </span>
            </div>
          </label>
        </div>
      )}
    </div>
  );
}