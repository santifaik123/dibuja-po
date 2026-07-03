import type { ReactNode } from "react";
import { ClassicLogo } from "./ClassicLogo";

export function ClassicTopBar({
  left,
  right,
  compactLogo = false,
}: {
  left?: ReactNode;
  right?: ReactNode;
  compactLogo?: boolean;
}) {
  return (
    <header className="relative h-[78px] bg-gameBg">
      <div className="relative h-full w-full max-w-[1620px] bg-gameTop">
        <div className="absolute inset-x-0 top-0 h-9 bg-gameTopLight" />
        {left ? <div className="absolute left-4 top-3 z-10 lg:left-[6vw]">{left}</div> : null}
        <div className="absolute left-1/2 top-1 -translate-x-1/2">
          <ClassicLogo compact={compactLogo} />
        </div>
        {right ? <div className="absolute right-4 top-4 z-10">{right}</div> : null}
      </div>
    </header>
  );
}
