'use client';

/** The last step: everything typed, each block with a way back to change it. */
export interface ReviewBlock {
  step: number;
  title: string;
  lines: (string | undefined)[];
}

export function OrderReview({
  blocks,
  editLabel,
  onEdit,
}: {
  blocks: ReviewBlock[];
  editLabel: string;
  onEdit: (step: number) => void;
}) {
  return (
    <dl className="flex flex-col gap-4">
      {blocks.map((block) => (
        <div key={block.title} className="flex items-start justify-between gap-4 border-b border-border pb-4">
          <div className="min-w-0">
            <dt className="text-sm font-semibold text-text-secondary">{block.title}</dt>
            {block.lines.filter(Boolean).map((line) => (
              <dd key={line} className="text-[15px] wrap-break-word text-text">
                {line}
              </dd>
            ))}
          </div>
          <button
            type="button"
            onClick={() => onEdit(block.step)}
            className="min-h-11 shrink-0 text-sm font-bold text-accent hover:underline"
          >
            {editLabel}
          </button>
        </div>
      ))}
    </dl>
  );
}
