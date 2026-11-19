import { randomInt } from "crypto";
const WORDS = ["arsip", "map", "laci", "folder", "guide", "kode", "indeks", "berkas", "agenda", "surat"];
export const genPassword = () => `${WORDS[randomInt(WORDS.length)]}${randomInt(100, 999)}`;
