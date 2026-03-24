import { gameContentRegistry } from '../../content';
import type { Inventory } from '../constants';
import { getItemCount } from '../inventory';

export function getInventorySummaryLines(
    inventory: Inventory,
    groups: string[],
    compact: boolean,
    prefix: string,
): string[] {
    const lines: string[] = [];

    for (const group of groups) {
        const items = [...gameContentRegistry.items.values()]
            .filter((item) => item.uiGroup === group)
            .sort((a, b) => (a.uiPriority ?? 999) - (b.uiPriority ?? 999) || a.name.localeCompare(b.name));
        if (items.length === 0) continue;

        const parts = items.map((item) => {
            const label = compact ? item.name.toUpperCase() : item.name.toLowerCase();
            return `${label} ${getItemCount(inventory, item.id)}`;
        });

        if (compact) {
            lines.push(parts.join('  '));
        } else {
            lines.push(`${prefix}  ${parts.join('   ')}`);
        }
    }

    return lines;
}
