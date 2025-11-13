import { BaseSeeder } from "@buildingai/db/seeds/seeders/base.seeder";
import { DataSource } from "@buildingai/db/typeorm";

/**
 * MindMap 初始化种子
 *
 * 创建 MindMap 插件所需的数据库表
 */
export class MindMapInitialSeeder extends BaseSeeder {
    readonly name = "MindMapInitialSeeder";
    readonly priority = 100;

    /**
     * 运行种子文件
     */
    async run(dataSource: DataSource): Promise<void> {
        const queryRunner = dataSource.createQueryRunner();

        try {
            await queryRunner.connect();
            await queryRunner.startTransaction();

            // 创建 mind_map_record 表
            await queryRunner.query(
                `CREATE TABLE IF NOT EXISTS "buildingai_mind_map"."mind_map_record" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" character varying NOT NULL, "user_name" character varying NOT NULL, "user_avatar" character varying, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "conversation_times" integer NOT NULL, "description" character varying NOT NULL, "mind_map_data" json, "power_used" integer NOT NULL, "ai_chat_record_id" uuid, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_44cb68101daa5c8d71756eac4d4" PRIMARY KEY ("id")); COMMENT ON COLUMN "buildingai_mind_map"."mind_map_record"."user_id" IS '用户ID'; COMMENT ON COLUMN "buildingai_mind_map"."mind_map_record"."user_name" IS '用户名称'; COMMENT ON COLUMN "buildingai_mind_map"."mind_map_record"."user_avatar" IS '用户头像'; COMMENT ON COLUMN "buildingai_mind_map"."mind_map_record"."created_at" IS '生成时间'; COMMENT ON COLUMN "buildingai_mind_map"."mind_map_record"."conversation_times" IS '对话次数'; COMMENT ON COLUMN "buildingai_mind_map"."mind_map_record"."description" IS '画板名称'; COMMENT ON COLUMN "buildingai_mind_map"."mind_map_record"."mind_map_data" IS '思维导图数据'; COMMENT ON COLUMN "buildingai_mind_map"."mind_map_record"."power_used" IS '消耗积分'; COMMENT ON COLUMN "buildingai_mind_map"."mind_map_record"."ai_chat_record_id" IS '关联的AI对话记录ID'; COMMENT ON COLUMN "buildingai_mind_map"."mind_map_record"."updated_at" IS '更新时间'`,
            );
            await queryRunner.query(
                `COMMENT ON TABLE "buildingai_mind_map"."mind_map_record" IS '思维导图生成记录'`,
            );
            this.logSuccess("创建 mind_map_record 表成功");

            // 创建 mind_map_home 表
            await queryRunner.query(
                `CREATE TABLE IF NOT EXISTS "buildingai_mind_map"."mind_map_home" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" text, "public_language" text, "description" text, "enabled_description" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_b1cc7621e12b3c59d29c6b82bc5" PRIMARY KEY ("id")); COMMENT ON COLUMN "buildingai_mind_map"."mind_map_home"."name" IS '插件显示名称'; COMMENT ON COLUMN "buildingai_mind_map"."mind_map_home"."public_language" IS '宣传语文案'; COMMENT ON COLUMN "buildingai_mind_map"."mind_map_home"."description" IS '宣传语副标题'; COMMENT ON COLUMN "buildingai_mind_map"."mind_map_home"."enabled_description" IS '是否启用副标题'; COMMENT ON COLUMN "buildingai_mind_map"."mind_map_home"."created_at" IS '创建时间'; COMMENT ON COLUMN "buildingai_mind_map"."mind_map_home"."updated_at" IS '更新时间'`,
            );
            await queryRunner.query(
                `COMMENT ON TABLE "buildingai_mind_map"."mind_map_home" IS '思维导图首页配置'`,
            );
            this.logSuccess("创建 mind_map_home 表成功");

            // 创建 mind_map_example 表
            await queryRunner.query(
                `CREATE TABLE IF NOT EXISTS "buildingai_mind_map"."mind_map_example" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "prologue" text, "try" json, "dialog_text" text, "enabled_try" boolean NOT NULL DEFAULT true, "enabled_dialog" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_cf559f1e673d0958fe4585354d1" PRIMARY KEY ("id")); COMMENT ON COLUMN "buildingai_mind_map"."mind_map_example"."prologue" IS '开场白'; COMMENT ON COLUMN "buildingai_mind_map"."mind_map_example"."try" IS '试一试'; COMMENT ON COLUMN "buildingai_mind_map"."mind_map_example"."dialog_text" IS '对话框文字'; COMMENT ON COLUMN "buildingai_mind_map"."mind_map_example"."enabled_try" IS '是否启用试一试'; COMMENT ON COLUMN "buildingai_mind_map"."mind_map_example"."enabled_dialog" IS '是否启用对话框文字'; COMMENT ON COLUMN "buildingai_mind_map"."mind_map_example"."created_at" IS '创建时间'; COMMENT ON COLUMN "buildingai_mind_map"."mind_map_example"."updated_at" IS '更新时间'`,
            );
            await queryRunner.query(
                `COMMENT ON TABLE "buildingai_mind_map"."mind_map_example" IS '思维导图示例配置'`,
            );
            this.logSuccess("创建 mind_map_example 表成功");

            // 创建 mind_map_config 表
            await queryRunner.query(
                `CREATE TABLE IF NOT EXISTS "buildingai_mind_map"."mind_map_config" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "bind_model" character varying(255) NOT NULL, "bind_model_id" character varying(255), "billing_type" integer NOT NULL, "billing_setting" integer NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_4e4cc24d28b6887b9d53c97fffe" PRIMARY KEY ("id")); COMMENT ON COLUMN "buildingai_mind_map"."mind_map_config"."bind_model" IS '绑定的模型'; COMMENT ON COLUMN "buildingai_mind_map"."mind_map_config"."bind_model_id" IS '绑定的模型ID'; COMMENT ON COLUMN "buildingai_mind_map"."mind_map_config"."billing_type" IS '计费类型'; COMMENT ON COLUMN "buildingai_mind_map"."mind_map_config"."billing_setting" IS '计费设置'; COMMENT ON COLUMN "buildingai_mind_map"."mind_map_config"."created_at" IS '创建时间'; COMMENT ON COLUMN "buildingai_mind_map"."mind_map_config"."updated_at" IS '更新时间'`,
            );
            await queryRunner.query(
                `COMMENT ON TABLE "buildingai_mind_map"."mind_map_config" IS '思维导图插件配置'`,
            );
            this.logSuccess("创建 mind_map_config 表成功");

            // 创建 mind_map_ai_chat_record 表
            await queryRunner.query(
                `CREATE TABLE IF NOT EXISTS "buildingai_mind_map"."mind_map_ai_chat_record" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying(200), "user_id" uuid NOT NULL, "mind_map_id" uuid, "model_id" uuid, "summary" text, "message_count" integer NOT NULL DEFAULT '0', "total_tokens" integer NOT NULL DEFAULT '0', "total_power" integer NOT NULL DEFAULT '0', "status" character varying(20) NOT NULL DEFAULT 'active', "is_deleted" boolean NOT NULL DEFAULT false, "metadata" jsonb, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_880dd62bd451f6ce445d942513c" PRIMARY KEY ("id")); COMMENT ON COLUMN "buildingai_mind_map"."mind_map_ai_chat_record"."title" IS '对话标题'; COMMENT ON COLUMN "buildingai_mind_map"."mind_map_ai_chat_record"."user_id" IS '用户ID'; COMMENT ON COLUMN "buildingai_mind_map"."mind_map_ai_chat_record"."mind_map_id" IS '关联的思维导图ID'; COMMENT ON COLUMN "buildingai_mind_map"."mind_map_ai_chat_record"."model_id" IS '使用的AI模型ID'; COMMENT ON COLUMN "buildingai_mind_map"."mind_map_ai_chat_record"."summary" IS '对话摘要'; COMMENT ON COLUMN "buildingai_mind_map"."mind_map_ai_chat_record"."message_count" IS '对话中的消息总数'; COMMENT ON COLUMN "buildingai_mind_map"."mind_map_ai_chat_record"."total_tokens" IS '本次对话消耗的总Token数'; COMMENT ON COLUMN "buildingai_mind_map"."mind_map_ai_chat_record"."total_power" IS '本次对话消耗的总Power数'; COMMENT ON COLUMN "buildingai_mind_map"."mind_map_ai_chat_record"."status" IS '对话状态: active-进行中, completed-已完成, failed-失败'; COMMENT ON COLUMN "buildingai_mind_map"."mind_map_ai_chat_record"."is_deleted" IS '是否已删除'; COMMENT ON COLUMN "buildingai_mind_map"."mind_map_ai_chat_record"."metadata" IS '扩展数据字段'; COMMENT ON COLUMN "buildingai_mind_map"."mind_map_ai_chat_record"."created_at" IS '创建时间'; COMMENT ON COLUMN "buildingai_mind_map"."mind_map_ai_chat_record"."updated_at" IS '更新时间'`,
            );
            await queryRunner.query(
                `CREATE INDEX IF NOT EXISTS "IDX_a3cb295b900910711de711135c" ON "buildingai_mind_map"."mind_map_ai_chat_record" ("user_id")`,
            );
            await queryRunner.query(
                `CREATE INDEX IF NOT EXISTS "IDX_e429915b27e33e280b24af8716" ON "buildingai_mind_map"."mind_map_ai_chat_record" ("mind_map_id")`,
            );
            await queryRunner.query(
                `CREATE INDEX IF NOT EXISTS "IDX_6586304d867c98960d49a839a8" ON "buildingai_mind_map"."mind_map_ai_chat_record" ("status")`,
            );
            await queryRunner.query(
                `CREATE INDEX IF NOT EXISTS "IDX_6e1304422af2a6e9c2c3ceae82" ON "buildingai_mind_map"."mind_map_ai_chat_record" ("is_deleted")`,
            );
            await queryRunner.query(
                `CREATE INDEX IF NOT EXISTS "IDX_6d03b8d42f16687e029ec3732f" ON "buildingai_mind_map"."mind_map_ai_chat_record" ("is_deleted", "created_at")`,
            );
            await queryRunner.query(
                `CREATE INDEX IF NOT EXISTS "IDX_42709b755153d5a0257f3edb01" ON "buildingai_mind_map"."mind_map_ai_chat_record" ("user_id", "created_at")`,
            );
            await queryRunner.query(
                `COMMENT ON TABLE "buildingai_mind_map"."mind_map_ai_chat_record" IS '思维导图AI对话记录'`,
            );
            this.logSuccess("创建 mind_map_ai_chat_record 表成功");

            // 创建 mind_map_ai_chat_message 表
            await queryRunner.query(
                `CREATE TABLE IF NOT EXISTS "buildingai_mind_map"."mind_map_ai_chat_message" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "conversation_id" uuid NOT NULL, "model_id" uuid, "role" character varying(20) NOT NULL, "content" text NOT NULL, "message_type" character varying(20) NOT NULL DEFAULT 'text', "tokens" jsonb, "user_consumed_power" integer, "status" character varying(20) NOT NULL DEFAULT 'completed', "error_message" text, "sequence" integer NOT NULL, "processing_time" integer, "raw_response" jsonb, "metadata" jsonb, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_5acc42af1bddd3c20519996068f" PRIMARY KEY ("id")); COMMENT ON COLUMN "buildingai_mind_map"."mind_map_ai_chat_message"."conversation_id" IS '所属对话ID'; COMMENT ON COLUMN "buildingai_mind_map"."mind_map_ai_chat_message"."model_id" IS '消息使用的AI模型ID'; COMMENT ON COLUMN "buildingai_mind_map"."mind_map_ai_chat_message"."role" IS '消息角色: user-用户, assistant-AI助手, system-系统'; COMMENT ON COLUMN "buildingai_mind_map"."mind_map_ai_chat_message"."content" IS '消息文本内容'; COMMENT ON COLUMN "buildingai_mind_map"."mind_map_ai_chat_message"."message_type" IS '消息类型: text-文本, image-图片, file-文件'; COMMENT ON COLUMN "buildingai_mind_map"."mind_map_ai_chat_message"."tokens" IS 'Token使用情况'; COMMENT ON COLUMN "buildingai_mind_map"."mind_map_ai_chat_message"."user_consumed_power" IS '用户算力消耗'; COMMENT ON COLUMN "buildingai_mind_map"."mind_map_ai_chat_message"."status" IS '消息状态: sending-发送中, completed-已完成, failed-失败'; COMMENT ON COLUMN "buildingai_mind_map"."mind_map_ai_chat_message"."error_message" IS '错误信息（当状态为failed时）'; COMMENT ON COLUMN "buildingai_mind_map"."mind_map_ai_chat_message"."sequence" IS '在对话中的消息序号'; COMMENT ON COLUMN "buildingai_mind_map"."mind_map_ai_chat_message"."processing_time" IS 'AI处理该消息的时长（毫秒）'; COMMENT ON COLUMN "buildingai_mind_map"."mind_map_ai_chat_message"."raw_response" IS '模型响应的原始数据'; COMMENT ON COLUMN "buildingai_mind_map"."mind_map_ai_chat_message"."metadata" IS '扩展数据字段'; COMMENT ON COLUMN "buildingai_mind_map"."mind_map_ai_chat_message"."created_at" IS '创建时间'; COMMENT ON COLUMN "buildingai_mind_map"."mind_map_ai_chat_message"."updated_at" IS '更新时间'`,
            );
            await queryRunner.query(
                `CREATE INDEX IF NOT EXISTS "IDX_9b9bc88c1cf6ab741f8bdb3c4b" ON "buildingai_mind_map"."mind_map_ai_chat_message" ("model_id")`,
            );
            await queryRunner.query(
                `CREATE INDEX IF NOT EXISTS "IDX_eb83d20cb7af92ed8e5af1bf24" ON "buildingai_mind_map"."mind_map_ai_chat_message" ("role")`,
            );
            await queryRunner.query(
                `CREATE INDEX IF NOT EXISTS "IDX_0370bf8484b89453d5b1cfef5f" ON "buildingai_mind_map"."mind_map_ai_chat_message" ("sequence")`,
            );
            await queryRunner.query(
                `CREATE INDEX IF NOT EXISTS "IDX_ab8f0c1269f2b68a7a45451514" ON "buildingai_mind_map"."mind_map_ai_chat_message" ("role", "created_at")`,
            );
            await queryRunner.query(
                `CREATE INDEX IF NOT EXISTS "IDX_6fed34ac3488555e4caf072122" ON "buildingai_mind_map"."mind_map_ai_chat_message" ("conversation_id", "created_at")`,
            );
            await queryRunner.query(
                `COMMENT ON TABLE "buildingai_mind_map"."mind_map_ai_chat_message" IS '思维导图AI对话消息记录'`,
            );
            this.logSuccess("创建 mind_map_ai_chat_message 表成功");

            // 添加外键约束
            await queryRunner.query(
                `ALTER TABLE "buildingai_mind_map"."mind_map_ai_chat_record" ADD CONSTRAINT IF NOT EXISTS "FK_a3cb295b900910711de711135c1" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
            );
            await queryRunner.query(
                `ALTER TABLE "buildingai_mind_map"."mind_map_ai_chat_record" ADD CONSTRAINT IF NOT EXISTS "FK_e429915b27e33e280b24af8716b" FOREIGN KEY ("mind_map_id") REFERENCES "buildingai_mind_map"."mind_map_record"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
            );
            await queryRunner.query(
                `ALTER TABLE "buildingai_mind_map"."mind_map_ai_chat_message" ADD CONSTRAINT IF NOT EXISTS "FK_1bede1bec65464b42a9e32bb2ee" FOREIGN KEY ("conversation_id") REFERENCES "buildingai_mind_map"."mind_map_ai_chat_record"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
            );
            await queryRunner.query(
                `ALTER TABLE "buildingai_mind_map"."mind_map_ai_chat_message" ADD CONSTRAINT IF NOT EXISTS "FK_9b9bc88c1cf6ab741f8bdb3c4be" FOREIGN KEY ("model_id") REFERENCES "ai_models"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
            );
            this.logSuccess("添加外键约束成功");

            await queryRunner.commitTransaction();
            this.logSuccess("所有表创建成功");
        } catch (error) {
            await queryRunner.rollbackTransaction();
            this.logError(`创建表失败: ${error.message}`);
            throw error;
        } finally {
            await queryRunner.release();
        }
    }
}
