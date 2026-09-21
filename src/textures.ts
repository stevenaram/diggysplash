import * as T from "three";

export type Surface =
  "soil" | "sand" | "plaster" | "stone" | "wood" | "leaf" | "water";

/** Small painted surface maps; the framebuffer itself always renders at display resolution. */
export class SurfaceTextures {
  private maps = new Map<Surface, T.CanvasTexture>();

  get(surface: Surface) {
    const cached = this.maps.get(surface);
    if (cached) return cached;
    const size = surface === "plaster" ? 64 : 32;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const rect = (
      shade: number,
      x: number,
      y: number,
      w: number,
      h: number,
    ) => {
      ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
      ctx.fillRect(x, y, w, h);
    };
    rect(250, 0, 0, size, size);
    if (surface === "soil") {
      rect(236, 0, 0, 32, 32);
      for (let n = 0; n < 45; n++)
        rect(
          n % 3 ? 211 : 178,
          (n * 13) % 32,
          (n * 19) % 32,
          2 + (n % 3),
          1 + (n % 2),
        );
      for (let y = 3; y < 32; y += 7) rect(223, 0, y, 32, 1);
    } else if (surface === "sand") {
      for (let n = 0; n < 20; n++)
        rect(n % 3 ? 240 : 221, (n * 13) % 32, (n * 19) % 32, 1 + (n % 2), 1);
      for (let y = 8; y < 32; y += 12)
        for (let x = 0; x < 12; x++)
          rect(242, x + y / 2, y + Math.floor(x / 5), 1, 1);
    } else if (surface === "plaster") {
      for (let y = 0; y < 64; y += 4)
        rect(252 - Math.floor(y / 8), 0, y, 64, 4);
      for (let n = 0; n < 50; n++)
        rect(
          n % 3 ? 235 : 223,
          (n * 23) % 64,
          (n * 37) % 64,
          2 + (n % 4),
          1 + (n % 2),
        );
      // Sun-bleached stucco, exposed masonry near the foot, and painted crevice shading.
      rect(215, 0, 57, 64, 7);
      for (let row = 0; row < 2; row++)
        for (let x = -8; x < 64; x += 16) {
          const a = x + (row % 2) * 8;
          rect(237, a + 1, 57 + row * 4, 14, 3);
          rect(249, a + 1, 57 + row * 4, 14, 1);
        }
      rect(216, 0, 0, 64, 2);
      rect(232, 0, 2, 64, 1);
    } else if (surface === "stone") {
      rect(203, 0, 0, 32, 32);
      for (let y = 0; y < 32; y += 8)
        for (let x = -8; x < 32; x += 16) {
          const a = x + ((y / 8) % 2) * 8;
          rect(238 + ((x + y + 32) % 3) * 5, a + 1, y + 1, 15, 7);
          rect(254, a + 1, y + 1, 14, 1);
          rect(220, a + 2, y + 6, 13, 1);
        }
    } else if (surface === "wood") {
      rect(244, 0, 0, 32, 32);
      for (let x = 0; x < 32; x += 8) {
        rect(174, x, 0, 1, 32);
        rect(255, x + 1, 0, 1, 32);
        for (let y = 3; y < 32; y += 7)
          rect(218, x + 3 + ((x + y) % 3), y, 1, 5);
      }
      rect(182, 12, 19, 3, 2);
      rect(209, 11, 18, 1, 4);
    } else if (surface === "leaf") {
      rect(218, 0, 0, 16, 32);
      rect(245, 16, 0, 16, 32);
      rect(255, 15, 0, 2, 32);
      for (let y = 3; y < 32; y += 5)
        for (let x = 1; x < 15; x++) {
          rect(191, x, y + Math.floor(x / 4), 1, 1);
          rect(221, 31 - x, y + Math.floor(x / 4), 1, 1);
        }
    } else {
      rect(241, 0, 0, 32, 32);
      for (let n = 0; n < 5; n++) {
        const x = (n * 11) % 25,
          y = (n * 7) % 28;
        rect(255, x, y, 5, 1);
        rect(252, x + 4, y + 1, 3, 1);
      }
    }
    const map = new T.CanvasTexture(canvas);
    map.colorSpace = T.SRGBColorSpace;
    map.magFilter = T.NearestFilter;
    map.minFilter = T.NearestMipmapLinearFilter;
    this.maps.set(surface, map);
    return map;
  }
}
