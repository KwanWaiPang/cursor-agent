/**
 * 回合战斗状态机（无 DOM）。灵感来自 pallet-town-3d 的 BattleEngine。
 */
import {
  MOVES,
  SPECIES,
  computeDamage,
  accuracyStageMultiplier,
  stageMultiplier,
  statsAtLevel,
} from "./data.js";

function buildCombatant(side, init) {
  const data = SPECIES[init.species];
  const stats = statsAtLevel(data, init.level);
  return {
    side,
    species: init.species,
    name: data.name,
    level: init.level,
    stats,
    hp: Math.max(1, Math.min(stats.hp, init.hp ?? stats.hp)),
    moves: (init.moves || data.moves.slice(0, 4)).map((m) =>
      typeof m === "string" ? { id: m, pp: MOVES[m].pp } : { id: m.id, pp: m.pp }
    ),
    stages: { atk: 0, def: 0, spe: 0, acc: 0 },
  };
}

export class Battle {
  constructor({
    player,
    wild,
    seed = (Math.random() * 1e9) | 0,
    canRun = true,
    trainer = false,
  }) {
    this.player = buildCombatant("player", player);
    this.wild = buildCombatant("wild", wild);
    this.canRun = canRun;
    this.trainer = !!trainer;
    this.result = null;
    this.runAttempts = 0;
    let s = seed >>> 0 || 1;
    this.rng = () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 0x100000000;
    };
  }

  side(s) {
    return s === "player" ? this.player : this.wild;
  }

  turn(action) {
    if (this.result) return [];
    const events = [];

    if (action.type === "run") {
      if (!this.canRun) {
        events.push({ kind: "run", success: false });
        this.act(this.wild, this.player, this.pickWildMove(), events);
        this.checkEnd(events);
        return events;
      }
      this.runAttempts++;
      if (this.tryRun()) {
        events.push({ kind: "run", success: true });
        events.push({ kind: "end", result: "fled" });
        this.result = "fled";
        return events;
      }
      events.push({ kind: "run", success: false });
      this.act(this.wild, this.player, this.pickWildMove(), events);
      this.checkEnd(events);
      return events;
    }

    const playerMove = this.moveFor(this.player, action.index);
    const wildMove = this.pickWildMove();
    const first = this.orderFirst(playerMove, wildMove);
    const order =
      first === "player"
        ? [
            [this.player, this.wild, playerMove],
            [this.wild, this.player, wildMove],
          ]
        : [
            [this.wild, this.player, wildMove],
            [this.player, this.wild, playerMove],
          ];

    for (const [attacker, defender, move] of order) {
      if (this.result) break;
      if (attacker.hp <= 0) continue;
      this.act(attacker, defender, move, events);
      this.checkEnd(events);
    }
    return events;
  }

  moveFor(c, index) {
    const slot = c.moves[index] || c.moves[0];
    return MOVES[slot.id];
  }

  pickWildMove() {
    const usable = this.wild.moves.filter((m) => m.pp > 0);
    const pool = usable.length ? usable : this.wild.moves;
    const pick = pool[Math.floor(this.rng() * pool.length)];
    return MOVES[pick.id];
  }

  orderFirst(playerMove, wildMove) {
    if (playerMove.priority !== wildMove.priority) {
      return playerMove.priority > wildMove.priority ? "player" : "wild";
    }
    const ps = this.player.stats.spe * stageMultiplier(this.player.stages.spe);
    const ws = this.wild.stats.spe * stageMultiplier(this.wild.stages.spe);
    if (ps === ws) return this.rng() < 0.5 ? "player" : "wild";
    return ps > ws ? "player" : "wild";
  }

  act(attacker, defender, move, events) {
    const slot = attacker.moves.find((m) => m.id === move.id);
    if (slot && slot.pp > 0) slot.pp--;

    const acc =
      move.accuracy *
      accuracyStageMultiplier(attacker.stages.acc) *
      accuracyStageMultiplier(-defender.stages.acc);
    if (this.rng() > acc) {
      events.push({
        kind: "move",
        side: attacker.side,
        moveId: move.id,
        moveName: move.name,
        missed: true,
        damage: 0,
        effectiveness: 1,
        crit: false,
        hpAfter: defender.hp,
      });
      return;
    }

    if (move.category === "status" && move.effect) {
      const target = move.effect.target === "self" ? attacker : defender;
      const before = target.stages[move.effect.stat];
      const next = Math.max(-6, Math.min(6, before + move.effect.delta));
      const failed = next === before;
      if (!failed) target.stages[move.effect.stat] = next;
      events.push({
        kind: "stat",
        side: attacker.side,
        target: target.side,
        stat: move.effect.stat,
        delta: move.effect.delta,
        failed,
        moveName: move.name,
      });
      return;
    }

    const atkMod = attacker.stats.atk * stageMultiplier(attacker.stages.atk);
    const defMod = defender.stats.def * stageMultiplier(defender.stages.def);
    const roll = computeDamage(
      attacker.level,
      move,
      atkMod,
      defMod,
      attacker.stats.atk,
      defender.stats.def,
      SPECIES[attacker.species].types,
      SPECIES[defender.species].types,
      this.rng
    );
    defender.hp = Math.max(0, defender.hp - roll.damage);
    events.push({
      kind: "move",
      side: attacker.side,
      moveId: move.id,
      moveName: move.name,
      missed: false,
      damage: roll.damage,
      effectiveness: roll.effectiveness,
      crit: roll.crit,
      hpAfter: defender.hp,
    });
  }

  tryRun() {
    const A = this.player.stats.spe;
    const B = Math.max(1, Math.floor(this.wild.stats.spe / 4) % 256);
    const C = this.runAttempts;
    const F = Math.floor((A * 128) / B + 30 * C);
    return F > 255 || this.rng() * 256 < F;
  }

  checkEnd(events) {
    if (this.wild.hp <= 0) {
      events.push({ kind: "faint", side: "wild" });
      events.push({ kind: "end", result: "victory" });
      this.result = "victory";
    } else if (this.player.hp <= 0) {
      events.push({ kind: "faint", side: "player" });
      events.push({ kind: "end", result: "defeat" });
      this.result = "defeat";
    }
  }
}
