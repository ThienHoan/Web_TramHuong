export type PreviewMode = "bracelet" | "ritual" | "gallery";
export interface PreviewOptions {
  tone: number;
  light: number;
  autoRotate: boolean;
  expanded: boolean;
  smoke: boolean;
  galleryIndex: number;
  zoom: number;
}
export interface PreviewController {
  setScrollProgress?: (progress: number) => void;
  update: (options: PreviewOptions) => void;
  resetCamera: () => void;
  dispose: () => void;
}
export const DEFAULT_OPTIONS: PreviewOptions = {
  tone: 0,
  light: 0,
  autoRotate: true,
  expanded: false,
  smoke: true,
  galleryIndex: 0,
  zoom: 1,
};
export const GALLERY_ITEMS = [
  "Vòng trầm",
  "Lư thưởng hương",
  "Nụ trầm",
  "Chuỗi hạt",
  "Nghi thức trà & trầm",
];
