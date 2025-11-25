import { BaseSeeder } from "@buildingai/db";

import { ConfigSeeder } from "./seeders/config.seeder";
import { ExampleSeeder } from "./seeders/example.seeder";
import { HomeSeeder } from "./seeders/home.seeder";
import { InitialSeeder } from "./seeders/initial.seeder";

/**
 * Extension seed entry
 *
 * Must export getSeeders function to return all seeders
 */
export async function getSeeders(): Promise<BaseSeeder[]> {
    return [new InitialSeeder(), new HomeSeeder(), new ExampleSeeder(), new ConfigSeeder()];
}
