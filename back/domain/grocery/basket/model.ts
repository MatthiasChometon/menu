import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType({ description: 'One thing a run is meant to put in the basket.' })
export class GroceryBasketLine {
  @Field({ description: 'The food of the menu this stands for.' })
  foodId!: string;

  @Field(() => Int, { description: 'Grams the menu calls for, before the cupboard is counted.' })
  grams!: number;

  @Field(() => Int, { description: 'Grams already at home, hence fewer units to buy.' })
  fromPantry!: number;

  @Field({
    nullable: true,
    description: 'Barcode the shop accepts. Absent while no product is known.',
  })
  ean?: string;

  @Field({ nullable: true })
  productName?: string;

  @Field(() => Int, { nullable: true, description: 'Usable content of one unit.' })
  unitSize?: number;

  @Field(() => Int, {
    nullable: true,
    description: 'How many to buy. Absent when the run still has to find the product itself.',
  })
  units?: number;
}
