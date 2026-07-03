export function Timer({ seconds }: { seconds: number; total?: number }) {
  const urgent = seconds <= 10;

  return (
    <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full border-[6px] border-[#333] bg-[#eeeeee] shadow-[0_2px_0_rgba(255,255,255,0.65)_inset]">
      <span
        className={
          urgent
            ? "text-[2rem] font-black leading-none text-gameOrange"
            : "text-[2rem] font-black leading-none text-[#333]"
        }
      >
        {seconds}
      </span>
    </div>
  );
}
