import UTS from "./src/module/config.mjs";
import UTSSocketHandler from "./src/module/helpers/sockets.mjs";
import * as apps from "./src/module/apps/_module.mjs";
import * as documents from "./src/module/documents/_module.mjs";
import * as dataModels from "./src/module/data/_module.mjs";
import {localizeHelper} from "./src/module/helpers/utils.mjs";

import { DaggerheartActor } from "./actor/daggerheart-actor.js";
import { DaggerheartItem } from "./item/daggerheart-item.js";

import { DaggerheartCharacterSheet } from "./actor/character-sheet.js";
import { DaggerheartAdversarySheet } from "./actor/adversary-sheet.js";

import { registerDiceHelpers } from "./helpers/dice.js";
import { registerRestHandlers } from "./helpers/rest.js";
import { registerEvasion } from "./helpers/evasion.js";

Hooks.once("init", () => {
  CONFIG.UTS = UTS;
  game.system.socketHandler = new UTSSocketHandler();

  console.log("Daggerheart | Initializing system...");

  CONFIG.Actor.documentClass = DaggerheartActor;
  CONFIG.Item.documentClass = DaggerheartItem;

  Actors.unregisterSheet("core", ActorSheet);
  Items.unregisterSheet("core", ItemSheet);

  Actors.registerSheet("daggerheart", DaggerheartCharacterSheet, { types: ["character"], makeDefault: true });
  Actors.registerSheet("daggerheart", DaggerheartAdversarySheet, { types: ["adversary"], makeDefault: true });

  registerDiceHelpers();
  registerRestHandlers();
  registerEvasion();
  
  // Assign document classes
  for (const docCls of Object.values(documents)) {
    CONFIG[docCls.documentName].documentClass = docCls;
  }

  // Assign data models
  for (const [doc, models] of Object.entries(dataModels)) {
    for (const modelCls of Object.values(models)) {
      CONFIG[doc].dataModels[modelCls.metadata.type] = modelCls;
    }
  }

  // Document Sheets
  foundry.documents.collections.Actors.registerSheet("uts", apps.Actor.UTSActorSheet, {
    makeDefault: true, label: "UTS.Sheets.Labels.ActorSheet"
  });
  foundry.documents.collections.Items.registerSheet("uts", apps.Item.UTSItemSheet, {
    makeDefault: true, label: "UTS.Sheets.Labels.ActorSheet"
  });

  // Sidebar tabs
  CONFIG.ui.combat = apps.Combat.UTSCombatTracker;
});

Hooks.once("i18nInit", () => {
  // Localizing the system's CONFIG object
  localizeHelper(CONFIG.UTS);
});

Hooks.on("renderCombatantConfig", apps.Combatant.hooks.renderCombatantConfig);

// === DAGGERHEART SYSTEM EXTENSIONS ===

/* -------------------------------------------- */
/*  Fear Tracker Setting (GM-visible counter)   */
/* -------------------------------------------- */
game.settings.register("daggerheart", "fear", {
  name: "GM Fear Tracker",
  hint: "Tracks current level of fear in the world.",
  scope: "world",
  config: true,
  type: Number,
  default: 0
});

/* -------------------------------------------- */
/*  Duality Dice Roll Helper Function           */
/* -------------------------------------------- */
game.daggerheart = {
  async rollDuality(actor, traitValue = 0) {
    const d12a = await new Roll("1d12").roll({ async: true });
    const d12b = await new Roll("1d12").roll({ async: true });
    const hopeWins = d12a.total >= d12b.total;
    const tie = d12a.total === d12b.total;

    let message = `<strong>Duality Roll:</strong> ${d12a.total} vs ${d12b.total}<br>`;
    let outcome = "";
    
    if (tie) {
      outcome = "✨ A Perfect Balance (Critical Success) ✨";
    } else if (hopeWins) {
      const newHope = Math.min(actor.system.attributes.hope.value + 1, actor.system.attributes.hope.max);
      await actor.update({ "system.attributes.hope.value": newHope });
      outcome = "Hope rises! Hope +1";
    } else {
      const currentFear = game.settings.get("daggerheart", "fear");
      game.settings.set("daggerheart", "fear", currentFear + 1);
      outcome = "Fear grows! GM Fear +1";
    }

    const total = Math.max(d12a.total, d12b.total) + traitValue;
    message += `<em>${outcome}</em><br><strong>Total:</strong> ${total}`;

    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: message
    });

    return total;
  }
};

/* -------------------------------------------- */
/*  Rest Functions                              */
/* -------------------------------------------- */
game.daggerheart.shortRest = async function(actor) {
  const system = actor.system;
  await actor.update({
    "system.stress": Math.max(system.stress - 1, 0),
    "system.attributes.hope.value": Math.min(system.attributes.hope.value + 1, system.attributes.hope.max)
  });
};

game.daggerheart.longRest = async function(actor) {
  const system = actor.system;
  const updates = {
    "system.stress": 0,
    "system.attributes.hope.value": system.attributes.hope.max,
    "system.attributes.hp.value": system.attributes.hp.max
  };

  // Repair all armor slots if they exist
  for (const item of actor.items) {
    if (item.type === "armor" && item.system.damaged) {
      await item.update({ "system.damaged": false });
    }
  }

  await actor.update(updates);
};

/* -------------------------------------------- */
/*  Evasion Auto-Calculation                    */
/* -------------------------------------------- */
Hooks.on("updateActor", async (actor) => {
  if (actor.type !== "character") return;

  const agility = actor.system.traits.agility || 0;
  const intuition = actor.system.traits.intuition || 0;
  let penalty = 0;

  for (const item of actor.items) {
    if (item.type === "armor" && !item.system.damaged) {
      penalty += item.system.penalty || 0;
    }
  }

  const evasion = agility + intuition - penalty;
  await actor.update({ "system.evasion": evasion });
});

/* -------------------------------------------- */
/*  Template Preloading                         */
/* -------------------------------------------- */
Hooks.once("init", async function () {
  const templatePaths = [
    "systems/bladdercart/templates/actor/character-sheet.hbs",
    "systems/bladdercart/templates/item/weapon-sheet.hbs",
    "systems/bladdercart/templates/item/armor-sheet.hbs",
    "systems/bladdercart/templates/item/spell-sheet.hbs"
    // Add others as needed
  ];
  loadTemplates(templatePaths);
});

