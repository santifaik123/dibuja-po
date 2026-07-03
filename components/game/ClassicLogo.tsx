const LOGO_PARTS = [
  { label: "D", color: "#ffc44d" },
  { label: "i", color: "#ff8b52" },
  { label: "b", color: "#7fc8c2" },
  { label: "u", color: "#f7a35d" },
  { label: "j", color: "#ff6f7e" },
  { label: "a", color: "#f6c54f" },
  { label: " ", color: "#ffffff" },
  { label: "P", color: "#7fc8c2" },
  { label: "o", color: "#5b8fd1" },
];

export function ClassicLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={
        compact
          ? "classic-logo whitespace-nowrap text-[1.8rem] leading-none sm:text-[2.6rem]"
          : "classic-logo whitespace-nowrap text-[2rem] leading-none sm:text-[3.6rem]"
      }
      aria-label="Dibuja Po"
    >
      {LOGO_PARTS.map((part, index) =>
        part.label === " " ? (
          <span key={`${part.label}-${index}`}>&nbsp;</span>
        ) : (
          <span key={`${part.label}-${index}`} style={{ color: part.color }}>
            {part.label}
          </span>
        ),
      )}
      <span className="classic-logo-mark ml-1 inline-block -rotate-3 text-white">2</span>
    </div>
  );
}
