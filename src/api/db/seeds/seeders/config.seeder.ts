import { BaseSeeder } from "@buildingai/db";
import { DataSource } from "@buildingai/db/typeorm";
import * as path from "path";

import { MindMapConfig } from "../../entities/mind-map-config.entity";

/**
 * Mind map config seeder
 *
 * Initialize default mind map configuration
 */
export class ConfigSeeder extends BaseSeeder {
    readonly name = "MindMapConfigSeeder";
    readonly priority = 103;

    /**
     * Override getConfigPath to use extension-relative paths
     */
    protected getConfigPath(fileName: string): string {
        // In compiled extension: __dirname is build/db/seeds/seeders/
        // Data files are in build/db/seeds/data/
        return path.join(__dirname, "../data", fileName);
    }

    /**
     * Check if seeder should run
     */
    async shouldRun(dataSource: DataSource): Promise<boolean> {
        const repository = dataSource.getRepository(MindMapConfig);
        const count = await repository.count();

        // Only run if no configuration exists
        return count === 0;
    }

    /**
     * Run seeder
     */
    async run(dataSource: DataSource): Promise<void> {
        const repository = dataSource.getRepository(MindMapConfig);

        // Load default configuration from data file
        const configDataList = await this.loadConfig<
            Array<{
                bindModel: string;
                bindModelId: string;
                billingType: number;
                billingSetting: number;
            }>
        >("mind-map-config.json");

        this.logInfo(`Preparing to insert ${configDataList.length} mind map configuration`);

        for (const configData of configDataList) {
            const config = repository.create({
                bindModel: configData.bindModel,
                bindModelId: configData.bindModelId,
                billingType: configData.billingType,
                billingSetting: configData.billingSetting,
            });

            await repository.save(config);
            this.logInfo(`Inserted mind map configuration with model: ${config.bindModel}`);
        }

        this.logSuccess(`Successfully inserted ${configDataList.length} mind map configuration`);
    }
}
