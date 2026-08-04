# Vendored Pokémon GLB models

Regular-form Draco/WebP-optimized `.glb` files from
[Pokemon-3D-api/assets](https://github.com/Pokemon-3D-api/assets), mirrored into
`regular/{nationalDexId}.glb` for offline / GitHub Pages use.

## Refresh

```bash
node tools/download-pokemon-glbs.mjs
```

## Licence / credit

- **Models**: © Nintendo / Creatures Inc. / GAME FREAK inc.
- **Pipeline / hosting**: Pokemon-3D-api organization (fan project)
- Fan redistribution only; not affiliated with The Pokémon Company.

`manifest.json` lists every national dex id present in this mirror.

## Missing models

See `regular/MISSING.json`. About 54 national-dex IDs are advertised by the
Pokemon-3D API JSON but have **no GLB file** anywhere in the upstream assets
repo (Regular Available 971 / Total 1028 per their README). They cannot be
mirrored until upstream adds Sketchfab sources to `scripts/model_map.json`.
