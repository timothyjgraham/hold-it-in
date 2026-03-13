// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  HOLD IT IN — Sound Configuration                                         ║
// ║  Maps every game event to its sound files, volume, pitch range, and       ║
// ║  playback parameters. SINGLE SOURCE OF TRUTH for all audio mapping.       ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

// Each entry:
//   files:     array of file paths (random variation picked each play)
//   volume:    base volume 0–1 (scaled by master + category volume)
//   pitch:     [min, max] playback rate range for randomization (1.0 = normal)
//   category:  'sfx' | 'ui' | 'ambient' — for independent volume control
//   cooldown:  minimum seconds between plays (prevents stacking)
//   maxSimultaneous: max concurrent instances of this sound (default 3)
//   loop:      true for ambient/continuous sounds

const SFX_PATH = './sfx/';

export const SOUND_EVENTS = {

    // ─── UI ────────────────────────────────────────────────────────────────

    ui_click: {
        // Select Poppy — playful, bubbly button presses
        files: ['ui_click_1.wav', 'ui_click_2.wav', 'ui_click_3.wav', 'ui_click_4.wav', 'ui_click_5.wav'],
        volume: 0.5,
        pitch: [0.95, 1.05],
        category: 'ui',
    },
    ui_hover: {
        // Click Tiny Tactile — ultra-subtle micro-feedback
        files: ['ui_hover_1.wav', 'ui_hover_2.wav', 'ui_hover_3.wav', 'ui_hover_4.wav'],
        volume: 0.2,
        pitch: [0.9, 1.1],
        category: 'ui',
        cooldown: 0.05,
    },
    ui_game_start: {
        // Alert Unique Discovery — "here we go!" fanfare
        files: ['ui_game_start_1.wav', 'ui_game_start_2.wav'],
        volume: 0.6,
        pitch: [0.95, 1.0],
        category: 'ui',
    },
    ui_pause: {
        // Swipe Slide — menu sliding in
        files: ['ui_pause.wav'],
        volume: 0.5,
        pitch: [1.0, 1.0],
        category: 'ui',
    },
    ui_unpause: {
        // Swipe Slide — menu sliding out
        files: ['ui_unpause.wav'],
        volume: 0.5,
        pitch: [1.0, 1.0],
        category: 'ui',
    },
    ui_tower_select: {
        // Select Magic Crystal — shimmery, strategic feel
        files: ['ui_tower_select_1.wav', 'ui_tower_select_2.wav', 'ui_tower_select_3.wav', 'ui_tower_select_4.wav'],
        volume: 0.45,
        pitch: [0.95, 1.05],
        category: 'ui',
    },
    ui_tower_deselect: {
        // Button Back Undo — satisfying "nevermind"
        files: ['ui_tower_deselect.wav', 'ui_tower_deselect_2.wav'],
        volume: 0.35,
        pitch: [0.9, 1.0],
        category: 'ui',
    },
    slider_tick: {
        // Click Tiny Tactile — incremental tactile tick
        files: ['slider_tick.wav'],
        volume: 0.15,
        pitch: [0.9, 1.1],
        category: 'ui',
        cooldown: 0.03,
    },
    menu_transition: {
        // Swipe Slide — screen transitions (title→scenario, etc.)
        files: ['menu_transition_1.wav', 'menu_transition_2.wav', 'menu_transition_3.wav'],
        volume: 0.4,
        pitch: [0.95, 1.05],
        category: 'ui',
    },
    scenario_hover: {
        // General Interact Playful Short — hovering over scenario cards
        files: ['scenario_hover_1.wav', 'scenario_hover_2.wav', 'scenario_hover_3.wav'],
        volume: 0.25,
        pitch: [0.9, 1.1],
        category: 'ui',
        cooldown: 0.08,
    },
    scenario_lock: {
        // Alert Playful Deny — "not yet!" for locked scenarios
        files: ['scenario_lock_1.wav', 'scenario_lock_2.wav'],
        volume: 0.4,
        pitch: [0.9, 1.05],
        category: 'ui',
    },
    tower_deny: {
        // Button Deny — "can't afford" / "can't place here"
        files: ['tower_deny_1.wav', 'tower_deny_2.wav'],
        volume: 0.35,
        pitch: [0.9, 1.05],
        category: 'ui',
        cooldown: 0.3,
    },
    drone_hover: {
        // Select Poppy — hovering over an upgrade drone
        files: ['drone_hover_1.wav', 'drone_hover_2.wav', 'drone_hover_3.wav'],
        volume: 0.3,
        pitch: [0.95, 1.1],
        category: 'ui',
        cooldown: 0.1,
    },
    new_high_score: {
        // Alert Unique Achievement Long — epic celebration for beating your record
        files: ['new_high_score_1.wav', 'new_high_score_2.wav'],
        volume: 0.7,
        pitch: [0.95, 1.0],
        category: 'ui',
    },

    // ─── WAVE EVENTS ───────────────────────────────────────────────────────
    // Scenario-specific wave start sounds (grammar: environment defines the chime)

    wave_start: {
        // Legacy fallback — kept for any scenario without a specific chime
        files: ['wave_start_1.wav', 'wave_start_2.wav', 'wave_start_3.wav'],
        volume: 0.55,
        pitch: [0.9, 1.1],
        category: 'sfx',
    },
    wave_start_office: {
        // Glass ding — corporate PA chime: cold, crisp, "your number's up"
        files: ['wave_start_office_1.wav', 'wave_start_office_2.wav', 'wave_start_office_3.wav'],
        volume: 0.55,
        pitch: [0.9, 1.1],
        category: 'sfx',
    },
    wave_start_forest: {
        // Wood hit — hollow log drum: primal, natural warning
        files: ['wave_start_forest_1.wav', 'wave_start_forest_2.wav', 'wave_start_forest_3.wav'],
        volume: 0.55,
        pitch: [0.85, 1.05],
        category: 'sfx',
    },
    wave_start_ocean: {
        // Splash — wave crashing: something's coming from the water
        files: ['wave_start_ocean_1.wav', 'wave_start_ocean_2.wav', 'wave_start_ocean_3.wav'],
        volume: 0.55,
        pitch: [0.9, 1.1],
        category: 'sfx',
    },
    wave_start_airplane: {
        // Oven ding / beep — seatbelt sign chime: instantly recognizable airline tone
        files: ['wave_start_airplane_1.wav', 'wave_start_airplane_2.wav', 'wave_start_airplane_3.wav'],
        volume: 0.55,
        pitch: [0.95, 1.05],
        category: 'sfx',
    },
    wave_clear: {
        // Alert Unique Achievement Short — quick victory fanfare
        files: ['wave_clear_1.wav', 'wave_clear_2.wav', 'wave_clear_3.wav'],
        volume: 0.6,
        pitch: [0.95, 1.05],
        category: 'sfx',
    },
    wave_event: {
        files: ['wave_event_1.wav', 'wave_event_2.wav', 'wave_event_3.wav'],
        volume: 0.55,
        pitch: [0.9, 1.05],
        category: 'sfx',
    },

    // ─── ENEMY ─────────────────────────────────────────────────────────────

    enemy_spawn: {
        files: ['enemy_spawn_1.wav', 'enemy_spawn_2.wav', 'enemy_spawn_3.wav'],
        volume: 0.2,
        pitch: [0.8, 1.2],
        category: 'sfx',
        cooldown: 0.3,
        maxSimultaneous: 2,
    },
    enemy_hit: {
        files: ['enemy_hit_1.wav', 'enemy_hit_2.wav', 'enemy_hit_3.wav', 'enemy_hit_4.wav'],
        volume: 0.35,
        pitch: [0.85, 1.15],
        category: 'sfx',
        cooldown: 0.04,
        maxSimultaneous: 4,
    },
    enemy_oof: {
        // Legacy fallback — used when no role-specific death vocal exists
        files: ['enemy_oof_1.wav', 'enemy_oof_2.wav', 'enemy_oof_3.wav', 'enemy_oof_4.wav', 'enemy_oof_5.wav', 'enemy_oof_6.wav'],
        volume: 0.4,
        pitch: [0.8, 1.3],
        category: 'sfx',
        cooldown: 0.15,
        maxSimultaneous: 3,
    },

    // ─── ROLE-BASED DEATH VOCALS ─────────────────────────────────────────
    // Grammar: pitch = size (bigger → deeper), texture = personality (unique per role)
    // Each role has a non-overlapping sound source. No two roles share files.

    death_composed: {
        // Restrained, dignified oofs. A quiet "excuse me" and nothing more.
        // → polite, deer, dolphin, nervous
        files: ['death_composed_1.wav', 'death_composed_2.wav', 'death_composed_3.wav', 'death_composed_4.wav'],
        volume: 0.4,
        pitch: [0.9, 1.0],
        category: 'sfx',
        cooldown: 0.15,
        maxSimultaneous: 3,
    },
    death_frantic: {
        // Quick, clipped oofs. Can't even go down quietly.
        // → dancer, squirrel, flyfish, attendant
        files: ['death_frantic_1.wav', 'death_frantic_2.wav', 'death_frantic_3.wav', 'death_frantic_4.wav'],
        volume: 0.4,
        pitch: [1.1, 1.3],
        category: 'sfx',
        cooldown: 0.1,
        maxSimultaneous: 4,
    },
    death_heavy: {
        // Deep, guttural body hits + oofs. You hear the WEIGHT.
        // → waddle, bear, shark, stumbler
        files: ['death_heavy_1.wav', 'death_heavy_2.wav', 'death_heavy_3.wav', 'death_heavy_4.wav',
                'death_heavy_5.wav', 'death_heavy_6.wav', 'death_heavy_7.wav'],
        volume: 0.45,
        pitch: [0.7, 0.85],
        category: 'sfx',
        cooldown: 0.15,
        maxSimultaneous: 3,
    },
    death_scream: {
        // Screams — EXCLUSIVE to this role. Only screamers scream.
        // → panicker, fox, pirate, marshal
        files: ['death_scream_1.wav', 'death_scream_2.wav', 'death_scream_3.wav',
                'death_scream_4.wav', 'death_scream_5.wav', 'death_scream_6.wav'],
        volume: 0.4,
        pitch: [0.85, 0.95],
        category: 'sfx',
        cooldown: 0.15,
        maxSimultaneous: 3,
    },
    death_sharp: {
        // Sharp exhales + coughs. Wind knocked out mid-stride. No drama.
        // → powerwalker, moose, seaturtle, business
        files: ['death_sharp_1.wav', 'death_sharp_2.wav', 'death_sharp_3.wav',
                'death_sharp_4.wav', 'death_sharp_5.wav', 'death_sharp_6.wav'],
        volume: 0.4,
        pitch: [0.95, 1.05],
        category: 'sfx',
        cooldown: 0.15,
        maxSimultaneous: 3,
    },
    death_chorus: {
        // Meows — comedic, distinctive. Overlapping from groups.
        // → girls, raccoon, jellyfish, unruly
        files: ['death_chorus_1.wav', 'death_chorus_2.wav', 'death_chorus_3.wav'],
        volume: 0.4,
        pitch: [1.3, 1.5],
        category: 'sfx',
        cooldown: 0.08,
        maxSimultaneous: 5,
    },
    enemy_death: {
        files: ['enemy_death_1.wav', 'enemy_death_2.wav', 'enemy_death_3.wav', 'enemy_death_4.wav', 'enemy_death_5.wav'],
        volume: 0.4,
        pitch: [0.85, 1.15],
        category: 'sfx',
        cooldown: 0.08,
        maxSimultaneous: 4,
    },
    enemy_panic: {
        files: ['enemy_panic_1.wav', 'enemy_panic_2.wav', 'enemy_panic_3.wav'],
        volume: 0.3,
        pitch: [1.0, 1.4],
        category: 'sfx',
        cooldown: 0.5,
        maxSimultaneous: 2,
    },
    last_straw: {
        files: ['last_straw_1.wav', 'last_straw_2.wav'],
        volume: 0.45,
        pitch: [0.9, 1.1],
        category: 'sfx',
        cooldown: 0.3,
    },
    footstep: {
        files: ['footstep_1.wav', 'footstep_2.wav', 'footstep_3.wav', 'footstep_4.wav', 'footstep_5.wav', 'footstep_6.wav'],
        volume: 0.08,
        pitch: [0.8, 1.2],
        category: 'sfx',
        cooldown: 0.12,
        maxSimultaneous: 3,
    },

    // ─── DOOR ──────────────────────────────────────────────────────────────

    door_bash: {
        files: ['door_bash_1.wav', 'door_bash_2.wav', 'door_bash_3.wav', 'door_bash_4.wav'],
        volume: 0.55,
        pitch: [0.85, 1.1],
        category: 'sfx',
        cooldown: 0.15,
        maxSimultaneous: 3,
    },
    door_crack: {
        files: ['door_crack_1.wav', 'door_crack_2.wav', 'door_crack_3.wav'],
        volume: 0.5,
        pitch: [0.9, 1.1],
        category: 'sfx',
        cooldown: 0.2,
    },
    door_shatter: {
        files: ['door_shatter_1.wav', 'door_shatter_2.wav'],
        volume: 0.8,
        pitch: [0.9, 1.0],
        category: 'sfx',
    },

    // ─── TOWERS ────────────────────────────────────────────────────────────

    tower_place: {
        files: ['tower_place_1.wav', 'tower_place_2.wav', 'tower_place_3.wav'],
        volume: 0.5,
        pitch: [0.9, 1.1],
        category: 'sfx',
    },
    tower_hit: {
        files: ['tower_hit_1.wav', 'tower_hit_2.wav', 'tower_hit_3.wav'],
        volume: 0.35,
        pitch: [0.85, 1.15],
        category: 'sfx',
        cooldown: 0.2,
        maxSimultaneous: 2,
    },
    tower_destroy: {
        files: ['tower_destroy_1.wav', 'tower_destroy_2.wav', 'tower_destroy_3.wav'],
        volume: 0.55,
        pitch: [0.9, 1.05],
        category: 'sfx',
    },

    // ─── MOP TURRET ────────────────────────────────────────────────────────

    mop_sweep: {
        files: ['mop_sweep_1.wav', 'mop_sweep_2.wav', 'mop_sweep_3.wav', 'mop_sweep_4.wav'],
        volume: 0.4,
        pitch: [0.85, 1.1],
        category: 'sfx',
        cooldown: 0.1,
        maxSimultaneous: 3,
    },
    mop_hit: {
        files: ['mop_hit_1.wav', 'mop_hit_2.wav', 'mop_hit_3.wav', 'mop_hit_4.wav'],
        volume: 0.45,
        pitch: [0.9, 1.15],
        category: 'sfx',
        cooldown: 0.04,
        maxSimultaneous: 5,
    },

    // ─── UBIK SPRAY ────────────────────────────────────────────────────────

    spray_fire: {
        files: ['spray_fire_1.wav', 'spray_fire_2.wav', 'spray_fire_3.wav'],
        volume: 0.4,
        pitch: [0.9, 1.1],
        category: 'sfx',
        cooldown: 0.2,
        maxSimultaneous: 2,
    },
    spray_hit: {
        files: ['spray_hit_1.wav', 'spray_hit_2.wav', 'spray_hit_3.wav'],
        volume: 0.25,
        pitch: [0.85, 1.15],
        category: 'sfx',
        cooldown: 0.08,
        maxSimultaneous: 3,
    },

    // ─── POT PLANT ─────────────────────────────────────────────────────────

    pot_place: {
        files: ['pot_place_1.wav', 'pot_place_2.wav'],
        volume: 0.45,
        pitch: [0.9, 1.1],
        category: 'sfx',
    },
    pot_kick: {
        files: ['pot_kick_1.wav', 'pot_kick_2.wav', 'pot_kick_3.wav'],
        volume: 0.5,
        pitch: [0.85, 1.1],
        category: 'sfx',
        cooldown: 0.1,
    },
    pot_shatter: {
        files: ['pot_shatter_1.wav', 'pot_shatter_2.wav', 'pot_shatter_3.wav'],
        volume: 0.55,
        pitch: [0.9, 1.1],
        category: 'sfx',
    },
    pot_trip: {
        files: ['pot_trip_1.wav', 'pot_trip_2.wav'],
        volume: 0.5,
        pitch: [0.9, 1.05],
        category: 'sfx',
    },

    // ─── WET FLOOR SIGN ────────────────────────────────────────────────────

    sign_place: {
        files: ['sign_place_1.wav', 'sign_place_2.wav'],
        volume: 0.45,
        pitch: [0.95, 1.05],
        category: 'sfx',
    },
    barrier_hit: {
        files: ['barrier_hit_1.wav', 'barrier_hit_2.wav'],
        volume: 0.35,
        pitch: [0.85, 1.1],
        category: 'sfx',
        cooldown: 0.2,
    },

    // ─── COIN MAGNET ───────────────────────────────────────────────────────

    magnet_pull: {
        files: ['magnet_pull_1.wav', 'magnet_pull_2.wav'],
        volume: 0.2,
        pitch: [0.9, 1.1],
        category: 'sfx',
        cooldown: 0.3,
        maxSimultaneous: 2,
    },

    // ─── COINS ─────────────────────────────────────────────────────────────

    coin_drop: {
        files: ['coin_drop_1.wav', 'coin_drop_2.wav', 'coin_drop_3.wav', 'coin_drop_4.wav'],
        volume: 0.3,
        pitch: [0.85, 1.2],
        category: 'sfx',
        cooldown: 0.05,
        maxSimultaneous: 4,
    },
    coin_collect: {
        files: ['coin_collect_1.wav', 'coin_collect_2.wav', 'coin_collect_3.wav'],
        volume: 0.3,
        pitch: [0.9, 1.3],
        category: 'sfx',
        cooldown: 0.03,
        maxSimultaneous: 5,
    },
    coin_bonus: {
        files: ['coin_bonus_1.wav', 'coin_bonus_2.wav'],
        volume: 0.5,
        pitch: [0.95, 1.05],
        category: 'sfx',
    },
    coin_spend: {
        files: ['coin_spend_1.wav', 'coin_spend_2.wav'],
        volume: 0.35,
        pitch: [0.9, 1.05],
        category: 'sfx',
    },

    // ─── IMPACT / JUICE ───────────────────────────────────────────────────

    impact_big: {
        files: ['impact_big_1.wav', 'impact_big_2.wav', 'impact_big_3.wav', 'impact_big_4.wav'],
        volume: 0.55,
        pitch: [0.85, 1.1],
        category: 'sfx',
        cooldown: 0.06,
        maxSimultaneous: 3,
    },
    impact_med: {
        files: ['impact_med_1.wav', 'impact_med_2.wav', 'impact_med_3.wav'],
        volume: 0.4,
        pitch: [0.85, 1.15],
        category: 'sfx',
        cooldown: 0.04,
        maxSimultaneous: 4,
    },
    knockback_collision: {
        files: ['knockback_collision_1.wav', 'knockback_collision_2.wav', 'knockback_collision_3.wav'],
        volume: 0.5,
        pitch: [0.9, 1.1],
        category: 'sfx',
        cooldown: 0.15,
    },
    stun_impact: {
        files: ['stun_impact_1.wav', 'stun_impact_2.wav'],
        volume: 0.45,
        pitch: [0.9, 1.05],
        category: 'sfx',
        cooldown: 0.1,
    },
    splash: {
        files: ['splash_1.wav', 'splash_2.wav', 'splash_3.wav'],
        volume: 0.3,
        pitch: [0.85, 1.15],
        category: 'sfx',
        cooldown: 0.1,
        maxSimultaneous: 3,
    },
    slip: {
        files: ['slip_1.wav', 'slip_2.wav'],
        volume: 0.2,
        pitch: [0.9, 1.1],
        category: 'sfx',
        cooldown: 0.4,
        maxSimultaneous: 2,
    },
    comic_pop: {
        files: ['comic_pop_1.wav', 'comic_pop_2.wav'],
        volume: 0.35,
        pitch: [0.9, 1.2],
        category: 'sfx',
        cooldown: 0.1,
    },
    zoom_punch: {
        files: ['zoom_punch.wav'],
        volume: 0.4,
        pitch: [0.95, 1.05],
        category: 'sfx',
    },

    // ─── UPGRADE SYSTEM ───────────────────────────────────────────────────

    drone_arrive: {
        // General Interact Playful Short — bubbly drone entrance
        files: ['drone_arrive_1.wav', 'drone_arrive_2.wav', 'drone_arrive_3.wav'],
        volume: 0.4,
        pitch: [0.9, 1.1],
        category: 'sfx',
        cooldown: 0.2,
    },
    drone_reject: {
        // Alert Playful Deny — playful "nope, not that one"
        files: ['drone_reject.wav', 'drone_reject_2.wav', 'drone_reject_3.wav'],
        volume: 0.3,
        pitch: [0.85, 1.0],
        category: 'sfx',
    },
    drone_wobble: {
        // Robot Assistant Vocalization — drones chirp and burble with personality
        files: ['drone_wobble_1.wav', 'drone_wobble_2.wav', 'drone_wobble_3.wav', 'drone_wobble_4.wav'],
        volume: 0.15,
        pitch: [0.9, 1.1],
        category: 'sfx',
        cooldown: 0.3,
    },
    upgrade_common: {
        // Alert Unique Achievement Short — quick satisfying ping
        files: ['upgrade_common_1.wav', 'upgrade_common_2.wav', 'upgrade_common_3.wav', 'upgrade_common_4.wav'],
        volume: 0.5,
        pitch: [0.95, 1.05],
        category: 'ui',
    },
    upgrade_rare: {
        // Alert Unique Discovery — "found something special"
        files: ['upgrade_rare_1.wav', 'upgrade_rare_2.wav', 'upgrade_rare_3.wav'],
        volume: 0.6,
        pitch: [0.95, 1.05],
        category: 'ui',
    },
    upgrade_legendary: {
        // Alert Unique Achievement Long — THE triumphant fanfare
        files: ['upgrade_legendary_1.wav', 'upgrade_legendary_2.wav', 'upgrade_legendary_3.wav'],
        volume: 0.7,
        pitch: [0.95, 1.0],
        category: 'ui',
    },
    upgrade_acquire: {
        // Notification Popup — satisfying "got it" confirmation
        files: ['upgrade_acquire_1.wav', 'upgrade_acquire_2.wav'],
        volume: 0.5,
        pitch: [0.95, 1.05],
        category: 'ui',
    },
    card_fly: {
        // Swipe Slide — swoosh as card flies to HUD
        files: ['card_fly_1.wav', 'card_fly_2.wav'],
        volume: 0.35,
        pitch: [1.0, 1.2],
        category: 'ui',
    },
    card_land: {
        // Button Plip Pops — satisfying snap into place
        files: ['card_land_1.wav', 'card_land_2.wav', 'card_land_3.wav'],
        volume: 0.45,
        pitch: [0.95, 1.05],
        category: 'ui',
    },

    // ─── DRONES (TOWER DELIVERY + MEDIC) ──────────────────────────────────

    drone_fly: {
        files: ['drone_fly_1.wav', 'drone_fly_2.wav', 'drone_fly_3.wav'],
        volume: 0.3,
        pitch: [0.9, 1.1],
        category: 'sfx',
        cooldown: 0.3,
    },
    package_open: {
        files: ['package_open_1.wav', 'package_open_2.wav'],
        volume: 0.4,
        pitch: [0.95, 1.05],
        category: 'sfx',
    },
    medic_pickup: {
        files: ['medic_pickup_1.wav', 'medic_pickup_2.wav'],
        volume: 0.25,
        pitch: [0.9, 1.1],
        category: 'sfx',
        cooldown: 0.3,
    },
    medic_flyaway: {
        files: ['medic_flyaway_1.wav', 'medic_flyaway_2.wav'],
        volume: 0.2,
        pitch: [0.9, 1.1],
        category: 'sfx',
        cooldown: 0.3,
    },

    // ─── ENEMY INTRO ──────────────────────────────────────────────────────

    intro_reveal: {
        files: ['intro_reveal_1.wav', 'intro_reveal_2.wav'],
        volume: 0.5,
        pitch: [0.95, 1.05],
        category: 'sfx',
    },
    intro_continue: {
        files: ['intro_continue.wav'],
        volume: 0.4,
        pitch: [1.0, 1.0],
        category: 'ui',
    },

    // ─── EXIT DOOR ────────────────────────────────────────────────────────

    exit_door: {
        files: ['exit_door_1.wav', 'exit_door_2.wav'],
        volume: 0.15,
        pitch: [0.9, 1.1],
        category: 'sfx',
        cooldown: 0.3,
    },

    // ─── TOILET ───────────────────────────────────────────────────────────

    toilet_flush: {
        files: ['toilet_flush_1.wav', 'toilet_flush_2.wav'],
        volume: 0.6,
        pitch: [0.95, 1.0],
        category: 'sfx',
    },
    toilet_plunger: {
        files: ['toilet_plunger_1.wav', 'toilet_plunger_2.wav'],
        volume: 0.35,
        pitch: [0.9, 1.1],
        category: 'sfx',
        cooldown: 0.5,
    },
    toilet_rattle: {
        files: ['toilet_rattle_1.wav', 'toilet_rattle_2.wav', 'toilet_rattle_3.wav'],
        volume: 0.15,
        pitch: [0.9, 1.1],
        category: 'sfx',
        cooldown: 0.4,
        maxSimultaneous: 2,
    },
    phone_bounce: {
        files: ['phone_bounce_1.wav', 'phone_bounce_2.wav'],
        volume: 0.35,
        pitch: [0.9, 1.1],
        category: 'sfx',
    },

    // ─── GAME OVER ────────────────────────────────────────────────────────

    game_over: {
        files: ['game_over_flush.wav'],
        volume: 0.7,
        pitch: [1.0, 1.0],
        category: 'sfx',
    },

    // ─── CHIME (generic notification/reward) ──────────────────────────────

    chime: {
        files: ['chime_1.wav', 'chime_2.wav'],
        volume: 0.4,
        pitch: [0.95, 1.05],
        category: 'sfx',
    },

    // ─── AMBIENT ──────────────────────────────────────────────────────────

    ambient_drip: {
        files: ['ambient_drip.wav'],
        volume: 0.08,
        pitch: [1.0, 1.0],
        category: 'ambient',
        loop: true,
    },
    ambient_vent: {
        files: ['ambient_vent.wav'],
        volume: 0.06,
        pitch: [1.0, 1.0],
        category: 'ambient',
        loop: true,
    },
};

// ─── ENEMY TYPE → DEATH VOCAL ROLE ─────────────────────────────────────────
// Maps every enemy type string to its role-based death sound event.
// Grammar: size → pitch (handled by SOUND_EVENTS pitch ranges above),
//          personality → sound source (each role uses unique files).
export const ENEMY_DEATH_VOCAL = {
    // Office
    polite:      'death_composed',
    dancer:      'death_frantic',
    waddle:      'death_heavy',
    panicker:    'death_scream',
    powerwalker: 'death_sharp',
    girls:       'death_chorus',
    // Forest
    deer:        'death_composed',
    squirrel:    'death_frantic',
    bear:        'death_heavy',
    fox:         'death_scream',
    moose:       'death_sharp',
    raccoon:     'death_chorus',
    // Ocean
    dolphin:     'death_composed',
    flyfish:     'death_frantic',
    shark:       'death_heavy',
    pirate:      'death_scream',
    seaturtle:   'death_sharp',
    jellyfish:   'death_chorus',
    // Airplane
    nervous:     'death_composed',
    attendant:   'death_frantic',
    stumbler:    'death_heavy',
    marshal:     'death_scream',
    business:    'death_sharp',
    unruly:      'death_chorus',
};

export { SFX_PATH };
