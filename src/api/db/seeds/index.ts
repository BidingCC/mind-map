import { BaseSeeder } from "@buildingai/db/seeds/seeders/base.seeder";

import { ConfigSeeder } from "./seeders/config.seeder";
import { ExampleSeeder } from "./seeders/example.seeder";
import { HomeSeeder } from "./seeders/home.seeder";
import { MindMapInitialSeeder } from "./seeders/initial.seeder";

export default [MindMapInitialSeeder, HomeSeeder, ExampleSeeder, ConfigSeeder];

/**
 * Extension seed entry
 *
 * Must export getSeeders function to return all seeders
 */
export async function getSeeders(): Promise<BaseSeeder[]> {
    return [new MindMapInitialSeeder(), new HomeSeeder(), new ExampleSeeder(), new ConfigSeeder()];
}
