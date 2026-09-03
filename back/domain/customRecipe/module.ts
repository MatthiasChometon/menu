import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/module';
import { CustomFoodModule } from '../customFood/module';
import { CustomRecipeRepository } from './repository';
import { CustomRecipeResolver } from './resolver';

@Module({
  imports: [AuthModule, CustomFoodModule],
  providers: [CustomRecipeResolver, CustomRecipeRepository],
})
export class CustomRecipeModule {}
