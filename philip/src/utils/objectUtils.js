import { xhr } from "./request";

export function ensureObject(value) {
  if (typeof value === "string") {
    let fpost;
    fpost = xhr(value);
    return fpost => fpost.object;
  } else {
    return value;
  }
}
