import { cn } from "@/lib/utils";

export function Logo({
  className,
  title = "TradeLogger",
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg
      aria-label={title}
      className={cn("size-8 shrink-0", className)}
      fill="none"
      height="45"
      role="img"
      viewBox="0 0 46 45"
      width="46"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>
      <g clipPath="url(#logo_clip)">
        <g filter="url(#logo_filter)">
          <rect
            fill="#0689CA"
            height="44"
            rx="9.5"
            width="44"
            x="1"
            y="0.358643"
          />
          <rect
            height="42.1667"
            rx="8.58333"
            stroke="url(#logo_stroke)"
            strokeWidth="1.83333"
            width="42.1667"
            x="1.91667"
            y="1.27531"
          />
          <path
            clipRule="evenodd"
            d="M12.1482 14.7879C12.6053 12.8162 14.5813 11.5868 16.5615 12.042L29.7857 15.0819C31.766 15.537 33.0007 17.5044 32.5435 19.4762L29.4904 32.6431C29.0333 34.6149 27.0574 35.8443 25.0771 35.389L11.8529 32.3492C9.87265 31.894 8.63793 29.9266 9.09514 27.9549L12.1482 14.7879ZM16.5095 12.0742C16.9667 10.1025 18.9426 8.87314 20.9229 9.32837L34.147 12.3682C36.1274 12.8233 37.3621 14.7908 36.9048 16.7625L33.8518 29.9295C33.3947 31.9012 31.4187 33.1306 29.4384 32.6753L16.2143 29.6355C14.234 29.1803 12.9993 27.2129 13.4565 25.2412L16.5095 12.0742Z"
            fill="white"
            fillRule="evenodd"
          />
        </g>
      </g>
      <rect
        height="44.1375"
        rx="9.56875"
        stroke="currentColor"
        strokeOpacity="0.2"
        strokeWidth="0.1375"
        width="44.1375"
        x="0.93125"
        y="0.289893"
      />
      <defs>
        <filter
          colorInterpolationFilters="sRGB"
          filterUnits="userSpaceOnUse"
          height="56.375"
          id="logo_filter"
          width="49.5"
          x="1"
          y="-12.0164"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend
            in="SourceGraphic"
            in2="BackgroundImageFix"
            mode="normal"
            result="shape"
          />
          <feColorMatrix
            in="SourceAlpha"
            result="hardAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
          />
          <feOffset dx="5.5" dy="-12.375" />
          <feGaussianBlur stdDeviation="11" />
          <feComposite in2="hardAlpha" k2="-1" k3="1" operator="arithmetic" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0.0235294 0 0 0 0 0.537255 0 0 0 0 0.792157 0 0 0 0.25 0"
          />
          <feBlend
            in2="shape"
            mode="normal"
            result="effect1_innerShadow_logo"
          />
        </filter>
        <linearGradient
          gradientUnits="userSpaceOnUse"
          id="logo_stroke"
          x1="23"
          x2="23"
          y1="0.358643"
          y2="44.3586"
        >
          <stop stopColor="#1396D7" />
          <stop offset="1" stopColor="#007CBD" />
        </linearGradient>
        <clipPath id="logo_clip">
          <rect
            fill="white"
            height="44"
            rx="9.5"
            width="44"
            x="1"
            y="0.358643"
          />
        </clipPath>
      </defs>
    </svg>
  );
}
