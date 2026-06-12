# TODO — Run 2 Observer UI Update

## Priority 1: Server feature parity (functional gaps)

### ~~1.1 Missing bot variants: Advanced Miner and Disruptor~~ DONE
The server defines 6 variants: `kMiningBot`, `kFactoryBot`, `kAdvancedMinerBot`, `kHaulerBot`, `kScoutBot`, `kDisruptorBot`.
The UI only knows 4: `kMiningBot`, `kFactoryBot`, `kScoutBot`, `kHaulerBot`.

- `kAdvancedMinerBot` and `kDisruptorBot` are completely absent — no images, no variant list entry, no display name.
- `human_readable_names.js` needs entries for all 6 server variant keys.
- `asset_manager.js` `botVariants` array needs `kAdvancedMinerBot` and `kDisruptorBot` added.
- Need base images for both (fallback to `Bot_Mining.png` for Advanced Miner, `Bot_Scout.png` for Disruptor until dedicated assets exist).

**Files**: `scripts/ui/asset_manager.js`, `scripts/ui/human_readable_names.js`

### ~~1.2 Crafting action not displayed~~ DONE
The server sends `kCraft` as a job action. `human_readable_names.js` has no mapping for it, so the sidebar shows the raw enum string. Add `"kCraft": "Crafting"` to the `actionMap`.

**Files**: `scripts/ui/human_readable_names.js`

### ~~1.3 Intermediates are in `resource_configs`, not separate~~ DONE
The server puts intermediates (Steel, Circuit, etc.) into the same `resource_configs` array as raw resources (with `rarity: 0`). But `asset_manager.js` treats intermediates as a separate category with a hardcoded fallback list and its own `intermediate_configs` key on `mapConfig`. This means:
- `initializeDynamicAssets` will use the hardcoded fallback since the server doesn't send `intermediate_configs`.
- The hardcoded IDs won't match the actual resource IDs from the server (Steel = id 6, but the code assigns its own element IDs).
- `getItemInfo` uses the local intermediate index, not the server's resource ID, so cargo display for intermediates will show wrong names/images.
- `updateLand` looks up `resource_configs[highestId].name.toLowerCase()` which resolves to e.g. `"steel"` — but `elements["steel"]` was registered under the intermediate path with a different element ID, so it may or may not match depending on how many resources there are.

**Fix approach**: treat all entries in `resource_configs` uniformly. Detect intermediates by `rarity === 0` or by index range, but register them through the same element-ID path as resources. Remove the separate `intermediate_configs` concept.

**Files**: `scripts/ui/asset_manager.js`, `game.js` (cargo rendering, `getItemInfo`)

### ~~1.4 Intermediate image paths are broken~~ DONE
`asset_manager.js:70` builds intermediate image paths as `'assets/' + cleanName + '.png'` (e.g. `assets/circuit.png`), but the actual files are named `Intermediate_Circuit.png`. These will all 404. No `onerror` fallback is set for intermediates (unlike resources).

**Files**: `scripts/ui/asset_manager.js`

### ~~1.5 `updateLand` can set element to `undefined` for intermediates~~ DONE
When a tile has a resource with `highestId` pointing to an intermediate (id >= 6), `resource_configs[highestId].name.toLowerCase()` produces e.g. `"steel"`. If `elements["steel"]` was registered with a mismatched element ID (see 1.3), `gameState` gets `undefined`, which will break the render switch.

**Files**: `game.js` (`updateLand` function)

## Priority 2: Bugs that cause crashes or visual corruption

### ~~2.1 `drawABot` crashes when terrain is undefined~~ DONE
`drawABot(c, r, colour, image, terrain)` calls `ctx.drawImage(terrain, ...)` but `terrain` comes from `terrains[row][col]`, which is `undefined` for any cell the observer hasn't received a `LandUpdate` for yet. `ctx.drawImage(undefined)` throws a TypeError. The old code didn't draw terrain under bots so this is a regression.

**Fix**: guard with `if (terrain)` before drawing, or fall back to the unknown terrain image.

**Files**: `game.js` (`drawABot`, line ~407)

### ~~2.2 O(n) botMap scan per cell per frame~~ DONE
```js
let botEntry = Array.from(botMap.values()).find(([pos]) => pos.x === col && ROWS - pos.y - 1 === row);
```
This runs for every bot-type cell during every render frame. For a 100×100 map with 50 bots, that's up to 500k iterations per frame. Build a `Map<"col,row", botEntry>` once per render call.

**Files**: `game.js` (render loop, line ~473)

### ~~2.3 `initializeDynamicAssets` is not idempotent~~ DONE
Calling it twice (e.g. on reconnect) appends duplicate entries to `resources`, `intermediates`, and `elements`, corrupting all indices and `BOT_START_IDX`. Add a reset at the top.

**Files**: `scripts/ui/asset_manager.js`

### ~~2.4 Sidebar pre-creation race with ensurePlayer~~ NOT A BUG
JS is single-threaded; fetch `.then()` and websocket `onmessage` can't interleave. Both paths check `sidebars.length` before creating, so no duplicates occur.

## Priority 3: Missing assets

These bot variants exist on the server but have no dedicated image files:

| Variant | Server key | Missing asset |
|---|---|---|
| Advanced Miner | `kAdvancedMinerBot` | `Bot_Advanced_Miner.png` (no file exists) |
| Disruptor | `kDisruptorBot` | `Bot_Disruptor.png` (no file exists) |

Existing assets that are present and usable:
- `Bot_Mining.png`, `Bot_Factory.png`, `Bot_Factory_Active.png`, `Bot_Factory_Idle.png`
- `Bot_Scout.png`, `Bot_Hauler.png`, `Bot_Hauler_Empty.png`, `Bot_Hauler_Full.png`
- `Resource_*.png` for all 6 raw resources + Mixed_Ore
- `Intermediate_*.png` for all 5 intermediates
- `Terrain_*.jpg` for Grasslands, Hills, Mountains

**Workaround**: use `Bot_Mining.png` as fallback for Advanced Miner, and `Bot_Scout.png` as fallback for Disruptor, until dedicated assets are created.

## Priority 4: Cleanup

### ~~4.1 Remove dead commented-out code in render switch~~ DONE
Large blocks of commented-out case statements (`kFactoryBotOne`, `kMiningBotTwo`, `granite`, `vibranium`, etc.) in the render loop and `updateLand`. These are fully superseded by the dynamic approach.

**Files**: `game.js`

### ~~4.2 `images.unknown` has no src~~ DONE
`asset_manager.js:37` creates `new Image()` with no source. Either assign `assets/unknown.jpg` or remove it and handle the case explicitly.

**Files**: `scripts/ui/asset_manager.js`

### 4.3 Magic numbers for base element IDs — SKIPPED
Purely cosmetic; not worth the risk of touching IDs that flow through multiple places.

### ~~4.4 Resource fallback points to deleted assets~~ DONE (removed during P1 rewrite)
The `onerror` fallback for resource images tries `'assets/' + cleanName + '.png'` (e.g. `assets/granite.png`), but those old lowercase files were deleted in this branch. The fallback is dead code.

**Files**: `scripts/ui/asset_manager.js`
