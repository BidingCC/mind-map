import { BaseSeeder } from "@buildingai/db/seeds/seeders/base.seeder";
import { DataSource } from "@buildingai/db/typeorm";
import * as path from "path";

import { MindMapHome } from "../../entities/mind-map-home.entity";

/**
 * Mind map home seeder
 *
 * Initialize default mind map home configuration
 */
export class HomeSeeder extends BaseSeeder {
    readonly name = "MindMapHomeSeeder";
    readonly priority = 100;

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
        const repository = dataSource.getRepository(MindMapHome);
        const count = await repository.count();

        // Only run if no home configuration exists
        return count === 0;
    }

    /**
     * Run seeder
     */
    async run(dataSource: DataSource): Promise<void> {
        const repository = dataSource.getRepository(MindMapHome);

        // Load default home configuration from data file
        const homeDataList = await this.loadConfig<
            Array<{
                name: string;
                publicLanguage: string;
                description: string;
                enabledDescription: boolean;
            }>
        >("mind-map-home.json");

        this.logInfo(`Preparing to insert ${homeDataList.length} mind map home configuration`);

        for (const homeData of homeDataList) {
            const home = repository.create({
                name: homeData.name,
                publicLanguage: homeData.publicLanguage,
                description: homeData.description,
                enabledDescription: homeData.enabledDescription,
            });

            await repository.save(home);
            this.logInfo(`Inserted mind map home configuration: ${home.name}`);
        }

        this.logSuccess(`Successfully inserted ${homeDataList.length} mind map home configuration`);
    }
}
