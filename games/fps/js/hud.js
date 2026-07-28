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
  };

  let toastTimer = 0;
  let hitTimer = 0;
  let dmgTimer = 0;
  let fireClear = 0;

  return {
    show() {
      els.root.classList.remove("hidden");
      els.root.setAttribute("aria-hidden", "false");
    },
    hide() {
      els.root.classList.add("hidden");
      els.root.setAttribute("aria-hidden", "true");
      els.zoneHint?.classList.add("hidden");
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
      const ang = Math.atan2(info.dx || 0, info.dz || 0);
      if (els.zoneArrow) {
        els.zoneArrow.style.transform = `rotate(${(ang * 180) / Math.PI}deg)`;
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
      let reload = "";
      if (loadout.reloading) {
        const left = Math.max(0, (loadout.reloadEnds - performance.now()) / 1000);
        reload = ` 换弹 ${left.toFixed(1)}s`;
      }
      els.ammoText.textContent = `${loadout.mag} / ${loadout.reserve}${reload}`;
      els.weaponName.textContent = loadout.def.name;
    },
    flashHit(headshot = false) {
      els.hitMarker.classList.toggle("headshot", !!headshot);
      els.hitMarker.classList.add("show");
      hitTimer = headshot ? 0.2 : 0.12;
    },
    flashDamage() {
      els.damageVignette.classList.add("on");
      dmgTimer = 0.25;
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
      if (fireClear > 0) {
        fireClear -= dt;
        if (fireClear <= 0) els.crosshair.classList.remove("fire");
      }
    },
  };
}
