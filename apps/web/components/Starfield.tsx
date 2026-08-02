const stars = [
  [7, 17, 2, 0], [13, 49, 1, 1.2], [19, 8, 1, 2.1], [25, 28, 2, 0.8],
  [31, 71, 1, 3.4], [38, 13, 1, 1.7], [44, 42, 2, 2.8], [51, 6, 1, 0.5],
  [58, 61, 1, 2.2], [64, 24, 2, 3.1], [70, 78, 1, 0.9], [76, 37, 1, 1.5],
  [82, 12, 2, 2.6], [89, 52, 1, 3.6], [94, 21, 1, 0.4], [4, 74, 1, 2.4],
] as const;

export function Starfield() {
  return (
    <div className="starfield" aria-hidden="true">
      {stars.map(([left, top, size, delay], index) => (
        <i
          key={index}
          style={{
            left: `${left}%`,
            top: `${top}%`,
            width: `${size}px`,
            height: `${size}px`,
            animationDelay: `${delay}s`,
          }}
        />
      ))}
    </div>
  );
}
