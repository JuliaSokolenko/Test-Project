import { Assets, Texture } from "pixi.js";

import card1Url from "@/assets/images/1.webp";
import card2Url from "@/assets/images/2.webp";
import card3Url from "@/assets/images/3.webp";
import card4Url from "@/assets/images/4.webp";
import card5Url from "@/assets/images/5.webp";
import card6Url from "@/assets/images/6.webp";

const CARD_IMAGE_URLS = [card1Url, card2Url, card3Url, card4Url, card5Url, card6Url];

let cardTexturesPromise: Promise<Texture[]> | null = null;

export function loadCardTextures(): Promise<Texture[]> {
  if (!cardTexturesPromise) {
    cardTexturesPromise = Promise.all(CARD_IMAGE_URLS.map((url) => Assets.load<Texture>(url)));
  }
  return cardTexturesPromise;
}
