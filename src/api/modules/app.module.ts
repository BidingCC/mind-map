import { Module } from "@nestjs/common";

import { ConfigModule } from "./config/config.module";
import { CreateModule } from "./create/create.module";
import { ExamplesModule } from "./examples/examples.module";
import { HomeModule } from "./home/home.module";
import { RecordModule } from "./record/record.module";
@Module({
    imports: [ExamplesModule, ConfigModule, HomeModule, RecordModule, CreateModule],
    exports: [ExamplesModule, ConfigModule, HomeModule, RecordModule, CreateModule],
})
export class AppModule {}
