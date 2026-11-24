import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/module';
import { CustomFoodModule } from '../customFood/module';
import { CustomRecipeRepository } from './repository';
import { CustomRecipeResolver } from './resolver';
import { CustomRecipeService } from './service';

@Module({
  imports: [AuthModule, CustomFoodModule],
  providers: [CustomRecipeResolver, CustomRecipeService, CustomRecipeRepository],
})
export class CustomRecipeModule {}
