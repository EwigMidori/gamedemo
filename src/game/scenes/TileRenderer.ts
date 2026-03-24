import Phaser from 'phaser';
import type { GroundTile, StructureType } from './constants';
import {
    TILE_SIZE,
    GROUND_FRAME,
    RESOURCE_FRAME,
    tileKey,
    tileToWorldCenter,
    worldToTile,
} from './constants';
import { getGroundAt, getResourceAt } from './terrain';
import { getAutotileFrameForTile, getGrowableFrame, getGrowableTint, getSaplingFrameForTimeRemaining, getStoneFrameForHitsLeft } from './worldFrames';
import { getAutotileDefinition, getGrowableDefinition, getResourceDefinition, getStructureRenderFrame } from '../content/capabilities';

const GROUND_TINT: Record<GroundTile, number> = {
    grass: 0xb8d8a3,
    dirt: 0xc8b08a,
    sand: 0xf0d277,
    water: 0x7fd6ff,
};

const OBJECT_TINT = 0xd7d1b8;

export class TileRenderer {
    private scene: Phaser.Scene;
    private groundPool: Phaser.GameObjects.Image[] = [];
    private objectPool: Phaser.GameObjects.Image[] = [];
    private poolCols = 0;
    private poolRows = 0;
    private poolOriginTx = Number.NaN;
    private poolOriginTy = Number.NaN;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    getObjects(): Phaser.GameObjects.GameObject[] {
        return [...this.groundPool, ...this.objectPool];
    }

    ensurePool(force: boolean): void {
        const camera = this.scene.cameras.main;
        const cols = Math.ceil(camera.width / (TILE_SIZE * camera.zoom)) + 4;
        const rows = Math.ceil(camera.height / (TILE_SIZE * camera.zoom)) + 4;

        if (!force && cols === this.poolCols && rows === this.poolRows) return;

        for (const img of this.groundPool) img.destroy();
        for (const img of this.objectPool) img.destroy();

        this.groundPool = [];
        this.objectPool = [];
        this.poolCols = cols;
        this.poolRows = rows;
        this.poolOriginTx = Number.NaN;
        this.poolOriginTy = Number.NaN;

        const total = cols * rows;
        for (let i = 0; i < total; i += 1) {
            this.groundPool.push(this.scene.add.image(0, 0, 'tiles', 0).setDepth(0));
            this.objectPool.push(this.scene.add.image(0, 0, 'tiles', 0).setDepth(2).setVisible(false));
        }
    }

    render(
        worldTime: number,
        structures: Map<string, StructureType>,
        farmProgress: Map<string, number>,
        resourceRespawnAt: Map<string, number>,
        plantedTrees: Map<string, number>,
        stoneHealth: Map<string, number>,
    ): void {
        this.ensurePool(false);

        const camera = this.scene.cameras.main;
        const originTx = worldToTile(camera.worldView.left) - 2;
        const originTy = worldToTile(camera.worldView.top) - 2;

        const moved = originTx !== this.poolOriginTx || originTy !== this.poolOriginTy;
        this.poolOriginTx = originTx;
        this.poolOriginTy = originTy;

        const cols = this.poolCols;
        const rows = this.poolRows;

        for (let row = 0; row < rows; row += 1) {
            for (let col = 0; col < cols; col += 1) {
                const tx = originTx + col;
                const ty = originTy + row;
                const index = row * cols + col;
                const groundImage = this.groundPool[index];
                const objectImage = this.objectPool[index];

                if (moved) {
                    const wx = tileToWorldCenter(tx);
                    const wy = tileToWorldCenter(ty);
                    groundImage.setPosition(wx, wy);
                    objectImage.setPosition(wx, wy);
                }

                let ground: GroundTile = getGroundAt(tx, ty);

                if (ground !== 'water') {
                    const nearWater =
                        getGroundAt(tx + 1, ty) === 'water' ||
                        getGroundAt(tx - 1, ty) === 'water' ||
                        getGroundAt(tx, ty + 1) === 'water' ||
                        getGroundAt(tx, ty - 1) === 'water';
                    if (nearWater) ground = 'sand';
                }

                groundImage.setFrame(GROUND_FRAME[ground]);
                groundImage.setTint(GROUND_TINT[ground]);

                const key = tileKey(tx, ty);
                const structure = structures.get(key);
                if (structure) {
                    const autotile = getAutotileDefinition(structure);
                    const growable = getGrowableDefinition(structure);
                    const progress = growable ? (farmProgress.get(key) ?? 0) : 0;
                    objectImage.setVisible(true);
                    objectImage.setFrame(
                        autotile
                            ? getAutotileFrameForTile(
                                tx,
                                ty,
                                structures,
                                autotile.group,
                                autotile.frameBase,
                                (kindId) => getAutotileDefinition(kindId)?.group ?? null,
                            )
                            : growable
                                ? getGrowableFrame(progress, growable.stages)
                                : getStructureRenderFrame(structure),
                    );
                    if (autotile) {
                        objectImage.clearTint();
                    } else if (growable) {
                        const tint = getGrowableTint(progress, growable.stages);
                        if (tint === null) objectImage.clearTint();
                        else objectImage.setTint(tint);
                    } else {
                        objectImage.setTint(OBJECT_TINT);
                    }
                    continue;
                }

                const plantedTreeAt = plantedTrees.get(key);
                if (plantedTreeAt !== undefined && plantedTreeAt > worldTime) {
                    objectImage.setVisible(true);
                    objectImage.setFrame(getSaplingFrameForTimeRemaining(plantedTreeAt - worldTime));
                    objectImage.clearTint();
                    continue;
                }

                const resource = getResourceAt(tx, ty, worldTime, resourceRespawnAt, structures, plantedTrees, stoneHealth);
                if (resource) {
                    const resourceDef = getResourceDefinition(resource);
                    const maxHits = resourceDef?.maxHits ?? 3;
                    objectImage.setVisible(true);
                    objectImage.setFrame(
                        resource === 'stone'
                            ? getStoneFrameForHitsLeft(stoneHealth.get(key) ?? maxHits)
                            : resourceDef?.frame ?? RESOURCE_FRAME[resource],
                    );
                    objectImage.setTint(OBJECT_TINT);
                } else {
                    objectImage.setVisible(false);
                    objectImage.clearTint();
                }
            }
        }
    }
}
