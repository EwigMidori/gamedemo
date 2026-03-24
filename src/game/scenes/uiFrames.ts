import { gameContentRegistry } from '../content';
import type { ItemId } from './constants';

export const UI_FRAME = {
    heartFull: 0,
    heartHalf: 1,
    heartEmpty: 2,
    shieldFull: 3,
    shieldHalf: 4,
    shieldEmpty: 5,
    food: 6,
    ration: 7,
    wood: 8,
    stone: 9,
    plank: 10,
    brick: 11,
    sapling: 12,
    chest: 13,
} as const;

export function uiFrameForItem(itemId: ItemId): number {
    const registered = gameContentRegistry.items.get(itemId);
    if (registered?.iconFrame !== undefined && registered.iconFrame !== null) {
        return registered.iconFrame;
    }

    switch (itemId) {
        case 'food':
            return UI_FRAME.food;
        case 'ration':
            return UI_FRAME.ration;
        case 'wood':
            return UI_FRAME.wood;
        case 'stone':
            return UI_FRAME.stone;
        case 'plank':
            return UI_FRAME.plank;
        case 'brick':
            return UI_FRAME.brick;
        case 'sapling':
            return UI_FRAME.sapling;
        case 'chest':
            return UI_FRAME.chest;
    }

    return UI_FRAME.stone;
}
