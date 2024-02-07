// Parse ability data, shorthands, set attack values accordingly.

import { STAT_NAMES } from "./tables.js";

function _extractDamageRolls(description) {

    // Two damage types.
    let twodmg = description.match(
        /\d+ \((?<dice1>\d+d\d+( \+ \d+)?)\) (?<type1>\w+) damage plus \d+ \((?<dice2>\d+d\d+( \+ \d+)?)\) (?<type2>\w+) damage/
    );
    if(twodmg !== null) {
        return [
            [twodmg.groups.dice1, twodmg.groups.type1],
            [twodmg.groups.dice2, twodmg.groups.type2]
        ];
    }

    // Single damage type.
    let dmg = description.match(/\d+ \((?<dice>\d+d\d+( \+ \d+)?)\) (?<type>\w+) damage/);
    if(dmg !== null) {
        return [
            [dmg.groups.dice, dmg.groups.type]
        ];
    }

    // Untyped damage.
    let notypedmg = description.match(/\d+ \((?<dice>\d+d\d+( \+ \d+)?)\) damage/)
    if(dmg !== null) {
        return [dmg.groups.dice, '']
    }
}

function _expandAttackShorthand(expression, monsterData) {
    const props = expression.match(/\[(?<stat>\w+) ATK(?<bonus>[-\+]\d+)?\]/);
    let bonus = 0;
    if(typeof props.groups.bonus !== 'undefined') {
        bonus = parseInt(props.groups.bonus);
    }
    bonus += monsterData[props.groups.stat.toLowerCase()].atk;
    if(bonus >= 0) {
        return `+${bonus}`;
    }
    return `${bonus}`;
}

function _expandSaveShorthand(expression, monsterData) {
    const props = expression.match(/\[(?<stat>\w+) SAVE(?<bonus>[-\+]\d+)?\]/);
    let dc = monsterData[props.groups.stat.toLowerCase()].dc;
    if(typeof props.groups.bonus !== 'undefined') {
        dc += parseInt(props.groups.bonus);
    }
    return `${dc}`;
}

function _expandDamageShorthand(expression, monsterData) {
    const props = expression.match(/\[((?<stat>\w+) )?(?<num>\d+)D(?<size>\d+)(\+(?<flat>\d+))?\]/);

    let flatBonus = 0;
    if(typeof props.groups.stat !== 'undefined') {
        flatBonus += monsterData[props.groups.stat.toLowerCase()].mod;
    }
    if(typeof props.groups.flat !== 'undefined') {
        flatBonus += parseInt(props.groups.flat);
    }
    let flatExpr = '';
    if(flatBonus > 0) {
        flatExpr = ` + ${flatBonus}`;
    }

    let num = parseInt(props.groups.num);
    let size = parseInt(props.groups.size);
    let avg = Math.ceil((size / 2.0 + 0.5) * num) + flatBonus;

    return `${avg} (${num}d${size}${flatExpr})`;
}

// Expand [MON] shorthand.
function expandMonShorthand(description, monsterData) {
    const monsterName = (monsterData.shortName.length > 0) ? monsterData.shortName : monsterData.name;
    return description.replaceAll("[MON]", monsterName);
}

function expandShorthand(description, monsterData) {

    // Replace [MON].
    let desc = expandMonShorthand(description, monsterData);

    // Replace [ABI].
    for(const stat of STAT_NAMES) {
        const mod = monsterData[stat].mod;
        desc = desc.replaceAll(
            `[${stat.toUpperCase()}]`,
            (mod > 0) ? `+${mod}` : `${mod}`
        );
    }

    // Expand attack modifiers ([ABI ATK]).
    const attacks = desc.match(/\[(STR|DEX|CON|INT|WIS|CHA) ATK([\+-]\d+)?\]/g);
    if(attacks !== null) {
        for(const attack of attacks) {
            const expanded = _expandAttackShorthand(attack, monsterData);
            desc = desc.replaceAll(attack, expanded);
        }
    }

    // Expand damage calcs ([ABI NDS]).
    const damages = desc.match(/\[((STR|DEX|CON|INT|WIS|CHA) )?\d+D\d+(\+\d+)?\]/g);
    if(damages !== null) {
        for(const damage of damages) {
            const expanded = _expandDamageShorthand(damage, monsterData);
            desc = desc.replaceAll(damage, expanded);
        }
    }

    // Expand save DCs ([ABI SAVE]).
    const saves = desc.match(/\[(STR|DEX|CON|INT|WIS|CHA) SAVE([\+-]\d+)?\]/g);
    if(saves !== null) {
        for(const save of saves) {
            const expanded = _expandSaveShorthand(save, monsterData);
            desc = desc.replaceAll(save, expanded);
        }
    }

    // Convert italics.
    desc = desc.replace(/_([^_]*)_/g, '<i>$1</i>');
    return desc;
}

export function parsePassiveAbility(name, description, monsterData) {

    let desc = expandShorthand(description, monsterData);

    // Do additional formatting in case of spellcasting feature.
    if(name === 'Spellcasting' || name === 'Innate Spellcasting') {
        desc = desc.replaceAll('>', '<br>');
    }

    return {
        name: name,
        description: desc
    };
}

export function parseActiveAbility(name, type, description, monsterData) {
    let data = {
        featureType: 'feat',
        name: name,
        type: type,
        cost: 1,
        actionType: null,
        recharge: {
            charged: false,
            value: null
        }
    };

    const recharge = name.match(/ \(Recharge (?<start>\d+)-(?<end>\d+)\)/);
    if(recharge !== null) {
        data.recharge = {
            charged: true,
            value: parseInt(recharge.groups.start)
        };
        data.name = name.slice(0, recharge.index);
    }

    if(type === 'legendary') {
        const acts = name.match(/ \(Costs (?<cost>\d+) Actions\)/i);
        if(acts !== null) {
            data.cost = parseInt(acts.groups.cost);
            data.name = name.slice(0, acts.index);
        }
    }

    let desc = expandShorthand(description, monsterData);

    let isAttack = false;
    if(desc.includes('Melee Weapon Attack')) {
        isAttack = true;
        data.actionType = 'mwak';
    } else if(desc.includes('Ranged Weapon Attack')) {
        isAttack = true;
        data.actionType = 'rwak';
    } else if(desc.includes('Ranged Spell Attack')) {
        isAttack = true;
        data.actionType = 'rsak';
    } else if(desc.includes('Melee Spell Attack')) {
        isAttack = true;
        data.actionType = 'msak';
    }

    if(isAttack) {
        // Set weapon attack. Assume proficiency.
        data.featureType = 'weapon';
        data.ability = 'none';
        data.attackBonus = `${parseInt(desc.match(/\+(\d+) to hit/)[1]) - monsterData.profBonus}`;
    }

    data.damage = _extractDamageRolls(desc);

    data.description = desc;
    return data;
}