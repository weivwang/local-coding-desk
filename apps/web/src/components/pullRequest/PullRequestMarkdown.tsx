import { T, Var } from "gt-react";
import { ExternalLinkIcon, PaperclipIcon } from "lucide-react";
import { sourceControlClients } from "@t3tools/client-runtime/source-control-clients";
import type { EnvironmentId, ScopedThreadRef } from "@t3tools/contracts";
import { createContext, useContext } from "react";
import type { MarkdownExtensions } from "~/markdown/wordsHast";

import { cn } from "~/lib/utils";
import { PULL_REQUESTS_PANEL_REF } from "~/rightPanelStore";

import ChatMarkdown from "../ChatMarkdown";
import { splitPullRequestBody, type PullRequestBodySegment } from "./pullRequestMarkdown.logic";

export const PullRequestMarkdownContext = createContext<{
  /** Stable per repository, so comments share one renderer and its parse cache. */
  extensions: MarkdownExtensions;
  lineBreaks: boolean;
  threadRef: ScopedThreadRef | null;
} | null>(null);

/** The list page panel that links in thread-less markdown open in; the Issues page provides its own. */
export const PullRequestMarkdownPanelContext =
  createContext<ScopedThreadRef>(PULL_REQUESTS_PANEL_REF);

function PullRequestBodySegmentView({
  segment,
  cwd,
  environmentId,
  threadRef,
  lineBreaks,
  onTaskListChange,
}: {
  segment: PullRequestBodySegment;
  cwd: string;
  environmentId: EnvironmentId;
  threadRef: ScopedThreadRef | undefined;
  lineBreaks: boolean;
  onTaskListChange: ((input: { markerOffset: number; checked: boolean }) => void) | undefined;
}) {
  const context = useContext(PullRequestMarkdownContext);
  const listPanelRef = useContext(PullRequestMarkdownPanelContext);
  if (segment.kind === "table") {
    return (
      <div className="space-y-3">
        {segment.rows.map((cells, rowIndex) => (
          <div
            // oxlint-disable-next-line react/no-array-index-key -- rows have no identity besides position
            key={rowIndex}
            className="grid gap-3"
            style={{ gridTemplateColumns: `repeat(${cells.length}, minmax(0, 1fr))` }}
          >
            {cells.map((cell, cellIndex) => (
              <div
                // oxlint-disable-next-line react/no-array-index-key -- cells have no identity besides position
                key={cellIndex}
                className={cn("min-w-0 space-y-3", cell.header && "font-medium")}
              >
                {cell.segments.map((cellSegment) => (
                  <PullRequestBodySegmentView
                    key={cellSegment.id}
                    segment={cellSegment}
                    cwd={cwd}
                    environmentId={environmentId}
                    threadRef={threadRef}
                    lineBreaks={lineBreaks}
                    onTaskListChange={onTaskListChange}
                  />
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }
  if (segment.kind === "markdown") {
    return (
      <ChatMarkdown
        text={segment.text}
        cwd={cwd}
        threadRef={threadRef}
        pullRequestPanelRef={threadRef ?? listPanelRef}
        environmentId={environmentId}
        {...(context ? { extensions: context.extensions } : {})}
        lineBreaks={lineBreaks}
        onTaskListChange={
          onTaskListChange
            ? ({ markerOffset, checked }) =>
                onTaskListChange({
                  markerOffset: segment.sourceOffset + markerOffset,
                  checked,
                })
            : undefined
        }
      />
    );
  }
  const hostMedia = sourceControlClients.mediaUrl(segment.url);
  return (
    // Desktop converts blocked _blank navigation to openExternal.
    <a
      href={segment.url}
      rel="noreferrer noopener"
      target="_blank"
      className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm hover:bg-muted/60"
    >
      <PaperclipIcon aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate">
        <T>
          Open attachment on{" "}
          <Var>{hostMedia?.definition.label ?? new URL(segment.url).hostname}</Var>
        </T>
      </span>
      <ExternalLinkIcon aria-hidden className="size-3 shrink-0 text-muted-foreground" />
    </a>
  );
}

export function PullRequestMarkdown({
  text,
  cwd,
  environmentId,
  threadRef,
  lineBreaks,
  className,
  onTaskListChange,
}: {
  text: string;
  cwd: string;
  environmentId: EnvironmentId;
  threadRef?: ScopedThreadRef | null;
  lineBreaks?: boolean;
  className?: string;
  /** `markerOffset` is into `text`. Checkboxes stay read-only without it. */
  onTaskListChange?: ((input: { markerOffset: number; checked: boolean }) => void) | undefined;
}) {
  const segments = splitPullRequestBody(text);
  const context = useContext(PullRequestMarkdownContext);
  const resolvedThreadRef = threadRef ?? context?.threadRef ?? undefined;
  return (
    <div
      className={cn(
        "space-y-3 [&_[data-markdown-details]]:border-0 [&_[data-markdown-details-summary]]:text-foreground/80 [&_[data-markdown-details-summary]>svg]:text-muted-foreground/60",
        className,
      )}
      data-image-gallery
    >
      {segments.map((segment) => (
        <PullRequestBodySegmentView
          key={segment.id}
          segment={segment}
          cwd={cwd}
          environmentId={environmentId}
          threadRef={resolvedThreadRef}
          lineBreaks={lineBreaks ?? context?.lineBreaks ?? false}
          onTaskListChange={onTaskListChange}
        />
      ))}
    </div>
  );
}
