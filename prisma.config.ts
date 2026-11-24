import 'dotenv/config';

export default {
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL || 'postgresql://liora_app:Admin@123@localhost:5432/liora_dev?schema=public',
  },
};


