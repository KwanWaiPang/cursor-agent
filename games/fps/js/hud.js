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
  };

  let toastTimer = 0;
  let hitTimer = 0;
  let dmgTimer = 0;

  return {
    show() {
      els.root.classList.remove("hidden");
      els.root.setAttribute("aria-hidden", "false");
    },
    hide() {
      els.root.classList.add("hidden");
      els.root.setAttribute("aria-hidden", "true");
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
      toastTimer = 2.2;
    },
    updatePlayer(player, loadout) {
      const pct = player.hp / player.maxHp;
      els.hpBar.style.transform = `scaleX(${Math.max(0, pct)})`;
      els.hpText.textContent = `${Math.ceil(player.hp)}`;
      const reload = loadout.reloading ? " 换弹…" : "";
      els.ammoText.textContent = `${loadout.mag} / ${loadout.reserve}${reload}`;
      els.weaponName.textContent = loadout.def.name;
    },
    flashHit() {
      els.hitMarker.classList.add("show");
      hitTimer = 0.12;
    },
    flashDamage() {
      els.damageVignette.classList.add("on");
      dmgTimer = 0.25;
    },
    flashFire() {
      els.crosshair.classList.add("fire");
      setTimeout(() => els.crosshair.classList.remove("fire"), 50);
    },
    tick(dt) {
      if (toastTimer > 0) {
        toastTimer -= dt;
        if (toastTimer <= 0) els.toast.classList.remove("show");
      }
      if (hitTimer > 0) {
        hitTimer -= dt;
        if (hitTimer <= 0) els.hitMarker.classList.remove("show");
      }
      if (dmgTimer > 0) {
        dmgTimer -= dt;
        if (dmgTimer <= 0) els.damageVignette.classList.remove("on");
      }
    },
  };
}
