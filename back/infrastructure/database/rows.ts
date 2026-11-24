// An insert ... returning always hands back the row it wrote; the array type
// cannot say so, so this is the one place that turns the absent case into a
// failure instead of an `undefined` flowing into the mapper.
export const insertedRow = <Row>(rows: Row[]): Row => {
  const [row] = rows;
  if (row === undefined) {
    throw new Error('The insert returned no row.');
  }

  return row;
};
