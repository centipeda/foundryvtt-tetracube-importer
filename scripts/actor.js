import { parsePassiveAbility, parseActiveAbility } from "./parser.js";
import {
    STAT_NAMES,
    CR_TO_PROF_BONUS,
    CR_FRAC_TO_NUMERIC,
    ARMOR_TYPE_TO_ABBR,
    SIZE_TO_ABBR,
    SIZE_TO_HIT_DIE,
    CASTING_STAT_FULL_TO_ABBR,
    ACTION_TABLE_TO_TYPE,
    SKILL_NAME_TO_ABBR
} from "./tables.js"

function _statToMod(stat) {
    return Math.floor((stat - 10) / 2);
}

function _makeRollableText(text) {
    return text.replaceAll(/(\dd\d ?[+-]? ?\d?)/g, (match) => {
    return `
      <a class="inline-roll roll" title="${match}" data-mode="roll" data-flavor="" data-formula="${match}">
        ${match}
      </a>`
  })
}

export function getFeatureData(monsterData, actor) {
    let items = [];

    // Add passive abilities.
    for(const ability of monsterData.abilities) {
        const passive = parsePassiveAbility(ability.name, ability.desc, monsterData);
        items.push({
            name: passive.name,
            type: 'feat',
            data: {
                description: {
                    value: passive.description
                },
                equipped: true
            }
        });
    }

    // Collect all active abilities.
    let activeAbilities = [];
    for(const actionType in ACTION_TABLE_TO_TYPE) {
        for(const ability of monsterData[actionType]) {
            // Parse ability description.
            activeAbilities.push(
                parseActiveAbility(
                    ability.name,
                    ACTION_TABLE_TO_TYPE[actionType],
                    ability.desc,
                    monsterData
            ));
        }
    }

    // Load abilities as item data.
    for(const ability of activeAbilities) {
        items.push({
            name: ability.name,
            type: ability.featureType,
            data: {
                activation: {
                    type: ability.type,
                    cost: ability.cost,
                    condition: ''
                },
                damage: {
                    parts: ability.damage
                },
                actionType: ability.actionType,
                proficient: ability.proficient,
                ability: ability.ability,
                attackBonus: ability.attackBonus,
                description: {
                    value: ability.description
                },
                recharge: ability.recharge
            }
        });
    }

    // Add item features to actor.
    for(const item of items) {
        try {
            actor.createEmbeddedDocuments('Item', [item]);
        } catch(e) {
            ui.notifications.error("Failed to import.");
            return false;
        }
    }

    return true;
}

export function getActorData(monsterData) {
    // Parse string data.
    console.log('monsterData', monsterData);

    // Calculate proficiency bonus.
    monsterData.profBonus = CR_TO_PROF_BONUS[monsterData.cr];

    // Calculate ability scores: modifier, atk, DC, save, bonuses.
    for(const stat of STAT_NAMES) {
        const value = parseInt(monsterData[`${stat}Points`]);
        const isProficientInSave = monsterData.sthrows.some((s) => s.name === stat);
        const modifier = _statToMod(value);
        monsterData[stat] = {
            value: value,
            proficient: isProficientInSave,
            prof: isProficientInSave ? monsterData.profBonus : 0,
            mod: modifier,
            save: isProficientInSave ? (modifier + monsterData.profBonus) : modifier,
            dc: 8 + monsterData.profBonus + modifier,
            atk: monsterData.profBonus + modifier
        };
    }

    for(const ability of monsterData.abilities) {
        // Apply spellcasting levels if Spellcasting feature is present.
        if(ability.name === 'Spellcasting') {
            const text = ability.desc;
            const spellcastingLevel = [...(text.match(/([0-9]+)\w{1,2}-level spellcaster/) || [])];
            const spellcastingStat = [...(text.match(/spell ?casting ability is (\w+)/) || [])];
            monsterData.spellcastingLevel = parseInt(spellcastingLevel);
            monsterData.spellcastingStat = CASTING_STAT_FULL_TO_ABBR[spellcastingStat];
        }
        
        // Apply legendary resistances.
        monsterData.legendaryResistances = 0;
        const resists = ability.name.match(/Legendary Resistance \((?<n>\d+)\/day\)/i);
        console.log('resists', resists);
        if(resists !== null) {
            monsterData.legendaryResistances = parseInt(resists.groups.n);
        }
    }

    // Calculate HP: hit dice, size, per-die CON mod.
    const hitDice = parseInt(monsterData.hitDice);
    const [dieName, dieAvg] = SIZE_TO_HIT_DIE[monsterData.size];
    const conMod = monsterData.con.mod;
    // Generate HP expression and average.
    const hpExpr = `${hitDice}${dieName} + ${hitDice * conMod}`
    const hpAvg = Math.floor(dieAvg * hitDice) + hitDice * conMod;

    // Get skill modifiers.
    let monsterSkills = {};
    for(const skill of monsterData.skills) {
        monsterSkills[SKILL_NAME_TO_ABBR[skill.name]] = {
            ability: skill.stat,
            value: (skill?.note === ' (ex)') ? 2 : 1,
            bonuses: {
                check: '',
                passive: ''
            }
        };
    }

    monsterData.legendaryActions = 0;
    if(monsterData.isLegendary) {
        const legends = monsterData.legendariesDescription.match(
            /can take (?<acts>\d+) legendary actions/
        );
        if(legends !== null) {
            monsterData.legendaryActions = parseInt(legends.groups.acts);
        }
    }

    // Parse damage types.
    let resistances = [];
    let immunities = [];
    let vulnerabilities = [];
    for(const damageType of monsterData.damagetypes) {
        if(damageType.type === 'i') {
            immunities.push(damageType.name);
        } else if(damageType.type === 'r') {
            resistances.push(damageType.name);
        } else if(damageType.type === 'v') {
            vulnerabilities.push(damageType.name);
        }
    }

    // Set all other actor data.
    let actorData = {
        abilities: {
            str: monsterData.str,
            dex: monsterData.dex,
            con: monsterData.con,
            int: monsterData.int,
            wis: monsterData.wis,
            cha: monsterData.cha
        },
        attributes: {
            // TODO: fix AC for equipped armor
            ac: {
                calc: (monsterData.armorName in ARMOR_TYPE_TO_ABBR)
                        ? ARMOR_TYPE_TO_ABBR[monsterData.armorName]
                        : "natural",
                flat: 10 + monsterData.dex.mod + monsterData.natArmorBonus
            },
            hp: {
                value: hpAvg,
                max: hpAvg,
                formula: hpExpr
            },
            movement: {
                walk: parseInt(monsterData.speed),
                swim: parseInt(monsterData.swimSpeed),
                fly: parseInt(monsterData.flySpeed),
                burrow: parseInt(monsterData.burrowSpeed),
                hover: monsterData.hover
            },
            senses: {
                darkvision: parseInt(monsterData.darkvision),
                blindsight: parseInt(monsterData.blindsight),
                tremorsense: parseInt(monsterData.tremorsense),
                truesight: parseInt(monsterData.truesight)
            },
            prof: monsterData.profBonus,
            spellcasting: monsterData?.spellcastingStat
        },
        details: {
            cr: (monsterData.cr in CR_FRAC_TO_NUMERIC) ? CR_FRAC_TO_NUMERIC[monsterData.cr] : parseInt(monsterData.cr),
            alignment: monsterData.alignment,
            type: {
                value: monsterData.type.toLowerCase(),
                subtype: monsterData.tag
            },
            spellLevel: monsterData?.spellcastingLevel
        },
        traits: {
            size: SIZE_TO_ABBR[monsterData.size],
            languages: {
                value: monsterData.languages.map((e) => e.name.split(' ', 1)[0].toLowerCase())
            },
            di: { value: immunities }, // Damage immunities.
            dr: { value: resistances }, // Damage resistances.
            dv: { value: vulnerabilities }, // Damage vulnerabilities.
            ci: { value: monsterData.conditions.map(e => e.name) } // Condition immunities.
        },
        skills: monsterSkills,
        resources: {
            legres: {
                value: monsterData.legendaryResistances,
                max: monsterData.legendaryResistances,
            },
            legact: {
                value: monsterData.legendaryActions,
                max: monsterData.legendaryActions,
            }
        },
        spells: {},
    };
    console.log(actorData);
    return actorData;
}
