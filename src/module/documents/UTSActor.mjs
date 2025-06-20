/**
 * A simple extension that adds a hook at the end of data prep
 */
export default class UTSActor extends foundry.documents.Actor {

prepareData() {
  super.prepareData();
  const data = this.system;

  // Ensure safe defaults
  data.attributes ??= {};
  data.traits ??= {};
  data.inventory ??= [];
  data.spells ??= [];
  data.armorSlots ??= [];

  // Core Daggerheart attributes
  data.attributes.hp = data.attributes.hp ?? { value: 10, max: 10 };
  data.attributes.hope = data.attributes.hope ?? { value: 3, max: 3 };
  data.stress = data.stress ?? 0;
  data.scars = data.scars ?? [];

  // Combat & defense
  data.proficiency = data.proficiency ?? 1;
  data.evasion = data.evasion ?? 10;

  // Armor slot structure
  if (!Array.isArray(data.armorSlots)) {
    data.armorSlots = [
      { slot: "Head", damaged: false },
      { slot: "Torso", damaged: false },
      { slot: "Legs", damaged: false },
      { slot: "Arms", damaged: false }
    ];
  }

  // Classification
  data.species = data.species ?? "";
  data.heritage = data.heritage ?? "";
  data.background = data.background ?? "";
  data.class = data.class ?? "";
  data.subclass = data.subclass ?? "";

  // Traits example
  data.traits.agility = data.traits.agility ?? 0;
  data.traits.intuition = data.traits.intuition ?? 0;
  data.traits.presence = data.traits.presence ?? 0;
  data.traits.might = data.traits.might ?? 0;
  data.traits.knowledge = data.traits.knowledge ?? 0;
  data.traits.will = data.traits.will ?? 0;
},
  
  Hooks.callAll("UTS.prepareActorData", this);
}
