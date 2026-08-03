/**
 * AI — squad coordination.
 *
 * The squad exists to stop four individually-sensible soldiers from behaving
 * like one four-headed idiot: it hands out permission to peek so they alternate
 * instead of all leaning out together, shares contact reports so one man
 * spotting you alerts the rest (after a believable call-out delay), rations
 * grenades, allows only one flanker at a time, and assigns suppress/move roles
 * so someone holds fire while a teammate relocates.
 */

import * as THREE from 'three';

let _nextSquad = 1;

export class Squad {
  constructor(rng) {
    this.id = _nextSquad++;
    this.members = [];
    this.rng = rng;
    this.peekTokens = 1;
    this.peekHolders = new Set();
    this.peekTimer = 0;
    this.grenadeCooldown = 6;
    this.flanker = null;
    /** Agent currently ordered to relocate while others suppress. */
    this.mover = null;
    this.contact = new THREE.Vector3();
    this.hasContact = false;
    this.contactAge = Infinity;
    this._pending = [];
    this._roleTimer = 0;
  }

  add(agent) {
    agent.squad = this;
    this.members.push(agent);
    this.peekTokens = Math.max(1, Math.round(this.members.length * 0.5));
    return agent;
  }

  get alive() {
    let n = 0;
    for (const m of this.members) if (m.alive) n++;
    return n;
  }

  /** Called once per frame by the AI system. */
  update(dt) {
    this.grenadeCooldown -= dt;
    this.contactAge += dt;
    this._roleTimer -= dt;
    if (this.flanker && (!this.flanker.alive || this.flanker.state !== 'flank')) this.flanker = null;
    if (this.mover && (!this.mover.alive || (this.mover.state !== 'flank' && this.mover.state !== 'suppressed'))) {
      this.mover = null;
    }

    // contact sharing: whoever can see the player broadcasts, with a delay
    for (const m of this.members) {
      if (!m.alive) continue;
      if (m.hasTarget && m.targetVisible) {
        this.contact.copy(m.lastKnown);
        this.hasContact = true;
        this.contactAge = 0;
        break;
      }
    }
    if (this.hasContact && this.contactAge < 4) {
      for (const m of this.members) {
        if (!m.alive || m.hasTarget) continue;
        // a call-out only gives a direction to check, never a free kill
        if (m.lastKnownAge > 1.5) {
          m.lastKnown.copy(this.contact);
          m.lastKnownAge = 0.9 + this.rng.float() * 0.8;
          m.alertness = 1;
          if (m.state === 'idle' || m.state === 'patrol') m._setState('alert');
        }
      }
    }

    // rotate the peek tokens so the same man is not always exposed
    this.peekTimer -= dt;
    if (this.peekTimer <= 0) {
      this.peekTimer = 1.1 + this.rng.float() * 1.2;
      this.peekHolders.clear();
    }

    // Periodically pick who relocates vs who holds the angle.
    if (this._roleTimer <= 0) {
      this._roleTimer = 1.6 + this.rng.float() * 1.4;
      this._assignRoles();
    }
  }

  _assignRoles() {
    const fighters = [];
    for (const m of this.members) {
      if (!m.alive) continue;
      if (m.state === 'combat' || m.state === 'suppressed' || m.state === 'flank') fighters.push(m);
    }
    if (fighters.length < 2) {
      this.mover = null;
      return;
    }
    // Prefer the most suppressed / most exposed agent as the mover.
    fighters.sort((a, b) => (b.suppression ?? 0) - (a.suppression ?? 0) || a.stateTime - b.stateTime);
    const next = fighters[0];
    if (this.mover && this.mover.alive && fighters.includes(this.mover)) return;
    this.mover = next;
  }

  /** Ask to lean out of cover. Only `peekTokens` members may at once. */
  requestPeek(agent, dt) {
    if (this.peekHolders.has(agent.id)) return true;
    // Movers stay down while relocating — suppressors keep the tokens.
    if (this.mover === agent && agent.state === 'flank') return false;
    if (this.peekHolders.size >= this.peekTokens) return false;
    this.peekHolders.add(agent.id);
    return true;
  }

  releasePeek(agent) {
    this.peekHolders.delete(agent.id);
  }

  /** True when this agent should hold fire / peek while a mate relocates. */
  isSuppressor(agent) {
    if (!this.mover || this.mover === agent) return false;
    return this.mover.alive && (this.mover.state === 'flank' || this.mover.state === 'suppressed');
  }

  /** One relocator at a time, and only if someone else is holding attention. */
  canMoveUnderFire(agent) {
    if (this.mover && this.mover !== agent) return false;
    let holding = 0;
    for (const m of this.members) {
      if (m === agent || !m.alive) continue;
      if (m.peeking || m.wantFire || this.peekHolders.has(m.id)) holding++;
      else if (m.state === 'combat') holding++;
    }
    return holding >= 1;
  }

  claimMover(agent) {
    this.mover = agent;
  }

  /** One flanker at a time, and only if someone else is holding attention. */
  canFlank(agent) {
    if (this.flanker && this.flanker !== agent) return false;
    return this.canMoveUnderFire(agent);
  }

  claimFlank(agent) {
    this.flanker = agent;
    this.mover = agent;
  }

  requestGrenade() {
    if (this.grenadeCooldown > 0) return false;
    this.grenadeCooldown = 14 + this.rng.float() * 12;
    return true;
  }
}
