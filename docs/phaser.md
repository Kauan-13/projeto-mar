# Phaser 3 — Pixel Art & Antialiasing Notes

## The one-liner fix for crispy pixel art

```ts
const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    render: {
        pixelArt: true,  // ← all you need
    },
};
```

When `pixelArt: true`, Phaser automatically sets:
- `antialias = false` — WebGL uses nearest-neighbor instead of linear filtering
- `antialiasGL = false` — WebGL context antialias disabled
- `roundPixels = true` — sprites drawn at integer positions only

## Per-texture filter control

If you need to change the filter on an already-loaded texture:

```ts
this.textures.get('my_sprite').setFilter(Phaser.Textures.FilterMode.NEAREST);
```

## Filter modes

| Mode | Value | Effect |
|------|-------|--------|
| `Phaser.Textures.FilterMode.LINEAR` | `0` | Smooth interpolation (default, blurry on pixel art) |
| `Phaser.Textures.FilterMode.NEAREST` | `1` | Nearest-neighbor (crisp edges, pixel art) |

## Caveat

`pixelArt: true` only affects textures loaded *after* the config is set. Built-in textures (`__DEFAULT`, `__MISSING`, `__WHITE`) are created at boot before the config takes effect — they'll retain default linear filtering, but they're rarely used in gameplay.
