export interface ThemeLink { name: string; link: string }

export interface ThemeSettings {
  logo: string;
  description: string;
  background: string;
  mobileBackground: string;
  forceTheme: "light" | "dark" | "";
  showNetTransfer: boolean;
  forceCardInline: boolean;
  showMap: boolean;
  showServices: boolean;
  showAdmin: boolean;
  links: ThemeLink[];
  footerText: string;
  accentColor: string;
}

declare global {
  interface Window {
    CustomBackgroundImage?: string;
    CustomMobileBackgroundImage?: string;
    CustomLogo?: string;
    CustomDesc?: string;
    CustomLinks?: string | ThemeLink[];
    ForceTheme?: string;
    ShowNetTransfer?: boolean;
    ForceCardInline?: boolean;
    ForceShowServices?: boolean;
    ForceShowMap?: boolean;
    NezhaPocketConfig?: Partial<ThemeSettings>;
  }
}

export const defaultThemeSettings = (): ThemeSettings => ({
  logo: "", description: "CLOUD ADVENTURE", background: "", mobileBackground: "", forceTheme: "",
  showNetTransfer: false, forceCardInline: false, showMap: true, showServices: true, showAdmin: true,
  links: [], footerText: "", accentColor: "",
});

function bool(value: unknown, fallback: boolean) { return typeof value === "boolean" ? value : fallback; }
function text(value: unknown, fallback = "") { return typeof value === "string" ? value.trim() : fallback; }
function safeColor(value: unknown) { const color=text(value); return /^#[0-9a-f]{3,8}$/i.test(color)||/^(rgb|hsl)a?\([\d\s.,%+-]+\)$/i.test(color)?color:""; }
function safeUrl(value: unknown) {
  const url=text(value); if(!url)return "";
  try { const parsed=new URL(url,location.origin); return ["http:","https:","data:"].includes(parsed.protocol)?url:""; } catch { return ""; }
}
function links(value: unknown): ThemeLink[] {
  let parsed=value;
  if(typeof value==="string")try{parsed=JSON.parse(value);}catch{return [];}
  if(!Array.isArray(parsed))return [];
  return parsed.slice(0,12).flatMap(item=>{const name=text(item?.name),link=safeUrl(item?.link);return name&&link?[{name,link}]:[];});
}

/** The Dashboard deliberately exposes custom_code to guests. Recreate its user-theme behavior for static templates. */
export function installCustomCode(code: string) {
  if(!code.trim()||document.querySelector("[data-nezha-custom-code]"))return;
  const template=document.createElement("template"); template.innerHTML=code;
  const marker=document.createElement("meta"); marker.dataset.nezhaCustomCode="true"; document.head.append(marker);
  for(const node of [...template.content.childNodes]){
    if(node instanceof HTMLScriptElement){
      const script=document.createElement("script");
      for(const attr of [...node.attributes])script.setAttribute(attr.name,attr.value);
      script.textContent=node.textContent; document.head.append(script);
    }else if(node instanceof HTMLStyleElement||node instanceof HTMLLinkElement||node instanceof HTMLMetaElement){document.head.append(node.cloneNode(true));}
    else document.body.append(node.cloneNode(true));
  }
}

export function readThemeSettings(): ThemeSettings {
  const extra=window.NezhaPocketConfig||{}, defaults=defaultThemeSettings();
  const forceTheme=text(extra.forceTheme||window.ForceTheme);
  return {
    logo:safeUrl(extra.logo||window.CustomLogo), description:text(extra.description||window.CustomDesc,defaults.description),
    background:safeUrl(extra.background||window.CustomBackgroundImage), mobileBackground:safeUrl(extra.mobileBackground||window.CustomMobileBackgroundImage),
    forceTheme:forceTheme==="light"||forceTheme==="dark"?forceTheme:"", showNetTransfer:bool(extra.showNetTransfer??window.ShowNetTransfer,defaults.showNetTransfer),
    forceCardInline:bool(extra.forceCardInline??window.ForceCardInline,defaults.forceCardInline), showMap:bool(extra.showMap??window.ForceShowMap,defaults.showMap),
    showServices:bool(extra.showServices??window.ForceShowServices,defaults.showServices), showAdmin:bool(extra.showAdmin,defaults.showAdmin),
    links:links(extra.links??window.CustomLinks), footerText:text(extra.footerText), accentColor:safeColor(extra.accentColor),
  };
}

export function applyThemeSettings(settings: ThemeSettings) {
  const root=document.documentElement;
  let savedTheme=""; try{savedTheme=localStorage.getItem("nezha-pocket-theme")||"";}catch{}
  if(settings.forceTheme&&!savedTheme)root.dataset.theme=settings.forceTheme;
  root.classList.toggle("has-custom-background",Boolean(settings.background));
  root.style.setProperty("--custom-background",settings.background?`url(${JSON.stringify(settings.background)})`:"none");
  root.style.setProperty("--custom-mobile-background",settings.mobileBackground?`url(${JSON.stringify(settings.mobileBackground)})`:settings.background?`url(${JSON.stringify(settings.background)})`:"none");
  if(settings.accentColor)root.style.setProperty("--purple",settings.accentColor);else root.style.removeProperty("--purple");
  if(settings.logo){let favicon=document.querySelector<HTMLLinkElement>('link[rel="icon"]');if(favicon)favicon.href=settings.logo;}
}
