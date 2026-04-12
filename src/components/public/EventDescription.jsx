import ReactMarkdown from 'react-markdown';

export default function EventDescription({ description }) {
  if (!description) return null;

  // Check if description looks like it has markdown/html
  const hasMarkdown = /[#*_\[\]`>|]/.test(description) || description.includes('<');

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-foreground">About this event</h2>
      {hasMarkdown ? (
        <div className="prose prose-invert prose-sm max-w-none text-muted-foreground leading-relaxed">
          <ReactMarkdown
            components={{
              a: ({ ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline" />,
              img: ({ ...props }) => <img {...props} className="rounded-lg max-w-full h-auto my-4" />,
              iframe: ({ ...props }) => (
                <div className="aspect-video rounded-lg overflow-hidden my-4">
                  <iframe {...props} className="w-full h-full" />
                </div>
              ),
            }}
          >
            {description}
          </ReactMarkdown>
        </div>
      ) : (
        <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{description}</p>
      )}
    </div>
  );
}