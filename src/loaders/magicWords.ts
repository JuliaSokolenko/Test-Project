import { Texture } from "pixi.js";
import { MAGIC_WORDS_API_URL } from "@/constants";
import type { MagicWordsResponse, MagicWordsEmoji, MagicWordsAvatar } from "@/types/magicWords";

async function loadImageAsTexture(url: string): Promise<Texture | null> {
  let blobUrl: string | null = null;
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    blobUrl = URL.createObjectURL(blob);
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Image load failed"));
      img.src = blobUrl!;
    });
    const tex = Texture.from(img);
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    return tex;
  } catch {
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    return null;
  }
}

export interface MagicWordsAssets {
  data: MagicWordsResponse;
  emojiTextures: Map<string, Texture>;
  avatarTextures: Map<string, Texture>;
}

let magicWordsAssetsPromise: Promise<MagicWordsAssets> | null = null;

export function loadMagicWordsAssets(): Promise<MagicWordsAssets> {
  if (!magicWordsAssetsPromise) {
    magicWordsAssetsPromise = (async () => {
      let data: MagicWordsResponse;
      try {
        const res = await fetch(MAGIC_WORDS_API_URL);
        data = (await res.json()) as MagicWordsResponse;
      } catch (err) {
        console.error("Failed to fetch Magic Words data:", err);
        return {
          data: { dialogue: [], emojies: [], avatars: [] },
          emojiTextures: new Map(),
          avatarTextures: new Map(),
        };
      }

      const emojiTextures = new Map<string, Texture>();
      const avatarTextures = new Map<string, Texture>();

      const emojies: MagicWordsEmoji[] = data.emojies ?? [];
      const avatars: MagicWordsAvatar[] = data.avatars ?? [];

      await Promise.all([
        Promise.all(
          emojies.map(async (e) => {
            const tex = await loadImageAsTexture(e.url);
            if (tex) emojiTextures.set(e.name, tex);
          })
        ),
        Promise.all(
          avatars.map(async (a) => {
            const tex = await loadImageAsTexture(a.url);
            if (tex) avatarTextures.set(a.name, tex);
          })
        ),
      ]);

      return {
        data: {
          dialogue: data.dialogue ?? [],
          emojies,
          avatars,
        },
        emojiTextures,
        avatarTextures,
      };
    })();
  }

  return magicWordsAssetsPromise;
}
