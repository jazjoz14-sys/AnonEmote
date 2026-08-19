# Avatar Models

Custom 3D GLB files for AnonEmote's 10 abstract avatar shapes.

## Files

| Filename    | Shape   |
|-------------|---------|
| clover.glb  | Clover  |
| crystal.glb | Crystal |
| droplet.glb | Droplet |
| heart.glb   | Heart   |
| moon.glb    | Moon    |
| ribbon.glb  | Ribbon  |
| ring.glb    | Ring    |
| shard.glb   | Shard   |
| spark.glb   | Spark   |
| spirit.glb  | Spirit  |

## Constraints

- **Triangles:** ≤3,000 per avatar
- **File size:** ≤1 MB per GLB (including embedded textures)
- **Orientation:** Y-up, centered at origin (0, 0, 0)
- **Naming:** Lowercase a-z only, no spaces, hyphens, or underscores
- **Format:** Binary glTF (.glb)

## Notes

- The system applies an emissive aura color at runtime — embedded textures are optional
- Models are scaled automatically so bounding sphere diameter ≤ 2.5 world units
- If a GLB fails to load, the system renders a fallback primitive geometry
