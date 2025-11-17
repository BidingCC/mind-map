import { TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import { User } from "@buildingai/db/entities/user.entity";
import { AiPublicModule } from "@buildingai/extension-sdk/modules/ai/ai-public.module";
import { ExtensionBillingModule } from "@buildingai/extension-sdk/modules/billing/extension-billing.module";
import { Module } from "@nestjs/common";

import { MindMapAiChatMessage } from "../../db/entities/mind-map-ai-chat-message.entity";
import { MindMapAiChatRecord } from "../../db/entities/mind-map-ai-chat-record.entity";
import { MindMapRecord } from "../../db/entities/mind-map-record.entity";
import { ConfigModule } from "../config/config.module";
import { AiChatRecordConsoleController } from "./controllers/console/ai-chat-record.controller";
import { AiChatMessageController } from "./controllers/web/ai-chat-message.controller";
import { AiChatRecordController } from "./controllers/web/ai-chat-record.controller";
import { CreateController } from "./controllers/web/create.controller";
import { CreateService } from "./services/create.service";

@Module({
    imports: [
        TypeOrmModule.forFeature([MindMapRecord, User, MindMapAiChatRecord, MindMapAiChatMessage]),
        ConfigModule,
        ExtensionBillingModule,
        AiPublicModule,
    ],
    controllers: [
        CreateController,
        AiChatMessageController,
        AiChatRecordController,
        AiChatRecordConsoleController,
    ],
    providers: [CreateService],
    exports: [CreateService],
})
export class CreateModule {}
