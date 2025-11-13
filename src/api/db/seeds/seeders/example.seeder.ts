import { BaseSeeder } from "@buildingai/db/seeds/seeders/base.seeder";
import { DataSource } from "@buildingai/db/typeorm";
import * as path from "path";

import { MindMapExample } from "../../entities/mind-map-example.entity";

/**
 * Mind map example seeder
 *
 * Initialize default mind map example configuration
 */
export class ExampleSeeder extends BaseSeeder {
    readonly name = "MindMapExampleSeeder";
    readonly priority = 102;

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
        const repository = dataSource.getRepository(MindMapExample);
        const count = await repository.count();

        // Only run if no example configuration exists
        return count === 0;
    }

    /**
     * Run seeder
     */
    async run(dataSource: DataSource): Promise<void> {
        const repository = dataSource.getRepository(MindMapExample);

        // Load default example configuration from data file
        const exampleDataList = await this.loadConfig<
            Array<{
                prologue: string;
                try: string[];
                dialogText: string;
                enabledTry: boolean;
                enabledDialog: boolean;
            }>
        >("mind-map-example.json");

        this.logInfo(
            `Preparing to insert ${exampleDataList.length} mind map example configuration`,
        );

        for (const exampleData of exampleDataList) {
            const example = repository.create({
                prologue: exampleData.prologue,
                try: exampleData.try,
                dialogText: exampleData.dialogText,
                enabledTry: exampleData.enabledTry,
                enabledDialog: exampleData.enabledDialog,
            });

            await repository.save(example);
            this.logInfo(`Inserted mind map example configuration`);
        }

        this.logSuccess(
            `Successfully inserted ${exampleDataList.length} mind map example configuration`,
        );
    }
}
