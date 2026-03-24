import Phaser from 'phaser';
import type { Facing, StructureType } from './constants';
import {
    MOVE_SPEED,
    tileKey,
    worldToTile,
} from './constants';
import { getGroundAt, getResourceAt } from './terrain';
import { getResourceDefinition, isStructureBlocking } from '../content/capabilities';

export class InputManager {
    private movementClock = 0;
    private lastTapAt: Partial<Record<Facing, number>> = {};
    private previousPressed: Partial<Record<Facing, boolean>> = {};
    private sprintFacing: Facing | null = null;
    private sprintUntil = 0;
    cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    wasd!: { w: Phaser.Input.Keyboard.Key; a: Phaser.Input.Keyboard.Key; s: Phaser.Input.Keyboard.Key; d: Phaser.Input.Keyboard.Key };
    interactKey!: Phaser.Input.Keyboard.Key;
    eatKey!: Phaser.Input.Keyboard.Key;
    eatRationKey!: Phaser.Input.Keyboard.Key;
    buildKey1!: Phaser.Input.Keyboard.Key;
    buildKey2!: Phaser.Input.Keyboard.Key;
    buildKey3!: Phaser.Input.Keyboard.Key;
    stashKey!: Phaser.Input.Keyboard.Key;
    withdrawKey!: Phaser.Input.Keyboard.Key;
    shiftKey!: Phaser.Input.Keyboard.Key;
    dropKey!: Phaser.Input.Keyboard.Key;
    clearSaveKey!: Phaser.Input.Keyboard.Key;
    zoomInKey!: Phaser.Input.Keyboard.Key;
    zoomOutKey!: Phaser.Input.Keyboard.Key;
    zoomResetKey!: Phaser.Input.Keyboard.Key;
    zoomInNumpadKey!: Phaser.Input.Keyboard.Key;
    zoomOutNumpadKey!: Phaser.Input.Keyboard.Key;

    init(scene: Phaser.Scene): void {
        const kb = scene.input.keyboard!;
        this.cursors = kb.createCursorKeys();
        const wasdKeys = kb.addKeys('W,A,S,D') as Record<string, Phaser.Input.Keyboard.Key>;
        this.wasd = { w: wasdKeys.W, a: wasdKeys.A, s: wasdKeys.S, d: wasdKeys.D };

        const K = Phaser.Input.Keyboard.KeyCodes;
        this.interactKey = kb.addKey(K.E);
        this.eatKey = kb.addKey(K.F);
        this.eatRationKey = kb.addKey(K.R);
        this.buildKey1 = kb.addKey(K.ONE);
        this.buildKey2 = kb.addKey(K.TWO);
        this.buildKey3 = kb.addKey(K.THREE);
        this.stashKey = kb.addKey(K.Q);
        this.withdrawKey = kb.addKey(K.T);
        this.shiftKey = kb.addKey(K.SHIFT);
        this.dropKey = kb.addKey(K.G);
        this.clearSaveKey = kb.addKey(K.BACKSPACE);
        this.zoomInKey = kb.addKey(K.PLUS);
        this.zoomOutKey = kb.addKey(K.MINUS);
        this.zoomResetKey = kb.addKey(K.ZERO);
        this.zoomInNumpadKey = kb.addKey(K.NUMPAD_ADD);
        this.zoomOutNumpadKey = kb.addKey(K.NUMPAD_SUBTRACT);
    }

    handleMovement(
        delta: number,
        player: Phaser.GameObjects.Sprite,
        worldTime: number,
        resourceRespawnAt: Map<string, number>,
        plantedTrees: Map<string, number>,
        stoneHealth: Map<string, number>,
        structures: Map<string, StructureType>,
    ): { facing: Facing; moving: boolean; sprinting: boolean } {
        this.movementClock += delta;
        let dx = 0;
        let dy = 0;

        const leftDown = this.cursors.left.isDown || this.wasd.a.isDown;
        const rightDown = this.cursors.right.isDown || this.wasd.d.isDown;
        const upDown = this.cursors.up.isDown || this.wasd.w.isDown;
        const downDown = this.cursors.down.isDown || this.wasd.s.isDown;

        if (leftDown) dx -= 1;
        if (rightDown) dx += 1;
        if (upDown) dy -= 1;
        if (downDown) dy += 1;

        this.trackTap('left', leftDown);
        this.trackTap('right', rightDown);
        this.trackTap('up', upDown);
        this.trackTap('down', downDown);

        if (dx === 0 && dy === 0) {
            return { facing: 'down', moving: false, sprinting: false };
        }

        const length = Math.hypot(dx, dy);
        const speed = MOVE_SPEED * delta;
        const vx = (dx / length) * speed;
        const vy = (dy / length) * speed;

        const facing: Facing = Math.abs(dx) >= Math.abs(dy)
            ? (dx < 0 ? 'left' : 'right')
            : (dy < 0 ? 'up' : 'down');

        const sprinting = this.sprintFacing === facing && this.movementClock <= this.sprintUntil;
        const speedMultiplier = sprinting ? 1.75 : 1;
        const sprintVx = vx * speedMultiplier;
        const sprintVy = vy * speedMultiplier;

        const movedX = player.x + sprintVx;
        if (isWalkableAt(movedX, player.y, worldTime, resourceRespawnAt, plantedTrees, stoneHealth, structures)) {
            player.x = movedX;
        }

        const movedY = player.y + sprintVy;
        if (isWalkableAt(player.x, movedY, worldTime, resourceRespawnAt, plantedTrees, stoneHealth, structures)) {
            player.y = movedY;
        }

        return { facing, moving: true, sprinting };
    }

    private trackTap(facing: Facing, isDown: boolean): void {
        const wasDown = this.previousPressed[facing] ?? false;
        if (isDown && !wasDown) {
            const lastTap = this.lastTapAt[facing] ?? Number.NEGATIVE_INFINITY;
            if (this.movementClock - lastTap <= 0.28) {
                this.sprintFacing = facing;
                this.sprintUntil = this.movementClock + 0.9;
            }
            this.lastTapAt[facing] = this.movementClock;
        }
        this.previousPressed[facing] = isDown;
    }
}

function isWalkableAt(
    x: number, y: number,
    worldTime: number,
    resourceRespawnAt: Map<string, number>,
    plantedTrees: Map<string, number>,
    stoneHealth: Map<string, number>,
    structures: Map<string, StructureType>,
): boolean {
    const tx = worldToTile(x);
    const ty = worldToTile(y);
    const key = tileKey(tx, ty);

    if (getGroundAt(tx, ty) === 'water') return false;

    const resource = getResourceAt(tx, ty, worldTime, resourceRespawnAt, structures, plantedTrees, stoneHealth);
    if (resource && getResourceDefinition(resource)?.blocksMovement) return false;

    const structure = structures.get(key);
    if (structure && isStructureBlocking(structure)) return false;

    return true;
}
