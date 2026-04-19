type Props = {
  className?: string;
  stroke?: string;
  fill?: string;
  style?: React.CSSProperties;
};

export function StarOrnament({
  className = "",
  stroke = "currentColor",
  fill = "none",
  style,
}: Props) {
  return (
    <svg
      viewBox="0 0 40 40"
      className={className}
      style={style}
      fill={fill}
      stroke={stroke}
      strokeWidth="1.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20 5.5 C 20.6 13.8, 25.4 18.6, 33.7 19.4 C 25.3 20.6, 20.7 25.3, 19.6 33.7 C 18.9 25.5, 14.3 20.7, 6.2 19.7 C 14.7 18.9, 19.3 14.2, 20 5.5 Z" />
    </svg>
  );
}
