"use client";

import * as React from "react";
import { CopyIcon, CheckIcon, Share2Icon, HashIcon, MessageCircleIcon, SendIcon, MailIcon, QrCodeIcon, XIcon } from "lucide-react";

import { cn } from "@/lib/utils";

// 초대 링크 — 현재 사이트 주소 + /signup?ref=코드.
// 공유 메뉴: 카카오톡(SDK, NEXT_PUBLIC_KAKAO_JS_KEY 설정 시) · 텔레그램 · 라인 · 왓츠앱 · 이메일 · 링크 복사 · 기기 공유 시트.
const KAKAO_KEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;

declare global {
  interface Window {
    Kakao?: {
      isInitialized: () => boolean;
      init: (key: string) => void;
      Share: { sendDefault: (opts: unknown) => void };
    };
  }
}

function loadKakao(): Promise<boolean> {
  return new Promise((resolve) => {
    if (!KAKAO_KEY) return resolve(false);
    if (window.Kakao?.isInitialized()) return resolve(true);
    const done = () => {
      try {
        if (window.Kakao && !window.Kakao.isInitialized()) window.Kakao.init(KAKAO_KEY);
        resolve(!!window.Kakao?.isInitialized());
      } catch {
        resolve(false);
      }
    };
    if (window.Kakao) return done();
    const s = document.createElement("script");
    s.src = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js";
    s.async = true;
    s.onload = done;
    s.onerror = () => resolve(false);
    document.head.appendChild(s);
  });
}

export function InviteLinkActions({ code }: { code: string }) {
  // 현재 사이트 주소(클라이언트) — 서버 렌더 시 빈 문자열, hydration 후 실제 origin
  const origin = React.useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => "",
  );
  const [copied, setCopied] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [kakaoErr, setKakaoErr] = React.useState<string | null>(null);

  const link = origin ? `${origin}/signup?ref=${encodeURIComponent(code)}` : `/signup?ref=${code}`;
  const display = link.replace(/^https?:\/\//, "");
  const text = `포르투나에 초대합니다. 초대 코드 ${code} — 매매 전 의사결정을 AI가 검증하는 포르투나를 함께 시작해요.`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      window.prompt("아래 링크를 복사하세요", link);
    }
  };

  const kakao = async () => {
    setKakaoErr(null);
    const ok = await loadKakao();
    if (!ok || !window.Kakao) {
      setKakaoErr(KAKAO_KEY ? "카카오 SDK 로드에 실패했습니다" : "카카오톡 공유는 카카오 앱 키 설정 후 사용할 수 있습니다");
      return;
    }
    window.Kakao.Share.sendDefault({
      objectType: "text",
      text,
      link: { mobileWebUrl: link, webUrl: link },
      buttonTitle: "초대 링크 열기",
    });
  };

  const nativeShare = async () => {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "포르투나 초대", text, url: link });
        return;
      } catch {
        /* 취소 시 무시 */
      }
    }
    await copy();
  };

  const enc = encodeURIComponent;
  const channels = [
    { key: "kakao", label: "카카오톡", icon: MessageCircleIcon, tone: "bg-[#FEE500] text-[#191919]", onClick: kakao, note: KAKAO_KEY ? undefined : "앱 키 필요" },
    { key: "telegram", label: "텔레그램", icon: SendIcon, tone: "bg-[#229ED9] text-white", href: `https://t.me/share/url?url=${enc(link)}&text=${enc(text)}` },
    { key: "line", label: "라인", icon: MessageCircleIcon, tone: "bg-[#06C755] text-white", href: `https://line.me/R/share?text=${enc(`${text}\n${link}`)}` },
    { key: "whatsapp", label: "왓츠앱", icon: MessageCircleIcon, tone: "bg-[#25D366] text-white", href: `https://wa.me/?text=${enc(`${text}\n${link}`)}` },
    { key: "mail", label: "이메일", icon: MailIcon, tone: "bg-n-100 text-n-700", href: `mailto:?subject=${enc("포르투나 초대")}&body=${enc(`${text}\n\n${link}`)}` },
  ];

  const qr = origin ? `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${enc(link)}` : "";

  return (
    <>
      <div className="mt-2 inline-flex max-w-full items-center gap-2 rounded-md bg-white/10 px-3 py-1.5 text-xs text-white/70">
        <HashIcon className="size-3 shrink-0" /> <span className="truncate">{display}</span>
      </div>
      <div className="flex gap-2.5">
        <button type="button" onClick={copy} className="inline-flex items-center gap-2 rounded-[10px] bg-white/10 px-5 py-3 text-sm font-bold text-white ring-1 ring-white/20 hover:bg-white/15">
          {copied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />} {copied ? "복사됨" : "링크 복사"}
        </button>
        <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-[10px] bg-crypto px-5 py-3 text-sm font-bold text-white hover:opacity-90">
          <Share2Icon className="size-4" /> 공유
        </button>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div className="absolute inset-0 bg-[#0B0F14]/80" onClick={() => setOpen(false)} />
          <div className="relative z-10 w-full max-w-[440px] overflow-hidden rounded-xl bg-card text-text-primary shadow-[0_20px_40px_-8px_rgba(11,15,20,0.35)]">
            <div className="flex items-start justify-between border-b px-6 py-5">
              <div>
                <h2 className="text-base font-bold">초대 링크 공유</h2>
                <p className="mt-0.5 text-xs text-text-secondary">초대 코드 {code} · 링크로 가입하면 자동으로 내 팀에 연결됩니다</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="grid size-7 place-items-center rounded-md text-text-tertiary hover:bg-surface-muted">
                <XIcon className="size-4" />
              </button>
            </div>
            <div className="space-y-4 px-6 py-5">
              <div className="grid grid-cols-5 gap-2">
                {channels.map((c) =>
                  c.href ? (
                    <a key={c.key} href={c.href} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1.5 rounded-lg p-2 text-center hover:bg-surface-muted">
                      <span className={cn("grid size-11 place-items-center rounded-full", c.tone)}><c.icon className="size-5" /></span>
                      <span className="text-[11px] font-medium text-text-secondary">{c.label}</span>
                    </a>
                  ) : (
                    <button key={c.key} type="button" onClick={c.onClick} className="flex flex-col items-center gap-1.5 rounded-lg p-2 text-center hover:bg-surface-muted">
                      <span className={cn("grid size-11 place-items-center rounded-full", c.tone, c.note && "opacity-50")}><c.icon className="size-5" /></span>
                      <span className="text-[11px] font-medium text-text-secondary">{c.label}</span>
                      {c.note ? <span className="text-[10px] text-text-tertiary">{c.note}</span> : null}
                    </button>
                  ),
                )}
              </div>
              {kakaoErr ? <div className="rounded-md bg-warning-soft px-3 py-2 text-xs font-medium text-warning">{kakaoErr}</div> : null}

              <div className="flex items-center gap-2 rounded-md bg-surface-muted px-3 py-2.5 ring-1 ring-border">
                <HashIcon className="size-3.5 shrink-0 text-text-tertiary" />
                <span className="flex-1 truncate font-mono text-xs">{link}</span>
                <button type="button" onClick={copy} className="inline-flex items-center gap-1 text-xs font-semibold text-green-700">
                  {copied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />} {copied ? "복사됨" : "복사"}
                </button>
              </div>

              <div className="flex items-center gap-4 rounded-lg bg-surface-muted p-3 ring-1 ring-border">
                {qr ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qr} alt="초대 링크 QR" width={120} height={120} className="rounded-md bg-white p-1" />
                ) : (
                  <span className="grid size-[120px] place-items-center rounded-md bg-white"><QrCodeIcon className="size-10 text-n-300" /></span>
                )}
                <div className="text-xs leading-relaxed text-text-secondary">
                  <div className="font-semibold text-text-primary">QR 코드</div>
                  오프라인에서 만난 사람에게는 QR을 보여주세요. 카메라로 찍으면 초대 링크로 바로 열립니다.
                </div>
              </div>

              <button type="button" onClick={nativeShare} className="inline-flex w-full items-center justify-center gap-2 rounded-md py-2.5 text-[13px] font-medium text-text-secondary ring-1 ring-border-strong hover:bg-surface-muted">
                <Share2Icon className="size-4" /> 기기의 공유 메뉴 열기 (휴대폰)
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
