"use client";

import { ExternalLink, Globe } from "lucide-react";
import type { ComponentType, SVGProps } from "react";

type IconComponent = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;

// ---- Inline brand glyphs ---------------------------------------------------
// lucide-react removed brand icons; these are minimal simple-icons paths.

const FacebookIcon: IconComponent = ({ size = 24, ...rest }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" {...rest}>
    <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.77l-.44 2.89h-2.33v6.99A10 10 0 0 0 22 12z" />
  </svg>
);

const InstagramIcon: IconComponent = ({ size = 24, ...rest }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" {...rest}>
    <path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.64.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.64.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16zm0 1.95c-3.15 0-3.5.01-4.74.07-1.07.05-1.65.23-2.04.38-.51.2-.88.44-1.27.83-.39.39-.63.76-.83 1.27-.15.39-.33.97-.38 2.04-.06 1.24-.07 1.59-.07 4.74 0 3.15.01 3.5.07 4.74.05 1.07.23 1.65.38 2.04.2.51.44.88.83 1.27.39.39.76.63 1.27.83.39.15.97.33 2.04.38 1.24.06 1.59.07 4.74.07 3.15 0 3.5-.01 4.74-.07 1.07-.05 1.65-.23 2.04-.38.51-.2.88-.44 1.27-.83.39-.39.63-.76.83-1.27.15-.39.33-.97.38-2.04.06-1.24.07-1.59.07-4.74 0-3.15-.01-3.5-.07-4.74-.05-1.07-.23-1.65-.38-2.04a3.4 3.4 0 0 0-.83-1.27 3.4 3.4 0 0 0-1.27-.83c-.39-.15-.97-.33-2.04-.38-1.24-.06-1.59-.07-4.74-.07zm0 3.33a4.56 4.56 0 1 1 0 9.12 4.56 4.56 0 0 1 0-9.12zm0 7.52a2.96 2.96 0 1 0 0-5.92 2.96 2.96 0 0 0 0 5.92zm5.8-7.7a1.06 1.06 0 1 1-2.13 0 1.06 1.06 0 0 1 2.13 0z" />
  </svg>
);

const YoutubeIcon: IconComponent = ({ size = 24, ...rest }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" {...rest}>
    <path d="M23.5 6.2a3 3 0 0 0-2.12-2.12C19.54 3.5 12 3.5 12 3.5s-7.54 0-9.38.58A3 3 0 0 0 .5 6.2C0 8.04 0 12 0 12s0 3.96.5 5.8a3 3 0 0 0 2.12 2.12c1.84.58 9.38.58 9.38.58s7.54 0 9.38-.58a3 3 0 0 0 2.12-2.12C24 15.96 24 12 24 12s0-3.96-.5-5.8zM9.55 15.57V8.43L15.82 12l-6.27 3.57z" />
  </svg>
);

const XIcon: IconComponent = ({ size = 24, ...rest }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" {...rest}>
    <path d="M18.9 2H22l-7.55 8.62L23.5 22h-7.02l-5.5-7.2L4.6 22H1.5l8.08-9.23L.6 2h7.2l4.97 6.57L18.9 2zm-1.23 18h1.94L6.44 4H4.38l13.3 16z" />
  </svg>
);

// ---- Links ----------------------------------------------------------------

interface SocialLink {
  name: string;
  url: string;
  color: string;
  Icon: IconComponent;
}

const SOCIAL_LINKS: (SocialLink & { darkColor?: string })[] = [
  { name: "H7.cz",     url: "https://h7.cz",                     color: "#063a72", darkColor: "#4A9AE6", Icon: Globe },
  { name: "Facebook",  url: "https://facebook.com/h7movement",   color: "#1877F2", darkColor: "#5B9CF5", Icon: FacebookIcon },
  { name: "Instagram", url: "https://instagram.com/h7movement",  color: "#E1306C", Icon: InstagramIcon },
  { name: "YouTube",   url: "https://youtube.com/@h7movement",   color: "#FF0000", Icon: YoutubeIcon },
  { name: "X",         url: "https://x.com/h7movement",          color: "#111111", darkColor: "#E5E5E5", Icon: XIcon },
];

export default function ConnectPage() {
  return (
    <div className="space-y-5">
      <div className="space-y-3">
        {SOCIAL_LINKS.map(({ name, url, color, darkColor, Icon }) => (
          <a
            key={name}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 bg-gray-100 dark:bg-[#242A2A] rounded-2xl p-4 hover:bg-gray-200 dark:hover:bg-gray-700 transition group"
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: (darkColor ? `var(--icon-bg-${name.replace(/[^a-zA-Z]/g, "")})` : color + "1A") }}
            >
              <Icon
                size={24}
                style={{ color: darkColor ? `var(--icon-color-${name.replace(/[^a-zA-Z]/g, "")})` : color }}
              />
              {darkColor && (
                <style>{`
                  :root {
                    --icon-color-${name.replace(/[^a-zA-Z]/g, "")}: ${color};
                    --icon-bg-${name.replace(/[^a-zA-Z]/g, "")}: ${color}1A;
                  }
                  .dark {
                    --icon-color-${name.replace(/[^a-zA-Z]/g, "")}: ${darkColor};
                    --icon-bg-${name.replace(/[^a-zA-Z]/g, "")}: ${darkColor}1A;
                  }
                `}</style>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {name}
              </div>
            </div>
            <ExternalLink size={18} className="text-gray-400 shrink-0" />
          </a>
        ))}
      </div>
    </div>
  );
}
