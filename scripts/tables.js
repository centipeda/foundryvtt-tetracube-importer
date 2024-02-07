// Data/lookup tables.

export const STAT_NAMES = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

export const CR_TO_PROF_BONUS = {
    '0':   2, '1/8': 2, '1/4': 2, '1/2': 2,
    '1':   2, '2':   2, '3':   2, '4':   2,
    '5':   3, '6':   3, '7':   3, '8':   3,
    '9':   4, '10':  4, '11':  4, '12':  4,
    '13':  5, '14':  5, '15':  5, '16':  5,
    '17':  6, '18':  6, '19':  6, '20':  6,
    '21':  7, '22':  7, '23':  7, '24':  7,
    '25':  8, '26':  8, '27':  8, '28':  8,
    '29':  9, '30':  9
};
export const CR_FRAC_TO_NUMERIC = { '1/8': 0.125, '1/4': 0.25, '1/2': 0.5 };

export const ARMOR_TYPE_TO_ABBR = {
    'mage armor': 'mage'
};

export const SIZE_TO_ABBR = {
    'tiny': 'tiny',
    'small': 'small',
    'medium': 'med',
    'large': 'lg',
    'huge': 'huge',
    'gargantuan': 'grg'
};

export const SIZE_TO_HIT_DIE = {
    'tiny':       ['d4', 2.5],
    'small':      ['d6', 3.5],
    'medium':     ['d8', 4.5],
    'large':      ['d10', 5.5],
    'huge':       ['d12', 6.5],
    'gargantuan': ['d20', 10.5]
}

export const CASTING_STAT_FULL_TO_ABBR = {
    'Strength': 'str',
    'Dexterity': 'dex',
    'Constitution': 'con',
    'Intelligence': 'int',
    'Wisdom': 'wis',
    'Charisma': 'cha'
};

export const ACTION_TABLE_TO_TYPE = {
    'actions': 'action',
    'reactions': 'reaction',
    'bonusActions': 'bonus',
    'legendaries': 'legendary'
};

export const SKILL_NAME_TO_ABBR = {
    'acrobatics': 'acr',
    'animal Handling': 'ani',
    'arcana': 'arc',
    'athletics': 'ath',
    'deception': 'dec',
    'history': 'his',
    'insight': 'ins',
    'intimidation': 'itm',
    'investigation': 'inv',
    'medicine': 'med',
    'nature': 'nat',
    'perception': 'prc',
    'performance': 'prf',
    'persuasion': 'per',
    'religion': 'rel',
    'sleight of Hand': 'slt',
    'stealth': 'ste',
    'survival': 'sur'
};
