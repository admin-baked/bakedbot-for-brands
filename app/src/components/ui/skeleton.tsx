// app/src/components/ui/skeleton.tsx
import * as React from "react";

type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

export function Skeleton({ className = "", ...props }: SkeletonProps) {
  return (
    <div
      className={
        "animate-pulse rounded-md bg-slate-800/60 " +
        className
      }
      {...props}
    />
  );
}
