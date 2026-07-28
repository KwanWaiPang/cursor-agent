export function createHud() {
  const els = {
    root: document.getElementById("hud"),
    modeLabel: document.getElementById("modeLabel"),
    objective: document.getElementById("objective"),
    hpBar: document.getElementById("hpBar"),
    hpText: document.getElementById("hpText"),
    ammoText: document.getElementById("ammoText"),
    weaponName: document.getElementById("weaponName"),
    scoreText: document.getElementById("scoreText"),
    toast: document.getElementById("toast"),
    crosshair: document.getElementById("crosshair"),
    hitMarker: document.getElementById("hitMarker"),
    damageVignette: document.getElementById("damageVignette"),
    zoneHint: document.getElementById("zoneHint"),
    zoneArrow: document.getElementById("zoneArrow"),
    zoneHintText: document.getElementById("zoneHintText"),
    reloadTrack: document.getElementById("reloadTrack"),
    reloadBar: document.getElementById("reloadBar"),
    medkitText: document.getElementById("medkitText"),
    hitDir: document.getElementById("hitDir"),
  };

  let toastTimer = 0;
  let hitTimer = 0;
  let dmgTimer = 0;
  let fireClear = 0;
  let hitDirTimer = 0;

  return {
    show() {
      els.root.classList.remove("hidden");
      els.root.setAttribute("aria-hidden", "false");
    },
    hide() {
      els.root.classList.add("hidden");
      els.root.setAttribute("aria-hidden", "true");
      els.zoneHint?.classList.add("hidden");
      els.hitDir?.classList.add("hidden");
      els.reloadTrack?.classList.add("hidden");
    },
    setMode(text) {
      els.modeLabel.textContent = text;
    },
    setObjective(text) {
      els.objective.textContent = text;
    },
    setScore(text) {
      els.scoreText.textContent = text;
    },
    /** 玩家击杀数（仅本人，不含队友） */
    setKills(n) {
      const v = Math.max(0, n | 0);
      els.scoreText.textContent = String(v);
      els.scoreText.dataset.kills = String(v);
    },
    toast(text) {
      els.toast.textContent = text;
      els.toast.classList.add("show");
      toastTimer = 2.6;
    },
    setZoneHint(info) {
      if (!els.zoneHint || !info) {
        els.zoneHint?.classList.add("hidden");
        return;
      }
      els.zoneHint.classList.remove("hidden");
      els.zoneHint.classList.toggle("outside", !!info.outside);
      // 相对玩家朝向：世界方位 − yaw
      const worldAng = Math.atan2(info.dx || 0, info.dz || 0);
      const yaw = info.yaw || 0;
      let rel = worldAng - yaw;
      while (rel > Math.PI) rel -= Math.PI * 2;
      while (rel < -Math.PI) rel += Math.PI * 2;
      if (els.zoneArrow) {
        els.zoneArrow.style.transform = `rotate(${(rel * 180) / Math.PI}deg)`;
      }
      const dist = info.dist != null ? info.dist.toFixed(0) : "—";
      const extra =
        info.radius != null
          ? ` · 区径 ${info.radius.toFixed(0)}m · 距中心 ${dist}m`
          : ` · ${dist}m`;
      if (els.zoneHintText) {
        els.zoneHintText.textContent = `${info.label || "指引"}${extra}`;
      }
    },
    updatePlayer(player, loadout) {
      const pct = player.hp / player.maxHp;
      els.hpBar.style.transform = `scaleX(${Math.max(0, pct)})`;
      let hpLabel = `${Math.ceil(player.hp)}`;
      if (player.isSpawnProtected) hpLabel += " 护";
      els.hpText.textContent = hpLabel;
      if (els.medkitText) {
        els.medkitText.textContent = player.medkits > 0 ? `急救 ×${player.medkits}` : "";
      }

      if (loadout.reloading) {
        const total = loadout.def.reloadMs || 3000;
        const left = Math.max(0, loadout.reloadEnds - performance.now());
        const done = 1 - left / total;
        els.reloadTrack?.classList.remove("hidden");
        if (els.reloadBar) els.reloadBar.style.transform = `scaleX(${Math.min(1, Math.max(0, done))})`;
        els.ammoText.textContent = `${loadout.mag} / ${loadout.reserve}`;
        els.ammoText.dataset.reload = `换弹 ${(left / 1000).toFixed(1)}s`;
      } else if (loadout.chamberUntil && performance.now() < loadout.chamberUntil) {
        const left = Math.max(0, loadout.chamberUntil - performance.now());
        const total = loadout.def.chamberMs || 1400;
        els.reloadTrack?.classList.remove("hidden");
        if (els.reloadBar) {
          els.reloadBar.style.transform = `scaleX(${Math.min(1, Math.max(0, 1 - left / total))})`;
        }
        els.ammoText.textContent = `${loadout.mag} / ${loadout.reserve}`;
        els.ammoText.dataset.reload = `拉栓 ${(left / 1000).toFixed(1)}s`;
      } else {
        els.reloadTrack?.classList.add("hidden");
        if (els.reloadBar) els.reloadBar.style.transform = "scaleX(0)";
        els.ammoText.textContent = `${loadout.mag} / ${loadout.reserve}`;
        delete els.ammoText.dataset.reload;
        if (loadout.mag <= 0 && loadout.reserve > 0) {
          els.ammoText.dataset.reload = "空仓 · 换弹中";
        } else if (loadout.mag <= 0) {
          els.ammoText.dataset.reload = "弹药耗尽";
        }
      }
      els.weaponName.textContent = loadout.def.name;
      els.root.classList.toggle("reloading", !!loadout.reloading);
      els.root.classList.toggle("empty-mag", loadout.mag <= 0);
    },
    flashHit(headshot = false) {
      els.hitMarker.classList.toggle("headshot", !!headshot);
      els.hitMarker.classList.add("show");
      hitTimer = headshot ? 0.2 : 0.12;
    },
    flashDamage(fromPos, playerYaw = 0, playerPos = null) {
      els.damageVignette.classList.add("on");
      dmgTimer = 0.28;
      if (els.hitDir && fromPos && playerPos) {
        const dx = fromPos.x - playerPos.x;
        const dz = fromPos.z - playerPos.z;
        let rel = Math.atan2(dx, dz) - playerYaw;
        while (rel > Math.PI) rel -= Math.PI * 2;
        while (rel < -Math.PI) rel += Math.PI * 2;
        els.hitDir.classList.remove("hidden");
        els.hitDir.style.transform = `translate(-50%, -50%) rotate(${(rel * 180) / Math.PI}deg)`;
        hitDirTimer = 0.85;
      }
    },
    flashFire() {
      els.crosshair.classList.add("fire");
      fireClear = 0.05;
    },
    tick(dt) {
      if (toastTimer > 0) {
        toastTimer -= dt;
        if (toastTimer <= 0) els.toast.classList.remove("show");
      }
      if (hitTimer > 0) {
        hitTimer -= dt;
        if (hitTimer <= 0) {
          els.hitMarker.classList.remove("show");
          els.hitMarker.classList.remove("headshot");
        }
      }
      if (dmgTimer > 0) {
        dmgTimer -= dt;
        if (dmgTimer <= 0) els.damageVignette.classList.remove("on");
      }
      if (hitDirTimer > 0) {
        hitDirTimer -= dt;
        if (hitDirTimer <= 0) els.hitDir?.classList.add("hidden");
      }
      if (fireClear > 0) {
        fireClear -= dt;
        if (fireClear <= 0) els.crosshair.classList.remove("fire");
      }
    },
  };
}
