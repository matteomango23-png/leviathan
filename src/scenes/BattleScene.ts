// Battle: a turn-based fight 1 against 1, like Pokémon (systems/battle). This scene runs the turns: it asks
// the interface for your action, plays the steps with the battle view, and runs the dodge ring when the wild
// beast attacks. For now it starts on its own with the test team (link with ?battaglia).
import Phaser from 'phaser';
import { BATTLE, BATTLE_PROTOTYPE } from '../data/battle';
import { BATTLE_TEXT, type Named } from '../data/battleText';
import { ITEMS } from '../data/world';
import {
  chooseFoeMove,
  createBattle,
  endRound,
  firstSide,
  foeCanBeDodged,
  nextStanding,
  switchTo,
  tryFlee,
  tryTame,
  useMove,
  you,
  type Action,
  type BattleState,
  type Dodge,
  type Side,
  type Step,
} from '../systems/battle/battle';
import { judgeDodge, makeDodgeRing } from '../systems/battle/dodge';
import { makeFighter, named } from '../systems/battle/fighter';
import type { BeastForm } from '../systems/beasts/forms';
import { xpReward } from '../systems/beasts/growth';
import { makeRng, type Rng } from '../systems/math';
import { battleOutcome, battleSetup, finishBattle, type BattleSetup } from '../systems/battleResult';
import { BattleUi } from '../ui/battleUi';
import type { Session } from './session';
import { BattleView, battleArt } from '../views/battleView';

export class BattleScene extends Phaser.Scene {
  private ui!: BattleUi;
  private view!: BattleView;
  private s!: BattleState;
  private rng: Rng = makeRng(Date.now());
  private items: Record<string, number> = {};
  private tameBonus = 1;
  /** In the game (not the ?battaglia prototype): the session and what the battle is about. */
  private session: Session | null = null;
  private setupInGame: BattleSetup | null = null;

  constructor() {
    super('Battle');
  }

  init(data?: { session?: Session }): void {
    this.session = data?.session ?? null;
  }

  create(): void {
    this.view = new BattleView(this);
    this.ui = new BattleUi(document.body);
    this.events.once('shutdown', () => this.ui.destroy());
    void this.run();
  }

  private setup(): void {
    const g = this.session?.game;
    this.setupInGame = g ? battleSetup(g) : null;
    this.tameBonus = 1;
    if (g && this.setupInGame) {
      this.s = this.setupInGame.state;
      this.items = g.gear.inventory; // the real backpack: what you use is gone
      return;
    }
    // the prototype (?battaglia): the test team against a random wild beast of the bay or the delta
    const P = BATTLE_PROTOTYPE;
    const team = P.team.map((t) => makeFighter({ speciesId: t.speciesId, variant: 'comune' }, t.level));
    const pick = P.foes[Math.floor(this.rng() * P.foes.length)]!;
    const [a, b] = pick.level;
    const roll = this.rng();
    const variant = roll < P.variantChance / 2 ? 'albino' : roll < P.variantChance ? 'alfa' : 'comune';
    const form: BeastForm = { speciesId: pick.speciesId, variant };
    this.s = createBattle(team, makeFighter(form, a + Math.floor(this.rng() * (b - a + 1))));
    this.items = { ...P.items };
  }

  private name(side: Side): Named {
    return named(side === 'you' ? you(this.s) : this.s.foe);
  }

  private async run(): Promise<void> {
    this.setup();
    await this.loadArt();
    const s = this.s;
    this.view.setFighter('foe', s.foe.form);
    this.ui.show(s);
    await this.ui.say(BATTLE_TEXT.appears(this.name('foe')));
    await this.view.swimIn('you', you(s).form);
    await this.ui.say(BATTLE_TEXT.go(this.name('you')), 0.9);
    if (this.setupInGame?.first === 'foe') {
      await this.ui.say(BATTLE_TEXT.ambushed(this.name('foe')), 1.2);
      await this.foeTurn(); // it touched you: a free attack
    } else if (this.setupInGame?.first === 'you') {
      s.foe.stunned = true; // you hit it from behind: it loses its first turn
      await this.ui.say(BATTLE_TEXT.surprise(this.name('foe')), 1.2);
    }
    while (!s.over) await this.round(await this.ui.chooseAction(s, this.items));
    this.finish();
  }

  private async round(action: Action): Promise<void> {
    const s = this.s;
    s.foeMove = chooseFoeMove(s, this.rng);
    const order: Side[] = firstSide(s, action, this.rng) === 'you' ? ['you', 'foe'] : ['foe', 'you'];
    for (const side of order) {
      if (s.over || s.foe.hp <= 0) break;
      if (side === 'you') await this.yourTurn(action);
      else await this.foeTurn();
    }
    endRound(s);
    if (!s.over && you(s).hp <= 0) {
      if (nextStanding(s) < 0) s.over = 'lost';
      else {
        const i = await this.ui.chooseNext(s);
        switchTo(s, i);
        this.ui.show(s);
        await this.view.swimIn('you', you(s).form);
        await this.ui.say(BATTLE_TEXT.go(this.name('you')), 0.9);
      }
    }
  }

  private async yourTurn(action: Action): Promise<void> {
    const s = this.s;
    if (action.kind === 'move') await this.play(useMove(s, 'you', action.index, this.rng));
    else if (action.kind === 'switch') {
      const from = this.name('you');
      await this.view.swimOut('you');
      switchTo(s, action.index);
      this.ui.show(s);
      await this.view.swimIn('you', you(s).form);
      await this.ui.say(BATTLE_TEXT.switched(from, this.name('you')));
    } else if (action.kind === 'item') await this.useItem(action.id);
    else if (action.kind === 'tame') {
      await this.ui.say(BATTLE_TEXT.tameThrow(this.name('foe')), 0.9);
      const step = tryTame(s, this.rng, Math.max(...s.team.map((f) => f.level)), this.tameBonus);
      this.tameBonus = 1;
      if (step.kind !== 'tame') return;
      await this.view.tame(step.shakes, step.caught);
      if (step.caught) await this.ui.say(BATTLE_TEXT.tamed(this.name('foe')), 2);
      else await this.ui.say(BATTLE_TEXT.tameBroke[Math.min(step.shakes, 2)]!);
    } else if (action.kind === 'flee') {
      if (this.setupInGame?.noFlee) {
        await this.ui.say(BATTLE_TEXT.noFlee);
        return;
      }
      const ok = tryFlee(s, this.rng);
      await this.ui.say(ok ? BATTLE_TEXT.fleeOk : BATTLE_TEXT.fleeFail);
    }
  }

  private async useItem(id: string): Promise<void> {
    const fx = BATTLE.items[id];
    const name = ITEMS.find((i) => i.id === id)?.name ?? id;
    this.items[id] = Math.max(0, (this.items[id] ?? 0) - 1);
    await this.ui.say(BATTLE_TEXT.item(name, this.name('you')), 0.9);
    const me = you(this.s);
    if (fx?.healShare) {
      const n = Math.min(me.maxHp - me.hp, Math.round(me.maxHp * fx.healShare));
      me.hp += n;
      this.ui.setHp(this.s);
      await this.ui.say(BATTLE_TEXT.healed(this.name('you'), n));
    }
    if (fx?.tameMult) this.tameBonus = fx.tameMult;
  }

  private async foeTurn(): Promise<void> {
    const s = this.s;
    if (s.foe.stunned || !foeCanBeDodged(s)) {
      await this.play(useMove(s, 'foe', s.foeMove, this.rng));
      return;
    }
    const move = s.foe.moves[s.foeMove]!.move.name;
    await this.ui.say(BATTLE_TEXT.foeUses(this.name('foe'), move), 0.7);
    const dodge = await this.runDodge();
    await this.play(useMove(s, 'foe', s.foeMove, this.rng, dodge), true);
  }

  /** The SCHIVA bar; resolves with how well you tapped. */
  private async runDodge(): Promise<Dodge> {
    const r = makeDodgeRing(this.rng);
    return judgeDodge(r, await this.ui.dodge.run(r));
  }

  /** The pictures of the beasts that may appear (your team and the wild one), loaded before the battle. */
  private loadArt(): Promise<void> {
    const s = this.s;
    const wanted = [battleArt(s.foe.form, 'foe'), ...s.team.map((f) => battleArt(f.form, 'you'))];
    for (const a of wanted)
      if (a.url && !this.textures.exists(a.textureKey)) this.load.image(a.textureKey, a.url);
    if (!this.load.list.size) return Promise.resolve();
    return new Promise((done) => {
      this.load.once('complete', () => done());
      this.load.start();
    });
  }

  /** Shows the steps of a turn. `announced`: the wild beast's move name was already said. */
  private async play(steps: Step[], announced = false): Promise<void> {
    for (const st of steps) {
      if (st.kind === 'text') await this.ui.say(st.text);
      else if (st.kind === 'attack') {
        if (!(announced && st.side === 'foe'))
          await this.ui.say(
            st.side === 'you'
              ? BATTLE_TEXT.uses(this.name('you'), st.move)
              : BATTLE_TEXT.foeUses(this.name('foe'), st.move),
            0.7,
          );
        const target: Side = st.side === 'you' ? 'foe' : 'you';
        await this.view.lunge(st.side);
        if (st.dodge === 'perfect') await this.view.dodgeAside();
        for (const dmg of st.hits) {
          await this.view.hit(target, dmg, st.crit, st.type);
          this.ui.setHp(this.s);
        }
        if (st.dodge === 'perfect') await this.ui.say(BATTLE_TEXT.dodged, 0.9);
        else if (st.dodge === 'graze') await this.ui.say(BATTLE_TEXT.grazed, 0.9);
        if (st.hits.length > 1) await this.ui.say(BATTLE_TEXT.hits(st.hits.length), 0.9);
        if (st.crit) await this.ui.say(BATTLE_TEXT.crit, 0.9);
        if (st.effect === 'super') await this.ui.say(BATTLE_TEXT.super, 1);
        else if (st.effect === 'weak') await this.ui.say(BATTLE_TEXT.weak, 1);
      } else if (st.kind === 'heal') {
        this.ui.setHp(this.s);
        await this.ui.say(BATTLE_TEXT.healed(this.name(st.side), st.amount));
      } else if (st.kind === 'faint') {
        await this.view.faint(st.side);
        await this.ui.say(
          st.side === 'foe'
            ? BATTLE_TEXT.foeFainted(this.name('foe'))
            : BATTLE_TEXT.fainted(this.name('you')),
          1.6,
        );
      }
    }
  }

  private finish(): void {
    const s = this.s;
    const lines: string[] = [];
    let title: string = BATTLE_TEXT.won;
    if (s.over === 'won' || s.over === 'caught')
      lines.push(BATTLE_TEXT.xp(this.name('you'), xpReward(s.foe.form, s.foe.level)));
    if (s.over === 'caught') title = BATTLE_TEXT.tamed(this.name('foe'));
    if (s.over === 'lost') title = BATTLE_TEXT.lost;
    if (s.over === 'fled') title = BATTLE_TEXT.fleeOk;
    const g = this.session?.game;
    if (!g || !this.setupInGame) {
      this.ui.result(title, lines, BATTLE_TEXT.again, () => this.scene.restart());
      return;
    }
    // back to the sea: the results go into the game with its next step
    g.story.pending.push(...finishBattle(g, battleOutcome(s, this.setupInGame.wildId)));
    this.ui.result(title, lines, BATTLE_TEXT.back, () => this.backToSea());
  }

  private backToSea(): void {
    const session = this.session!;
    session.inBattle = false;
    this.scene.stop();
    this.scene.resume('World');
    session.emit('battle', false);
  }

  override update(_time: number, delta: number): void {
    const dt = Math.min(0.05, delta / 1000);
    this.view.update(dt, this.time.now / 1000);
  }
}
