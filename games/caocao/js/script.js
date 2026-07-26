/**
 * 关卡脚本运行时（参考 mengde stage Lua：end_condition / events / turn_limit）
 */

export const Status = {
  undecided: "undecided",
  victory: "victory",
  defeat: "defeat",
};

/** 内置脚本工厂：按战役元数据生成 mengde 风格 end_condition */
export function buildDefaultScript(stage) {
  const win = stage.win || { type: "rout" };
  const turnLimit = win.turns || stage.turnLimit || null;

  return {
    turnLimit: turnLimit && (win.type === "survive" || win.type === "rout_or_turns")
      ? turnLimit
      : stage.turnLimit || null,
    endCondition(game) {
      const owns = game.units.filter((u) => u.alive && u.team === "player");
      const lord = game.units.find((u) => u.lord);
      if (!lord || !lord.alive || owns.length === 0) return Status.defeat;

      const enemies = game.units.filter((u) => u.alive && u.team === "enemy");
      if (win.type === "escape") {
        const name = win.unit || "曹操";
        const unit = game.units.find((u) => u.alive && u.name === name);
        const row =
          win.row != null
            ? win.row
            : game.height - 1 - (win.rowFromBottom || 0);
        if (unit && unit.y >= row) return Status.victory;
        return Status.undecided;
      }
      if (win.type === "survive") {
        if (game.turn > (win.turns || 14)) return Status.victory;
        if (!enemies.length) return Status.victory;
        return Status.undecided;
      }
      if (win.type === "rout_or_turns") {
        if (!enemies.length) return Status.victory;
        if (game.turn > (win.turns || 20)) return Status.victory;
        return Status.undecided;
      }
      if (win.type === "boss" || win.type === "boss_or_rout") {
        const boss =
          game.units.find((u) => u.boss) ||
          game.units.find((u) => u.name === win.bossName);
        if (boss && !boss.alive) return Status.victory;
        if (win.type === "boss_or_rout" && !enemies.length) return Status.victory;
        return Status.undecided;
      }
      // rout
      if (!enemies.length) return Status.victory;
      return Status.undecided;
    },
    events: stage.scriptEvents || [],
  };
}

/**
 * @param {object} state battle state
 * @param {object} script
 * @returns {'undecided'|'victory'|'defeat'}
 */
export function evalEndCondition(state, script) {
  if (!script?.endCondition) return Status.undecided;
  return script.endCondition(state);
}

/** 检查并触发一次性事件 */
export function tickEvents(state, script, onSpeak) {
  if (!script?.events?.length) return;
  for (const ev of script.events) {
    if (ev.done || !ev.condition) continue;
    try {
      if (ev.condition(state)) {
        ev.done = true;
        ev.handler?.(state, { speak: onSpeak });
      }
    } catch {
      /* ignore bad event */
    }
  }
}

export function tickConditions(state) {
  for (const u of state.units) {
    if (!u.alive || !u.conditions?.length) continue;
    u.conditions = u.conditions
      .map((c) => ({ ...c, turns: c.turns - 1 }))
      .filter((c) => c.turns > 0);
  }
}
