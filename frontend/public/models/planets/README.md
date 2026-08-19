# Planet Models

Maya-exported GLB files for AnonEmote's 7 emotion planets.

## Expected Files

| Filename       | Planet          |
|----------------|-----------------|
| joy.glb        | Joy             |
| vent.glb       | Venting         |
| advice.glb     | Seek Advice     |
| grief.glb      | Grief & Loss    |
| anxiety.glb    | Anxiety         |
| neutral.glb    | Reflections     |
| doodle.glb     | Doodle Drift    |

## Constraints

- **Triangles:** ≤5,000 per planet
- **File size:** ≤2 MB per GLB (including embedded textures)
- **Orientation:** Y-up, centered at origin (0, 0, 0)
- **Naming:** Lowercase a-z only, no spaces, hyphens, or underscores
- **Format:** Binary glTF (.glb)
- **Textures:** Max 1024×1024 pixels if embedded
- **UVs (doodle.glb):** Must have a single continuous UV layout with no overlapping islands for the canvas texture overlay

## Export Notes

- Export from Maya as binary glTF (.glb)
- Ensure meshes are centered at world origin before export
- Bake any transforms (freeze transformations in Maya)
- Embed textures in the GLB file rather than referencing external files
- Optional: include AnimationClip entries for baked animations (the system will detect and play them automatically)
