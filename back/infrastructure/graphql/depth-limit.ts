import { GraphQLError, Kind, type ASTNode, type ValidationRule } from 'graphql';

// The schema is flat today, but a validation rule is what keeps it safe as it
// grows: without one, a single nested query is enough to keep the process busy
// for as long as the attacker cares to type.
export const depthLimit =
  (maximum: number): ValidationRule =>
  (context) => ({
    OperationDefinition(operation): void {
      const depth = depthOf(operation);
      if (depth > maximum) {
        context.reportError(
          new GraphQLError(`Query is too deeply nested (${depth} levels, maximum ${maximum}).`, {
            nodes: [operation],
          }),
        );
      }
    },
  });

const depthOf = (node: ASTNode): number => {
  if (!('selectionSet' in node) || node.selectionSet === undefined) return 0;

  const children = node.selectionSet.selections.map((selection): number =>
    // A fragment spread cannot be followed from here without the document, so
    // it counts as one level; inline fragments are transparent, as in execution.
    selection.kind === Kind.FRAGMENT_SPREAD ? 1 : depthOf(selection),
  );

  return 1 + Math.max(0, ...children);
};
