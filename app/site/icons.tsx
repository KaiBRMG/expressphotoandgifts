/**
 * Authored icons, drawn on a 24px grid.
 *
 * Outline marks share a 1.6 stroke, round caps and round joins. Brand marks
 * (WhatsApp, Instagram, Facebook) are solid, because that is how those marks
 * are drawn; mixing them into the outline set would misrepresent them.
 */

type IconProps = {
  className?: string;
  size?: number;
};

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function Svg({
  size = 20,
  className,
  children,
  solid,
}: IconProps & { children: React.ReactNode; solid?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      focusable="false"
      {...(solid ? { fill: "currentColor" } : {})}
    >
      {children}
    </svg>
  );
}

export function ArrowRight(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 12h15" {...stroke} />
      <path d="M13 6l6 6-6 6" {...stroke} />
    </Svg>
  );
}

export function ArrowDown(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 4v15" {...stroke} />
      <path d="M6 13l6 6 6-6" {...stroke} />
    </Svg>
  );
}

export function Parcel(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3.2L20 7.4v9.2L12 20.8 4 16.6V7.4z" {...stroke} />
      <path d="M4 7.4l8 4.2 8-4.2" {...stroke} />
      <path d="M12 11.6v9.2" {...stroke} />
      <path d="M8 5.3l8 4.2" {...stroke} />
    </Svg>
  );
}

export function Pin(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11z" {...stroke} />
      <circle cx="12" cy="10" r="2.6" {...stroke} />
    </Svg>
  );
}

export function Clock(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8.4" {...stroke} />
      <path d="M12 7.4V12l3.2 2" {...stroke} />
    </Svg>
  );
}

export function Phone(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        d="M8.2 4.5H5.6A1.6 1.6 0 0 0 4 6.2c0 7.6 6.2 13.8 13.8 13.8a1.6 1.6 0 0 0 1.7-1.6v-2.6l-3.6-1.2-1.8 2.2a13 13 0 0 1-5-5l2.2-1.8z"
        {...stroke}
      />
    </Svg>
  );
}

export function Mail(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3.4" y="5.6" width="17.2" height="12.8" rx="1.8" {...stroke} />
      <path d="M3.9 7.2l7.2 5a1.6 1.6 0 0 0 1.8 0l7.2-5" {...stroke} />
    </Svg>
  );
}

export function Menu(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" {...stroke} />
    </Svg>
  );
}

export function Close(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 6l12 12M18 6L6 18" {...stroke} />
    </Svg>
  );
}

export function WhatsApp(props: IconProps) {
  return (
    <Svg {...props} solid>
      <path d="M12.03 2.5c-5.24 0-9.5 4.24-9.5 9.47 0 1.67.44 3.3 1.28 4.74L2.5 21.5l4.94-1.28a9.5 9.5 0 0 0 4.59 1.17h.01c5.24 0 9.5-4.24 9.5-9.47a9.4 9.4 0 0 0-2.79-6.7 9.45 9.45 0 0 0-6.72-2.72zm0 17.33h-.01a7.9 7.9 0 0 1-4.01-1.1l-.29-.17-2.93.77.78-2.85-.19-.29a7.83 7.83 0 0 1-1.21-4.22c0-4.35 3.55-7.88 7.9-7.88a7.85 7.85 0 0 1 5.58 2.31 7.79 7.79 0 0 1 2.31 5.58c0 4.35-3.55 7.85-7.93 7.85zm4.34-5.88c-.24-.12-1.41-.69-1.62-.77-.22-.08-.38-.12-.54.12-.16.24-.62.77-.76.93-.14.16-.28.18-.52.06a6.46 6.46 0 0 1-1.9-1.17 7.15 7.15 0 0 1-1.32-1.63c-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.29-.74-1.77-.19-.46-.39-.4-.54-.41h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.7 2.59 4.11 3.63.58.25 1.03.4 1.38.51.58.18 1.1.16 1.52.1.46-.07 1.41-.58 1.61-1.13.2-.55.2-1.03.14-1.13-.06-.1-.22-.16-.46-.28z" />
    </Svg>
  );
}

export function Instagram(props: IconProps) {
  return (
    <Svg {...props} solid>
      <path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.8 3.8 0 0 1-1.38-.9 3.8 3.8 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16zm0 1.98c-3.15 0-3.5.01-4.74.07-1.14.05-1.76.24-2.17.4-.55.21-.94.47-1.35.88-.41.41-.67.8-.88 1.35-.16.41-.35 1.03-.4 2.17-.06 1.24-.07 1.59-.07 4.74s.01 3.5.07 4.74c.05 1.14.24 1.76.4 2.17.21.55.47.94.88 1.35.41.41.8.67 1.35.88.41.16 1.03.35 2.17.4 1.24.06 1.59.07 4.74.07s3.5-.01 4.74-.07c1.14-.05 1.76-.24 2.17-.4.55-.21.94-.47 1.35-.88.41-.41.67-.8.88-1.35.16-.41.35-1.03.4-2.17.06-1.24.07-1.59.07-4.74s-.01-3.5-.07-4.74c-.05-1.14-.24-1.76-.4-2.17a3.6 3.6 0 0 0-.88-1.35 3.6 3.6 0 0 0-1.35-.88c-.41-.16-1.03-.35-2.17-.4-1.24-.06-1.59-.07-4.74-.07zm0 3.37a5.04 5.04 0 1 1 0 10.08 5.04 5.04 0 0 1 0-10.08zm0 8.31a3.27 3.27 0 1 0 0-6.54 3.27 3.27 0 0 0 0 6.54zm6.42-8.51a1.18 1.18 0 1 1-2.36 0 1.18 1.18 0 0 1 2.36 0z" />
    </Svg>
  );
}

export function Facebook(props: IconProps) {
  return (
    <Svg {...props} solid>
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06C2 17.08 5.66 21.25 10.44 22v-7.03H7.9v-2.91h2.54V9.85c0-2.52 1.49-3.91 3.77-3.91 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.78-1.63 1.57v1.89h2.78l-.44 2.91h-2.34V22C18.34 21.25 22 17.08 22 12.06z" />
    </Svg>
  );
}

export function Search(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="11" cy="11" r="6.4" {...stroke} />
      <path d="M15.6 15.6L20 20" {...stroke} />
    </Svg>
  );
}

export function Profile(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="8.4" r="3.7" {...stroke} />
      <path d="M4.8 19.6a7.2 7.2 0 0 1 14.4 0" {...stroke} />
    </Svg>
  );
}

export function Cart(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 4h2.1l2.2 10.2a1.6 1.6 0 0 0 1.6 1.3h7.7a1.6 1.6 0 0 0 1.6-1.2L20 7.4H6" {...stroke} />
      <circle cx="9.5" cy="19.5" r="1.3" {...stroke} />
      <circle cx="17" cy="19.5" r="1.3" {...stroke} />
    </Svg>
  );
}
