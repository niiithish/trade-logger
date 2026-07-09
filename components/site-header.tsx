"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export function SiteHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-border/80 border-b bg-background/80 px-4 backdrop-blur-md",
        className
      )}
    >
      <SidebarTrigger className="-ml-1" />
      <div aria-hidden className="h-5 w-px shrink-0 bg-border opacity-60" />
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <h1 className="truncate font-medium text-sm text-strong tracking-tight">
          {title}
        </h1>
        {description ? (
          <p className="truncate text-muted-foreground text-xs">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
}
