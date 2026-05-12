"use client";

import { Camera, ExternalLink, Globe, Users } from "lucide-react";
import type { ComponentType, SVGProps } from "react";

type IconComponent = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;

// ---- Links ----------------------------------------------------------------
// Connect tab — H7 canonical entry + the social channels the team
// actively maintains. lucide-react v1.7+ dropped third-party brand
// glyphs (Facebook/Instagram/X/etc.) for trademark-policy reasons, so
// we use semantic substitutes — Camera for Instagram and Users for
// Facebook — and let the title text + brand-coloured tile carry
// identity. Same compromise the mobile clients use with SF Symbols /
// Material Icons, which dropped brand glyphs for the same reason.

interface SocialLink {
  name: string;
  url: string;
  color: string;
  Icon: IconComponent;
}

const SOCIAL_LINKS: (SocialLink & { darkColor?: string })[] = [
  { name: "H7", url: "https://h7-web.vercel.app/", color: "#063a72", darkColor: "#4A9AE6", Icon: Globe },
  { name: "Instagram", url: "https://www.instagram.com/h7active/", color: "#E4405F", Icon: Camera },
  { name: "Facebook", url: "https://www.facebook.com/h7active", color: "#1877F2", Icon: Users },
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
