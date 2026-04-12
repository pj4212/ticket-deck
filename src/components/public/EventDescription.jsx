import ReactMarkdown from 'react-markdown';

export default function EventDescription({ description }) {
  if (!description) return null;

  return (
    <div>
      <h2 className="text-lg font-bold text-foreground mb-3">About this event</h2>
      <div className="prose prose-sm prose-invert max-w-none text-muted-foreground leading-relaxed">
        <ReactMarkdown>{description}</ReactMarkdown>
      </div>
    </div>
  );
}