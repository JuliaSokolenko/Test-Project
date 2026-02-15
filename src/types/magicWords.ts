/**
 * Types for Magic Words scene and API.
 */

export interface MagicWordsDialogueLine {
  name: string;
  text: string;
}

export interface MagicWordsEmoji {
  name: string;
  url: string;
}

export interface MagicWordsAvatar {
  name: string;
  url: string;
  position: "left" | "right";
}

export interface MagicWordsResponse {
  dialogue: MagicWordsDialogueLine[];
  /** Spelled "emojies" in the API response. */
  emojies: MagicWordsEmoji[];
  avatars: MagicWordsAvatar[];
}
